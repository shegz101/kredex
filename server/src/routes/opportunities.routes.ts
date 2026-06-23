import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { ShopModel } from "../models/index.js";
import { qwen, MODELS } from "../lib/qwen.js";

const router = Router();

function extractJson(text: string): any {
  const fenced = text.replace(/```json\s*|```/g, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json");
  return JSON.parse(fenced.slice(start, end + 1));
}

const bodySchema = z.object({
  categories: z.array(z.string()).optional(),
  query: z.string().optional(),
});

/**
 * POST /api/opportunities  (protected)
 * Kredex's Opportunity Scout — uses Qwen's knowledge to surface loans, grants,
 * empowerment programs and events relevant to the shop's location + sector.
 * Results are AI-suggested; the UI tells the owner to verify with the source.
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const shop = await ShopModel.findById(req.shopId!);
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    if (!shop.location) {
      res.status(400).json({ error: "Add your location in Settings first.", needsLocation: true });
      return;
    }

    const parsed = bodySchema.safeParse(req.body ?? {});
    const categories = (parsed.success && parsed.data.categories) || [];
    const query = parsed.success ? parsed.data.query : undefined;
    const want = categories.length
      ? categories.join(", ")
      : "loans, grants, empowerment/training programs, events and competitions";

    const prompt = `Use web search to find current opportunities for an SME. The business is a "${shop.type || "small business"}" located in ${shop.location}.
Search the live web and list up to 8 real, currently-open ${want} this owner could realistically pursue. Favour programs that fit their country/region and business size.
${query ? `Focus especially on: ${query}.` : ""}
Return ONLY JSON in exactly this shape:
{"opportunities":[{"title":string,"type":"loan"|"grant"|"program"|"event"|"competition","organization":string,"summary":string,"eligibility":string,"amount":string,"deadline":string,"howToApply":string,"locationFit":string,"sourceUrl":string}]}
Rules:
- "sourceUrl": the REAL official application/info page URL you found via search. Only include URLs you actually found; omit the field if you don't have a real one.
- "amount": e.g. "Up to ₦5,000,000" or "Varies".
- "deadline": use what the source says (e.g. "Applications close 30 Sep 2026") or "Rolling"/"Check site". Don't fabricate dates.
- Prefer results from official organisation sites. Be concrete and accurate.`;

    const completion = await qwen.chat.completions.create({
      model: MODELS.brain,
      temperature: 0.4,
      enable_search: true,
      search_options: { forced_search: true, search_strategy: "max" },
      messages: [
        { role: "system", content: "You are a precise, honest SME funding and opportunity scout with live web access. Search the web, then output strict JSON with real source URLs, no commentary." },
        { role: "user", content: prompt },
      ],
    } as any);

    const raw = completion.choices[0]?.message?.content?.toString() ?? "";
    let data: any;
    try {
      data = extractJson(raw);
    } catch {
      res.status(502).json({ error: "Couldn't fetch opportunities just now — try again." });
      return;
    }
    const opportunities = Array.isArray(data.opportunities) ? data.opportunities.slice(0, 12) : [];
    res.json({ location: shop.location, opportunities });
  } catch (err) {
    console.error("opportunities error:", err);
    res.status(500).json({ error: "Failed to find opportunities" });
  }
});

export default router;
