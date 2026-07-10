import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ShopModel, ReminderModel, InventoryItemModel, DebtModel } from "../models/index.js";
import { isLow } from "../lib/stock.js";
import { fmtMoney } from "../lib/money.js";

const router = Router();

/**
 * GET /api/notifications  (protected)
 *
 * Live, derived alerts — nothing autonomous. We simply surface, in one place,
 * the things the owner would otherwise have to go looking for:
 *   • reminders that have fallen due (or are about to)
 *   • stock that has dropped to/below its reorder level
 *   • credit (debt) payments whose due date has arrived or passed
 *
 * There is no notifications collection: each alert is recomputed from the
 * shop's real data on every request, with a stable id so the client can track
 * which it has already seen (unread badge lives in the browser).
 */

type Severity = "danger" | "warning" | "info";

interface Notification {
  id: string;
  type: "reminder" | "low_stock" | "debt_due";
  title: string;
  body: string;
  severity: Severity;
  at: string; // ISO — the due date (or when it went low)
  href: string;
}

const DAY = 86_400_000;

function balanceOf(debt: { amount: number; payments: { amount: number }[] }): number {
  return debt.amount - debt.payments.reduce((s, p) => s + p.amount, 0);
}

/** Human phrase + severity from "days until due" (negative = overdue). */
function duePhrase(diffDays: number): { text: string; severity: Severity } {
  if (diffDays < 0) {
    const n = -diffDays;
    return { text: `${n} day${n === 1 ? "" : "s"} overdue`, severity: "danger" };
  }
  if (diffDays === 0) return { text: "due today", severity: "warning" };
  if (diffDays === 1) return { text: "due tomorrow", severity: "info" };
  return { text: `due in ${diffDays} days`, severity: "info" };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const shopId = req.shopId!;
    const shop = await ShopModel.findById(shopId);
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }

    const now = new Date();
    // look at anything already due plus a short 2-day heads-up window
    const horizon = new Date(now);
    horizon.setDate(now.getDate() + 2);
    horizon.setHours(23, 59, 59, 999);

    const lowDefault = shop.lowStockThreshold ?? 5;
    const currency = shop.currency ?? "NGN";

    const [reminders, items, debts] = await Promise.all([
      ReminderModel.find({ shopId, status: "pending", dueAt: { $lte: horizon } }).sort({ dueAt: 1 }).limit(30),
      InventoryItemModel.find({ shopId }),
      DebtModel.find({ shopId, status: { $ne: "paid" }, dueDate: { $ne: null, $lte: horizon } })
        .populate("customerId", "name")
        .sort({ dueDate: 1 }),
    ]);

    const out: Notification[] = [];

    // --- reminders that are due / about to be due ---
    for (const r of reminders) {
      const diff = Math.round((r.dueAt.getTime() - now.getTime()) / DAY);
      const { text, severity } = duePhrase(diff);
      out.push({
        id: `reminder:${r._id}`,
        type: "reminder",
        title: diff < 0 ? "Reminder overdue" : "Reminder due",
        body: `${r.text} — ${text}`,
        severity,
        at: r.dueAt.toISOString(),
        href: "/dashboard/reminders",
      });
    }

    // --- stock at/below its reorder level ---
    for (const it of items) {
      if (!isLow(it, lowDefault)) continue;
      const qty = `${it.quantity}${it.unit ? " " + it.unit : ""}`;
      out.push({
        id: `low_stock:${it._id}`,
        type: "low_stock",
        title: it.quantity <= 0 ? "Out of stock" : "Low stock",
        body: it.quantity <= 0 ? `${it.name} is out of stock` : `${it.name} is down to ${qty}`,
        severity: it.quantity <= 0 ? "danger" : "warning",
        at: ((it as any).updatedAt ?? now).toISOString(),
        href: "/dashboard",
      });
    }

    // --- credit payments whose due date has arrived / passed ---
    for (const d of debts) {
      const bal = balanceOf(d);
      if (bal <= 0 || !d.dueDate) continue;
      const diff = Math.round((d.dueDate.getTime() - now.getTime()) / DAY);
      const { text, severity } = duePhrase(diff);
      const name = (d.customerId as any)?.name ?? "A customer";
      out.push({
        id: `debt:${d._id}`,
        type: "debt_due",
        title: diff < 0 ? "Credit payment overdue" : "Credit payment due",
        body: `${name} owes ${fmtMoney(bal, currency)} — ${text}`,
        severity,
        at: d.dueDate.toISOString(),
        href: "/dashboard",
      });
    }

    // most urgent first: danger → warning → info, then soonest due
    const rank: Record<Severity, number> = { danger: 0, warning: 1, info: 2 };
    out.sort((a, b) => rank[a.severity] - rank[b.severity] || new Date(a.at).getTime() - new Date(b.at).getTime());

    res.json({ notifications: out, count: out.length });
  } catch (err) {
    console.error("notifications error:", err);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

export default router;
