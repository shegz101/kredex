import {
  ApprovalModel,
  DebtModel,
  InventoryItemModel,
  ShopModel,
  TransactionModel,
  ReminderModel,
} from "../models/index.js";
import { isLow, lowThreshold } from "../lib/stock.js";
import { fmtMoney } from "../lib/money.js";
import { qwen, MODELS } from "../lib/qwen.js";
import { recall } from "./memory.js";

/**
 * The autopilot layer. These scanners run in the background (node-cron) and
 * also on-demand (POST /api/autopilot/scan). They never act on their own —
 * they raise an Approval the owner must say yes to. That's the human-in-the-loop
 * checkpoint at the centre of the Autopilot Agent track.
 */

const naira = (n: number) => "₦" + Math.round(n).toLocaleString();
const balanceOf = (d: { amount: number; payments: { amount: number }[] }) =>
  d.amount - d.payments.reduce((s, p) => s + p.amount, 0);

/** Create an approval unless an identical one is already pending (dedupe). */
async function raise(
  shopId: string,
  data: { kind: "overdue_debt" | "low_stock" | "eod_summary" | "reminder"; title: string; body: string; draft?: string; context?: string; payload?: Record<string, unknown>; dedupeKey?: string }
): Promise<boolean> {
  if (data.dedupeKey) {
    const existing = await ApprovalModel.findOne({ shopId, dedupeKey: data.dedupeKey, status: "pending" });
    if (existing) return false;
  }
  await ApprovalModel.create({ shopId, status: "pending", ...data });
  return true;
}

/**
 * Write the payment reminder with Qwen, informed by what Kredex remembers about
 * this customer (MemoryAgent → Autopilot). If the owner once told Kredex
 * "Tunde always pays late but always pays", the draft comes out patient and
 * appreciative rather than pushy. Falls back to a safe template if anything fails.
 */
async function draftReminder(
  shopId: string,
  name: string,
  balance: number,
  daysOver: number,
  cur: string
): Promise<{ draft: string; context?: string }> {
  const fallback = `Good day ${name}, hope business dey move. Just a gentle reminder say ${fmtMoney(balance, cur)} dey outstanding from your last purchase. Abeg settle when you fit. Thank you! 🙏`;
  try {
    const facts = await recall(shopId, `payment reminder for customer ${name}; how ${name} usually pays and any relevant context`, 3);
    const context = facts[0]; // the single most relevant memory drove the tone
    const memoryLine = facts.length ? `What you remember (use it to set the tone):\n- ${facts.join("\n- ")}\n` : "";
    const res = await qwen.chat.completions.create({
      model: MODELS.agent,
      temperature: 0.6,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            "You write short, warm WhatsApp payment reminders for a small African shop owner to send to a customer. Plain English or light Nigerian Pidgin. One short paragraph, friendly and respectful — never threatening or shaming. Always use the customer's name and the amount. If you know the customer usually pays late but always pays, be extra patient and appreciative. Return ONLY the message text, no quotes or preamble.",
        },
        {
          role: "user",
          content: `${memoryLine}Customer: ${name}\nOutstanding: ${fmtMoney(balance, cur)}\nOverdue by: ${daysOver} day${daysOver === 1 ? "" : "s"}\nWrite the reminder.`,
        },
      ],
    });
    const draft = res.choices[0]?.message?.content?.trim();
    return { draft: draft || fallback, context };
  } catch (err) {
    console.error("draftReminder failed, using template:", (err as Error).message);
    return { draft: fallback };
  }
}

export async function scanOverdueDebts(shopId: string): Promise<number> {
  const now = new Date();
  const shop = await ShopModel.findById(shopId).select("currency");
  const cur = shop?.currency ?? "NGN";
  const debts = await DebtModel.find({ shopId, status: { $ne: "paid" }, dueDate: { $lt: now } }).populate("customerId", "name phone");
  let created = 0;
  for (const d of debts) {
    const balance = balanceOf(d);
    if (balance <= 0) continue;
    const customer = d.customerId as unknown as { _id: unknown; name?: string; phone?: string } | null;
    const name = customer?.name ?? "Customer";
    const daysOver = Math.max(1, Math.round((now.getTime() - (d.dueDate as Date).getTime()) / 86_400_000));
    const { draft, context } = await draftReminder(shopId, name, balance, daysOver, cur);
    const made = await raise(shopId, {
      kind: "overdue_debt",
      title: `${name} owes ${fmtMoney(balance, cur)}`,
      body: `${daysOver} day${daysOver === 1 ? "" : "s"} overdue. Send a friendly reminder?`,
      draft,
      context,
      payload: { debtId: String(d._id), customerId: String(customer?._id ?? ""), customerName: name, amount: balance, phone: customer?.phone ?? null },
      dedupeKey: `overdue:${String(d._id)}`,
    });
    if (made) created++;
  }
  return created;
}

