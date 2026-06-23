import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ShopModel, TransactionModel, InventoryItemModel } from "../models/index.js";
import { qwen, MODELS } from "../lib/qwen.js";
import { fmtMoney } from "../lib/money.js";

const router = Router();
const naira = (n: number) => "₦" + Math.round(n).toLocaleString();

interface ItemPnl {
  name: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number; // 0..1
}

/**
 * GET /api/pnl  (protected)
 * Real profit & loss for the current month, plus a Qwen-written honest verdict.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const shopId = req.shopId!;
    const shop = await ShopModel.findById(shopId);
    const currency = shop?.currency ?? "NGN";

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodLabel = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const txns = await TransactionModel.find({ shopId, occurredAt: { $gte: start } });

    // Fallback cost lookup for older sales that predate cost snapshots.
    const itemCost = new Map<string, number>();
    for (const i of await InventoryItemModel.find({ shopId }).select("costPrice")) {
      itemCost.set(String(i._id), i.costPrice);
    }

    let revenue = 0;
    let cogs = 0;
    let expenses = 0;
    const byItem = new Map<string, ItemPnl>();

    for (const t of txns) {
      if (t.type === "expense") {
        expenses += t.total;
        continue;
      }
      if (t.type !== "sale") continue; // ignore restock purchases — they become COGS when sold
      revenue += t.total;
      for (const line of t.items) {
        const unitCost = line.costPrice && line.costPrice > 0 ? line.costPrice : (line.itemId ? itemCost.get(String(line.itemId)) ?? 0 : 0);
        const lineRevenue = line.unitPrice * line.quantity;
        const lineCost = unitCost * line.quantity;
        cogs += lineCost;

        const key = line.name.toLowerCase();
        const agg = byItem.get(key) ?? { name: line.name, unitsSold: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
        agg.unitsSold += line.quantity;
        agg.revenue += lineRevenue;
        agg.cost += lineCost;
        byItem.set(key, agg);
      }
    }

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    const items = [...byItem.values()]
      .map((i) => ({ ...i, profit: i.revenue - i.cost, margin: i.revenue > 0 ? (i.revenue - i.cost) / i.revenue : 0 }))
      .sort((a, b) => b.profit - a.profit);

    const summary = {
      revenue,
      costOfGoods: cogs,
      grossProfit,
      grossMargin: revenue > 0 ? grossProfit / revenue : 0,
      expenses,
      netProfit,
      netMargin: revenue > 0 ? netProfit / revenue : 0,
      items: items.map((i) => ({ name: i.name, unitsSold: i.unitsSold, profit: Math.round(i.profit), margin: Math.round(i.margin * 100) })),
    };

    // Qwen3.7-Max writes the honest verdict.
    let narrative = "";
    try {
      const completion = await qwen.chat.completions.create({
        model: MODELS.brain,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `You are Kredex's financial analyst for a small African shop. Currency is ${currency}. Be honest, warm, concrete and brief. No markdown headings. Pidgin-friendly plain English is welcome.`,
          },
          {
            role: "user",
            content:
              `Here are ${periodLabel}'s figures (amounts in ${currency}):\n` +
              JSON.stringify(summary) +
              `\n\nIn 2–4 short sentences: tell the owner plainly whether they are making money this month, the single biggest reason (use the per-item margins — name the best and weakest earner), and one practical suggestion. Don't restate every number.`,
          },
        ],
      });
      narrative = completion.choices[0]?.message?.content?.toString().trim() ?? "";
    } catch (e) {
      console.error("pnl narrative failed:", e);
      narrative =
        netProfit > 0
          ? `You're in the green this month — ${fmtMoney(netProfit, currency)} net profit on ${fmtMoney(revenue, currency)} in sales.`
          : `You're not in profit yet this month. Sales are ${fmtMoney(revenue, currency)} but costs are eating it. Push your higher-margin items.`;
    }

    res.json({
      period: periodLabel,
      currency,
      makingMoney: netProfit > 0,
      revenue,
      costOfGoods: cogs,
      grossProfit,
      grossMargin: summary.grossMargin,
      expenses,
      netProfit,
      netMargin: summary.netMargin,
      items,
      narrative,
    });
  } catch (err) {
    console.error("pnl error:", err);
    res.status(500).json({ error: "Failed to compute P&L" });
  }
});

export default router;
