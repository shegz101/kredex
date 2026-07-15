import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { runAgent } from "../agents/orchestrator.js";
import { ChatMessageModel, ChatSessionModel } from "../models/index.js";
import { rememberFromTurn } from "../services/memory.js";
import { rememberFactsFromTurn } from "../services/facts.js";

const router = Router();

const chatSchema = z.object({ message: z.string().min(1), sessionId: z.string().optional() });

/** Short title from the first user message: "I bought 20 bags of rice…" → trimmed. */
function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 40 ? t.slice(0, 40).trimEnd() + "…" : t;
}

/**
 * One-time backfill: older messages predate sessions and have no sessionId.
 * Group them all into a single "Earlier chat" thread so history isn't lost.
 * Idempotent — after it runs there are no session-less messages left to match.
 */
async function migrateLegacy(shopId: string): Promise<void> {
  const orphan = await ChatMessageModel.findOne({ shopId, sessionId: null }).sort({ createdAt: -1 });
  if (!orphan) return;
  const session = await ChatSessionModel.create({
    shopId,
    title: "Earlier chat",
    lastMessageAt: (orphan as any).createdAt ?? new Date(),
  });
  await ChatMessageModel.updateMany({ shopId, sessionId: null }, { $set: { sessionId: session._id } });
}

/** GET /api/chat/sessions — the shop's chat threads, newest first. */
router.get("/sessions", requireAuth, async (req, res) => {
  try {
    await migrateLegacy(req.shopId!);
    const sessions = await ChatSessionModel.find({ shopId: req.shopId! }).sort({ lastMessageAt: -1 }).limit(100);
    res.json({
      sessions: sessions.map((s) => ({
        id: String(s._id),
        title: s.title,
        lastMessageAt: s.lastMessageAt,
      })),
    });
  } catch (err) {
    console.error("sessions list error:", err);
    res.status(500).json({ error: "Failed to load chats" });
  }
});

/** POST /api/chat/sessions — start a fresh chat thread. */
router.post("/sessions", requireAuth, async (req, res) => {
  try {
    const s = await ChatSessionModel.create({ shopId: req.shopId! });
    res.json({ id: String(s._id), title: s.title, lastMessageAt: s.lastMessageAt });
  } catch (err) {
    console.error("session create error:", err);
    res.status(500).json({ error: "Failed to start a chat" });
  }
});

/** DELETE /api/chat/sessions/:id — remove a thread and its messages. */
router.delete("/sessions/:id", requireAuth, async (req, res) => {
  try {
    await ChatMessageModel.deleteMany({ shopId: req.shopId!, sessionId: req.params.id });
    await ChatSessionModel.deleteOne({ _id: req.params.id, shopId: req.shopId! });
    res.json({ ok: true });
  } catch (err) {
    console.error("session delete error:", err);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

/**
 * GET /api/chat/history?sessionId=… — one thread's messages, oldest first.
 * With no sessionId we return the most recent thread (so the page opens where
 * the owner left off). Returns the resolved sessionId so the client can track it.
 */
router.get("/history", requireAuth, async (req, res) => {
  try {
    await migrateLegacy(req.shopId!);
    let sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
    if (!sessionId) {
      const latest = await ChatSessionModel.findOne({ shopId: req.shopId! }).sort({ lastMessageAt: -1 });
      sessionId = latest ? String(latest._id) : undefined;
    }
    if (!sessionId) {
      res.json({ sessionId: null, messages: [] });
      return;
    }
    const msgs = await ChatMessageModel.find({ shopId: req.shopId!, sessionId }).sort({ createdAt: 1 }).limit(200);
    res.json({
      sessionId,
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

const msgSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1),
  receipt: z.any().optional(),
  sessionId: z.string().optional(),
});

/** POST /api/chat/message — persist a single chat line (used by non-SSE flows like receipt scan). */
router.post("/message", requireAuth, async (req, res) => {
  try {
    const parsed = msgSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid message" });
      return;
    }
    const session = await resolveSession(req.shopId!, parsed.data.sessionId);
    const doc = await ChatMessageModel.create({
      shopId: req.shopId!,
      sessionId: session._id,
      role: parsed.data.role,
      text: parsed.data.text,
      receipt: parsed.data.receipt,
    });
    await touchSession(session, parsed.data.role === "user" ? parsed.data.text : undefined);
    res.json({ ok: true, id: String(doc._id), sessionId: String(session._id) });
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

/** Find the given session (if valid) or create a fresh one for this shop. */
async function resolveSession(shopId: string, sessionId?: string) {
  if (sessionId) {
    const s = await ChatSessionModel.findOne({ _id: sessionId, shopId });
    if (s) return s;
  }
  return ChatSessionModel.create({ shopId });
}

/** Bump lastMessageAt and, if still untitled, name the thread from its first line. */
async function touchSession(session: any, firstUserText?: string): Promise<void> {
  const update: Record<string, unknown> = { lastMessageAt: new Date() };
  if (firstUserText && (!session.title || session.title === "New chat")) {
    update.title = titleFrom(firstUserText);
  }
  await ChatSessionModel.updateOne({ _id: session._id }, { $set: update });
}

/**
 * POST /api/chat  (protected) — streams the assistant's response over SSE and
 * persists both the user message and the final reply into the given session.
 */
router.post("/", requireAuth, async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A non-empty 'message' is required" });
    return;
  }
  const shopId = req.shopId!;
  const message = parsed.data.message;
  const session = await resolveSession(shopId, parsed.data.sessionId);

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (type: string, payload: Record<string, unknown> = {}) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };
  // tell the client which session this belongs to (it may have been freshly created)
  send("session", { sessionId: String(session._id) });

  try {
    // short-term memory: replay the last few turns OF THIS THREAD back to the model.
    // (Long-term memory is shop-wide and handled separately inside runAgent.)
    const recent = await ChatMessageModel.find({ shopId, sessionId: session._id }).sort({ createdAt: -1 }).limit(8);
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
    await ChatMessageModel.create({ shopId, sessionId: session._id, role: "user", text: message });
    await ChatMessageModel.create({
      shopId,
      sessionId: session._id,
      role: "assistant",
      text: reply,
      intent,
      actions: actions.map((a) => ({ name: a.name, result: a.result })),
    });
    await touchSession(session, message);

    // MemoryAgent: distil this turn into BOTH tiers of long-term memory —
    //   Tier 1: structured, overwriteable facts (prices/terms) via the canonical trie
    //   Tier 2: fuzzy, narrative memories via embeddings
    // Both are shop-scoped, so they persist and update across every chat session.
    void rememberFactsFromTurn(shopId, message, reply);
    void rememberFromTurn(shopId, message, reply);

    send("done", { reply, actions });
  } catch (err) {
    console.error("chat error:", err);
    // Graceful degradation: the agent call failed even after the Qwen client's
    // automatic retries. Tell the owner plainly and invite a retry — nothing is lost.
    send("error", {
      error: "I couldn't reach my AI service just now. Please try that again in a moment — your data is safe.",
    });
  } finally {
    res.end();
  }
});

export default router;
