import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ApprovalModel, ReminderModel, DebtModel, InventoryItemModel } from "../models/index.js";
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
    case "reminder":
      return "Marked done";
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
      // Execute the approved action for real, by kind.
      const payload = (approval.payload ?? {}) as Record<string, unknown>;
      if (approval.kind === "reminder") {
        // a reminder being approved means it's handled — mark it done
        const reminderId = payload.reminderId as string | undefined;
        if (reminderId) await ReminderModel.updateOne({ _id: reminderId, shopId: req.shopId! }, { status: "done", doneAt: new Date() });
      } else if (approval.kind === "overdue_debt") {
        // record that the reminder went out, so we don't nag again and the timeline is truthful
        const debtId = payload.debtId as string | undefined;
        if (debtId) await DebtModel.updateOne({ _id: debtId, shopId: req.shopId! }, { lastRemindedAt: new Date() });
      } else if (approval.kind === "low_stock") {
        // actually put the item on the restock list
        const itemId = payload.itemId as string | undefined;
        const suggested = typeof payload.suggested === "number" ? payload.suggested : undefined;
        if (itemId)
          await InventoryItemModel.updateOne(
            { _id: itemId, shopId: req.shopId! },
            { needsRestock: true, restockQty: suggested, restockAddedAt: new Date() }
          );
      }
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

/** GET /api/autopilot/restock — items the owner approved for reordering. */
router.get("/restock", requireAuth, async (req, res) => {
  try {
    const items = await InventoryItemModel.find({ shopId: req.shopId!, needsRestock: true }).sort({ restockAddedAt: -1 });
    res.json({
      items: items.map((i) => ({
        id: String(i._id),
        name: i.name,
        unit: i.unit ?? "",
        quantity: i.quantity,
        restockQty: i.restockQty ?? null,
        supplier: i.supplier?.name ?? null,
        addedAt: i.restockAddedAt ?? null,
      })),
    });
  } catch (err) {
    console.error("restock list error:", err);
    res.status(500).json({ error: "Failed to load restock list" });
  }
});

/** POST /api/autopilot/restock/:itemId/done — clear an item once it's reordered. */
router.post("/restock/:itemId/done", requireAuth, async (req, res) => {
  try {
    const r = await InventoryItemModel.updateOne(
      { _id: req.params.itemId, shopId: req.shopId! },
      { needsRestock: false, restockQty: undefined, restockAddedAt: undefined }
    );
    if (r.matchedCount === 0) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("restock done error:", err);
    res.status(500).json({ error: "Failed to update restock item" });
  }
});

/** GET /api/autopilot/timeline — recent autopilot activity (any status), newest first. */
router.get("/timeline", requireAuth, async (req, res) => {
  try {
    const items = await ApprovalModel.find({ shopId: req.shopId! }).sort({ createdAt: -1 }).limit(25);
    res.json({ items });
  } catch (err) {
    console.error("timeline error:", err);
    res.status(500).json({ error: "Failed to load timeline" });
  }
});

export default router;
