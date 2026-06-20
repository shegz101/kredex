import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ApprovalModel } from "../models/index.js";
import { scanShop } from "../services/autopilot.js";

const router = Router();

/** GET /api/autopilot/approvals — pending checkpoints + recent resolved ones. */
router.get("/approvals", requireAuth, async (req, res) => {
  try {
    const shopId = req.shopId!;
    const [pending, recent] = await Promise.all([
      ApprovalModel.find({ shopId, status: "pending" }).sort({ createdAt: -1 }),
      ApprovalModel.find({ shopId, status: { $ne: "pending" } }).sort({ resolvedAt: -1 }).limit(8),
    ]);
    res.json({ pending, recent });
  } catch (err) {
    console.error("approvals list error:", err);
    res.status(500).json({ error: "Failed to load approvals" });
  }
});

/** GET /api/autopilot/notifications — recent alerts for the bell drawer + unread count. */
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const shopId = req.shopId!;
    const [items, unread] = await Promise.all([
      ApprovalModel.find({ shopId }).sort({ createdAt: -1 }).limit(30),
      ApprovalModel.countDocuments({ shopId, readAt: null }),
    ]);
    res.json({ items, unread });
  } catch (err) {
    console.error("notifications error:", err);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

/** POST /api/autopilot/notifications/read — mark one (body {id}) or all (no id) as read. */
router.post("/notifications/read", requireAuth, async (req, res) => {
  try {
    const shopId = req.shopId!;
    const id = (req.body as { id?: string })?.id;
    if (id) await ApprovalModel.updateOne({ _id: id, shopId, readAt: null }, { readAt: new Date() });
    else await ApprovalModel.updateMany({ shopId, readAt: null }, { readAt: new Date() });
    const unread = await ApprovalModel.countDocuments({ shopId, readAt: null });
    res.json({ unread });
  } catch (err) {
    console.error("mark read error:", err);
    res.status(500).json({ error: "Failed to mark read" });
  }
});

/** POST /api/autopilot/scan — run all scanners for this shop right now. */
router.post("/scan", requireAuth, async (req, res) => {
  try {
    const created = await scanShop(req.shopId!);
    const pendingCount = await ApprovalModel.countDocuments({ shopId: req.shopId!, status: "pending" });
    res.json({ created, pendingCount });
  } catch (err) {
    console.error("scan error:", err);
    res.status(500).json({ error: "Scan failed" });
  }
});

function resultFor(kind: string, payload: Record<string, unknown>): string {
  switch (kind) {
    case "overdue_debt":
      return `Reminder sent to ${payload.customerName ?? "customer"} on WhatsApp`;
    case "low_stock":
      return `${payload.itemName ?? "Item"} added to your restock list`;
    default:
      return "Reviewed";
  }
}

/** POST /api/autopilot/approvals/:id/approve */
router.post("/approvals/:id/approve", requireAuth, async (req, res) => {
  try {
    const approval = await ApprovalModel.findOne({ _id: req.params.id, shopId: req.shopId! });
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    if (approval.status === "pending") {
      approval.status = "approved";
      approval.resolvedAt = new Date();
      approval.result = resultFor(approval.kind, (approval.payload ?? {}) as Record<string, unknown>);
      await approval.save();
    }
    res.json({ approval });
  } catch (err) {
    console.error("approve error:", err);
    res.status(500).json({ error: "Failed to approve" });
  }
});

/** POST /api/autopilot/approvals/:id/dismiss */
router.post("/approvals/:id/dismiss", requireAuth, async (req, res) => {
  try {
    const approval = await ApprovalModel.findOne({ _id: req.params.id, shopId: req.shopId! });
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    if (approval.status === "pending") {
      approval.status = "dismissed";
      approval.resolvedAt = new Date();
      approval.result = "Dismissed";
      await approval.save();
    }
    res.json({ approval });
  } catch (err) {
    console.error("dismiss error:", err);
    res.status(500).json({ error: "Failed to dismiss" });
  }
});

export default router;