export async function scanLowStock(shopId: string): Promise<number> {
  const shop = await ShopModel.findById(shopId).select("lowStockThreshold");
  const def = shop?.lowStockThreshold ?? 5;
  const items = await InventoryItemModel.find({ shopId });
  let created = 0;
  for (const item of items) {
    if (!isLow(item, def)) continue;
    const suggested = Math.max(lowThreshold(item, def) * 3, 10);
    const unit = item.unit ? ` ${item.unit}` : "";
    const made = await raise(shopId, {
      kind: "low_stock",
      title: `${item.name} is low — ${item.quantity}${unit} left`,
      body: `Reorder about ${suggested}${unit}${item.supplier?.name ? ` from ${item.supplier.name}` : ""} before it runs out?`,
      payload: { itemId: String(item._id), itemName: item.name, quantity: item.quantity, suggested },
      dedupeKey: `lowstock:${String(item._id)}`,
    });
    if (made) created++;
  }
  return created;
}

export async function generateEodSummary(shopId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dateKey = start.toISOString().slice(0, 10);

  const sales = await TransactionModel.find({ shopId, type: "sale", occurredAt: { $gte: start } });
  const salesTotal = sales.reduce((s, t) => s + t.total, 0);
  const openDebts = await DebtModel.find({ shopId, status: { $ne: "paid" } });
  const outstanding = openDebts.reduce((s, d) => s + balanceOf(d), 0);
  const shop = await ShopModel.findById(shopId).select("lowStockThreshold currency");
  const cur = shop?.currency ?? "NGN";
  const items = await InventoryItemModel.find({ shopId });
  const lowCount = items.filter((i) => isLow(i, shop?.lowStockThreshold ?? 5)).length;

  const made = await raise(shopId, {
    kind: "eod_summary",
    title: `Today: ${fmtMoney(salesTotal, cur)} in sales`,
    body: `${sales.length} sale${sales.length === 1 ? "" : "s"} today · ${fmtMoney(outstanding, cur)} still owed across ${openDebts.length} debt${openDebts.length === 1 ? "" : "s"}${lowCount ? ` · ${lowCount} item${lowCount === 1 ? "" : "s"} low` : ""}.`,
    payload: { salesTotal, outstanding, lowCount },
    dedupeKey: `eod:${dateKey}`,
  });
  return made ? 1 : 0;
}

export async function scanDueReminders(shopId: string): Promise<number> {
  const now = new Date();
  const due = await ReminderModel.find({ shopId, status: "pending", dueAt: { $lte: now } });
  let created = 0;
  for (const r of due) {
    const made = await raise(shopId, {
      kind: "reminder",
      title: r.text,
      body: `Reminder — was due ${r.dueAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}.`,
      payload: { reminderId: String(r._id) },
      dedupeKey: `reminder:${String(r._id)}`,
    });
    if (made) {
      r.notifiedAt = now;
      await r.save();
      created++;
    }
  }
  return created;
}

/** Run every scanner for one shop (used by the manual scan endpoint). */
export async function scanShop(shopId: string): Promise<number> {
  const counts = await Promise.all([
    scanOverdueDebts(shopId),
    scanLowStock(shopId),
    generateEodSummary(shopId),
    scanDueReminders(shopId),
  ]);
  return counts.reduce((a, b) => a + b, 0);
}

/** Run a scanner across every shop (used by the cron schedules). */
async function forAllShops(fn: (shopId: string) => Promise<number>, label: string) {
  try {
    const shops = await ShopModel.find().select("_id");
    let total = 0;
    for (const s of shops) total += await fn(String(s._id));
    if (total > 0) console.log(`🛰️  autopilot ${label}: raised ${total} approval(s)`);
  } catch (err) {
    console.error(`autopilot ${label} failed:`, err);
  }
}

export const autopilotJobs = {
  overdue: () => forAllShops(scanOverdueDebts, "overdue-debt scan"),
  lowStock: () => forAllShops(scanLowStock, "low-stock scan"),
  eod: () => forAllShops(generateEodSummary, "end-of-day summary"),
  reminders: () => forAllShops(scanDueReminders, "due-reminder scan"),
};
