import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { runAgent } from "../agents/orchestrator.js";
import { ChatMessageModel } from "../models/index.js";
import { remember } from "../services/memory.js";

const router = Router();

const chatSchema = z.object({ message: z.string().min(1) });

/** GET /api/chat/history — the shop's saved conversation, oldest first. */
router.get("/history", requireAuth, async (req, res) => {
  try {
    const msgs = await ChatMessageModel.find({ shopId: req.shopId! }).sort({ createdAt: 1 }).limit(200);
    res.json({
      messages: msgs.map((m) => ({
        id: String(m._id),
        role: m.role,
        text: m.text,
        intent: m.intent,
        actions: m.actions ?? [],
        receipt: (m as any).receipt ?? null,
      })),
    });
  } catch (err) {
    console.error("history error:", err);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

const msgSchema = z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1), receipt: z.any().optional() });

/** POST /api/chat/message — persist a single chat line (used by non-SSE flows like receipt scan). */
router.post("/message", requireAuth, async (req, res) => {
  try {
    const parsed = msgSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid message" });
      return;
    }
    const doc = await ChatMessageModel.create({
      shopId: req.shopId!,
      role: parsed.data.role,
      text: parsed.data.text,
      receipt: parsed.data.receipt,
    });
    res.json({ ok: true, id: String(doc._id) });
  } catch (err) {
    console.error("save message error:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

/** PATCH /api/chat/message/:id/receipt-committed — mark a saved receipt as logged. */
router.patch("/message/:id/receipt-committed", requireAuth, async (req, res) => {
  try {
    await ChatMessageModel.updateOne(
      { _id: req.params.id, shopId: req.shopId! },
      { $set: { "receipt.committed": true } }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("receipt-committed error:", err);
    res.status(500).json({ error: "Failed to update" });
  }
});

/**
 * POST /api/chat  (protected) — streams the assistant's response over SSE and
 * persists both the user message and the final reply.
 */
router.post("/", requireAuth, async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A non-empty 'message' is required" });
    return;
  }
  const shopId = req.shopId!;
  const message = parsed.data.message;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (type: string, payload: Record<string, unknown> = {}) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  try {
    // short-term memory: replay the last few turns back to the model
    const recent = await ChatMessageModel.find({ shopId }).sort({ createdAt: -1 }).limit(8);
    const history = recent
      .reverse()
      .filter((m) => m.text)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.text }));

    let intent: string | undefined;
    const { reply, actions } = await runAgent({
      message,
      shopId,
      history,
      onIntent: (i) => {
        intent = i;
        send("intent", { intent: i });
      },
      onAction: (action) => send("action", { name: action.name, result: action.result }),
      onToken: (token) => send("token", { value: token }),
    });

    // persist the exchange (user first, then assistant)
    await ChatMessageModel.create({ shopId, role: "user", text: message });
    await ChatMessageModel.create({
      shopId,
      role: "assistant",
      text: reply,
      intent,
      actions: actions.map((a) => ({ name: a.name, result: a.result })),
    });

    // MemoryAgent: durably remember what the owner said (embedded for recall)
    void remember(shopId, message, "chat");

    send("done", { reply, actions });
  } catch (err) {
    console.error("chat error:", err);
    send("error", { error: "Something went wrong handling your message." });
  } finally {
    res.end();
  }
});

export default router;
