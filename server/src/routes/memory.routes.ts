import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listMemories, memoryStats, forgetOne, recallDetailed } from "../services/memory.js";

const router = Router();

/** GET /api/memory — everything the agent remembers about this shop (+ stats). */
router.get("/", requireAuth, async (req, res) => {
  try {
    const [memories, stats] = await Promise.all([listMemories(req.shopId!), memoryStats(req.shopId!)]);
    res.json({ memories, stats });
  } catch (err) {
    console.error("memory list error:", err);
    res.status(500).json({ error: "Failed to load memory" });
  }
});

/** GET /api/memory/recall?q=... — preview what a query would recall (the "why"). */
router.get("/recall", requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      res.json({ recalled: [] });
      return;
    }
    const recalled = await recallDetailed(req.shopId!, q, 6);
    res.json({ recalled });
  } catch (err) {
    console.error("memory recall error:", err);
    res.status(500).json({ error: "Failed to recall" });
  }
});

/** POST /api/memory/:id/forget — manually forget a memory (soft delete). */
router.post("/:id/forget", requireAuth, async (req, res) => {
  try {
    const ok = await forgetOne(req.shopId!, req.params.id);
    if (!ok) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("memory forget error:", err);
    res.status(500).json({ error: "Failed to forget" });
  }
});

export default router;
