import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { ApprovalModel, ShopModel, AutopilotRunModel, InventoryItemModel } from "../models/index.js";
import { executeApproval, runAutopilotForShop, AUTOPILOT_DEFAULTS } from "../services/autopilot.js";

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
/** POST /api/autopilot/scan — run one full autonomous pass for this shop now. */
router.post("/scan", requireAuth, async (req, res) => {
  try {
    await runAutopilotForShop(req.shopId!, "manual");
    const [pendingCount, run] = await Promise.all([
      ApprovalModel.countDocuments({ shopId: req.shopId!, status: "pending" }),
      AutopilotRunModel.findOne({ shopId: req.shopId! }).sort({ createdAt: -1 }),
    ]);
    res.json({ pendingCount, run });
  } catch (err) {
    console.error("scan error:", err);
    res.status(500).json({ error: "Scan failed" });
  }
});

/** POST /api/autopilot/approvals/:id/approve */
router.post("/approvals/:id/approve", requireAuth, async (req, res) => {
  try {
    const approval = await ApprovalModel.findOne({ _id: req.params.id, shopId: req.shopId! });
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    await executeApproval(approval, req.shopId!);
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

/** GET /api/autopilot/settings — this shop's autonomy settings + next run. */
router.get("/settings", requireAuth, async (req, res) => {
  try {
    const shop = await ShopModel.findById(req.shopId!).select("autopilot");
    const ap = (shop?.autopilot as any) ?? {};
    res.json({
      settings: {
        enabled: ap.enabled ?? AUTOPILOT_DEFAULTS.enabled,
        intervalHours: ap.intervalHours ?? AUTOPILOT_DEFAULTS.intervalHours,
        autonomy: ap.autonomy ?? AUTOPILOT_DEFAULTS.autonomy,
        lastRunAt: ap.lastRunAt ?? null,
        nextRunAt: ap.nextRunAt ?? null,
      },
    });
  } catch (err) {
    console.error("autopilot settings get error:", err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  intervalHours: z.number().int().min(1).max(24).optional(),
  autonomy: z.enum(["suggest", "auto_safe", "full_auto"]).optional(),
});

/** PUT /api/autopilot/settings — update autonomy + cadence. */
router.put("/settings", requireAuth, async (req, res) => {
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid settings" });
      return;
    }
    const shop = await ShopModel.findById(req.shopId!);
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    const ap: any = shop.autopilot ?? {};
    if (parsed.data.enabled !== undefined) ap.enabled = parsed.data.enabled;
    if (parsed.data.intervalHours !== undefined) ap.intervalHours = parsed.data.intervalHours;
    if (parsed.data.autonomy !== undefined) ap.autonomy = parsed.data.autonomy;
    // re-schedule from now so the change takes effect on the chosen cadence
    ap.nextRunAt = new Date(Date.now() + (ap.intervalHours ?? AUTOPILOT_DEFAULTS.intervalHours) * 3_600_000);
    shop.autopilot = ap;
    await shop.save();
    res.json({
      settings: {
        enabled: ap.enabled,
        intervalHours: ap.intervalHours,
        autonomy: ap.autonomy,
        lastRunAt: ap.lastRunAt ?? null,
        nextRunAt: ap.nextRunAt ?? null,
      },
    });
  } catch (err) {
    console.error("autopilot settings put error:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

/** GET /api/autopilot/runs — recent autonomous runs (the "it worked" timeline). */
router.get("/runs", requireAuth, async (req, res) => {
  try {
    const runs = await AutopilotRunModel.find({ shopId: req.shopId! }).sort({ createdAt: -1 }).limit(20);
    res.json({ runs });
  } catch (err) {
    console.error("autopilot runs error:", err);
    res.status(500).json({ error: "Failed to load runs" });
  }
});

export default router;
