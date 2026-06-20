import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  ShopModel,
  DebtModel,
  InventoryItemModel,
  TransactionModel,
} from "../models/index.js";
import { isLow } from "../lib/stock.js";

const router = Router();

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "K";
}

function balanceOf(debt: { amount: number; payments: { amount: number }[] }): number {
  return debt.amount - debt.payments.reduce((s, p) => s + p.amount, 0);
}

function relTime(d: Date): string {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * GET /api/dashboard  (protected)
 * Everything the operator dashboard needs, computed live from the shop's data.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const shopId = req.shopId!;
    const shop = await ShopModel.findById(shopId);
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }

    const [debts, items, txns] = await Promise.all([
      DebtModel.find({ shopId, status: { $ne: "paid" } }).populate("customerId", "name"),
      InventoryItemModel.find({ shopId }),
      TransactionModel.find({ shopId }).sort({ occurredAt: -1 }).limit(40),
    ]);

    // --- debts owed ---
    const owedTotal = debts.reduce((s, d) => s + balanceOf(d), 0);
    const debtorIds = new Set(debts.filter((d) => balanceOf(d) > 0).map((d) => String(d.customerId)));

    // --- revenue this month vs last month ---
    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const allSales = await TransactionModel.find({ shopId, type: "sale", occurredAt: { $gte: startLastMonth } });
    const revThisMonth = allSales.filter((t) => t.occurredAt >= startThisMonth).reduce((s, t) => s + t.total, 0);
    const revLastMonth = allSales.filter((t) => t.occurredAt < startThisMonth).reduce((s, t) => s + t.total, 0);
    const revDeltaPct = revLastMonth > 0 ? Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100) : null;

    // --- revenue series (last 7 days) ---
    const days: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now); day.setHours(0, 0, 0, 0); day.setDate(now.getDate() - i);
      const next = new Date(day); next.setDate(day.getDate() + 1);
      const total = allSales
        .filter((t) => t.occurredAt >= day && t.occurredAt < next)
        .reduce((s, t) => s + t.total, 0);
      days.push({ label: day.toLocaleDateString([], { weekday: "short" }), total });
    }

    // --- low stock (item's own reorder level, else the shop default) ---
    const lowDefault = shop.lowStockThreshold ?? 5;
    const lowStock = items
      .filter((i) => isLow(i, lowDefault))
      .slice(0, 6)
      .map((i) => ({ id: String(i._id), name: i.name, qty: `${i.quantity}${i.unit ? " " + i.unit : ""}` }));

    // --- overdue debtors ---
    const overdue = debts
      .filter((d) => balanceOf(d) > 0)
      .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))
      .slice(0, 5)
      .map((d) => {
        const c = d.customerId as any;
        const name = c?.name ?? "Customer";
        let note = "No due date";
        if (d.dueDate) {
          const diff = Math.round((d.dueDate.getTime() - now.getTime()) / 86_400_000);
          note = diff < 0 ? `${-diff} day${-diff === 1 ? "" : "s"} overdue` : diff === 0 ? "Due today" : diff === 1 ? "Due tomorrow" : `Due in ${diff} days`;
        }
        return { id: String(d._id), name, amount: balanceOf(d), note, initials: initialsOf(name) };
      });

    // --- recent activity (from transactions) ---
    const toneFor = (t: any) =>
      t.type === "purchase" ? "zinc" : t.type === "expense" ? "zinc" : t.paymentMethod === "credit" ? "orange" : "green";
    const statusFor = (t: any) =>
      t.type === "purchase" ? "Stock" : t.type === "expense" ? "Expense" : t.paymentMethod === "credit" ? "Credit" : t.paymentMethod === "transfer" ? "Transfer" : "Cash";
    const activity = txns.slice(0, 6).map((t) => {
      const lead = t.items?.[0];
      const title =
        t.type === "purchase"
          ? `${lead ? `${lead.quantity} ${lead.name}` : "Stock"} added`
          : `${lead ? `${lead.quantity} ${lead.name}` : "Sale"}`;
      return {
        id: String(t._id),
        type: t.type,
        title,
        meta: `${t.type === "purchase" ? "Inventory" : "Sale"} · ₦${t.total.toLocaleString()}`,
        status: statusFor(t),
        tone: toneFor(t),
        time: relTime(t.occurredAt),
      };
    });

    // --- a simple business-health score (0-100) ---
    const collectionPenalty = Math.min(30, overdue.filter((o) => o.note.includes("overdue")).length * 10);
    const stockPenalty = Math.min(15, lowStock.length * 5);
    const activityBonus = txns.length > 0 ? 15 : 0;
    const health = Math.max(0, Math.min(100, 70 + activityBonus - collectionPenalty - stockPenalty));
    const healthLabel = health >= 80 ? "Strong" : health >= 60 ? "Good" : health >= 40 ? "Watch" : "At risk";

    res.json({
      shop: { name: shop.name, location: shop.type ?? "", initials: initialsOf(shop.name), currency: shop.currency ?? "NGN" },
      stats: {
        owedTotal,
        owedCustomers: debtorIds.size,
        revenueThisMonth: revThisMonth,
        revenueDeltaPct: revDeltaPct,
        health,
        healthLabel,
      },
      revenueSeries: days.map((d) => d.total),
      revenueLabels: days.map((d) => d.label),
      activity,
      overdue,
      lowStock,
    });
  } catch (err) {
    console.error("dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

export default router;
