import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { qwen, MODELS } from "../lib/qwen.js";
import { executeTool } from "../agents/tools.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

const PROMPT = `You are a receipt parser for a small African shop. Read this supplier receipt/invoice image and extract the purchased items.
Return ONLY a JSON object, no commentary, in exactly this shape:
{"supplier": string | null, "items": [{"name": string, "quantity": number, "unitPrice": number}], "total": number | null}
- unitPrice is the cost PER UNIT in naira (divide line total by quantity if needed).
- Use clean item names (e.g. "Rice", "Groundnut oil").
- If a value is unreadable, make your best estimate. If there are no items, return an empty items array.`;

/** Pull the JSON object out of a model reply (handles ```json fences / stray text). */
function extractJson(text: string): unknown {
  const fenced = text.replace(/```json\s*|\s*```/g, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found");
  return JSON.parse(fenced.slice(start, end + 1));
}

/**
 * POST /api/receipt  (protected, multipart "image")
 * Sends the photo to a Qwen vision model and returns a structured DRAFT for the
 * owner to confirm — we never auto-commit a guess to their books.
 */
router.post("/", requireAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Upload an image as 'image'" });
      return;
    }
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const completion = await qwen.chat.completions.create({
      model: MODELS.vision,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const text = Array.isArray(raw) ? raw.map((p: any) => p.text ?? "").join("") : raw;

    let parsed: any;
    try {
      parsed = extractJson(text);
    } catch {
      res.status(422).json({ error: "Couldn't read that receipt. Try a clearer photo." });
      return;
    }

    const items = Array.isArray(parsed.items)
      ? parsed.items
          .filter((i: any) => i && i.name)
          .map((i: any) => ({
            name: String(i.name),
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0,
          }))
      : [];

    res.json({ supplier: parsed.supplier ?? null, items, total: parsed.total ?? null });
  } catch (err) {
    console.error("receipt parse error:", err);
    res.status(500).json({ error: "Failed to read the receipt" });
  }
});

const commitSchema = z.object({
  supplier: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number(),
        unitPrice: z.number(),
      })
    )
    .min(1),
});

/**
 * POST /api/receipt/commit  (protected)
 * Logs the confirmed items to stock by reusing the same log_stock tool the chat
 * agent uses — so a restock from a photo lands in inventory + the ledger exactly
 * like a typed one.
 */
router.post("/commit", requireAuth, async (req, res) => {
  try {
    const parsed = commitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid items" });
      return;
    }
    const { supplier, items } = parsed.data;
    const results = [];
    for (const item of items) {
      const result = await executeTool(
        "log_stock",
        { itemName: item.name, quantity: item.quantity, costPrice: item.unitPrice, supplierName: supplier ?? undefined },
        { shopId: req.shopId! }
      );
      results.push(result);
    }
    res.json({ ok: true, logged: items.length, results });
  } catch (err) {
    console.error("receipt commit error:", err);
    res.status(500).json({ error: "Failed to log items" });
  }
});

export default router;
