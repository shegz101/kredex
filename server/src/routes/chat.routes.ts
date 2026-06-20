import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { runAgent } from "../agents/orchestrator.js";

const router = Router();

const chatSchema = z.object({ message: z.string().min(1) });

/**
 * POST /api/chat  (protected)
 * Streams the assistant's response using Server-Sent Events (SSE). Each line is
 *   data: {"type": "...", ...}\n\n
 * Event types:
 *   intent  – the local classifier's guess (instant)
 *   action  – a tool that ran (so the UI can show a result card)
 *   token   – a chunk of the streamed reply text
 *   done    – the full reply + all actions
 *   error   – something failed
 */
router.post("/", requireAuth, async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A non-empty 'message' is required" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable proxy buffering (nginx)
  res.flushHeaders?.();

  const send = (type: string, payload: Record<string, unknown> = {}) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  try {
    const { reply, actions } = await runAgent({
      message: parsed.data.message,
      shopId: req.shopId!,
      onIntent: (intent) => send("intent", { intent }),
      onAction: (action) => send("action", { name: action.name, result: action.result }),
      onToken: (token) => send("token", { value: token }),
    });

    send("done", { reply, actions });
  } catch (err) {
    console.error("chat error:", err);
    send("error", { error: "Something went wrong handling your message." });
  } finally {
    res.end();
  }
});

export default router;
