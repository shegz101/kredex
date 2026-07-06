import {
  ApprovalModel,
  DebtModel,
  InventoryItemModel,
  ShopModel,
  TransactionModel,
  ReminderModel,
  AutopilotRunModel,
} from "../models/index.js";
import { isLow, lowThreshold } from "../lib/stock.js";
import { fmtMoney } from "../lib/money.js";
import { qwen, MODELS } from "../lib/qwen.js";
import { recall } from "./memory.js";

/** Defaults used when a shop has no autopilot settings saved yet. */
export const AUTOPILOT_DEFAULTS = { enabled: true, intervalHours: 6, autonomy: "auto_safe" as const };
type Autonomy = "suggest" | "auto_safe" | "full_auto";

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

// ---- Approval execution (shared by the approve route AND the autopilot) ----

/** Human-readable result string once an approval is carried out. */
export function resultFor(kind: string, payload: Record<string, unknown>): string {
  switch (kind) {
    case "overdue_debt":
      return `Reminder sent to ${payload.customerName ?? "customer"} on WhatsApp`;
    case "low_stock":
      return `${payload.itemName ?? "Item"} added to your restock list`;
    case "reminder":
      return "Marked done";
    case "eod_summary":
      return "Reviewed";
    default:
      return "Reviewed";
  }
}

/**
 * Carry out an approved action for real. Used both when the owner taps
 * "approve" and when the autopilot approves it autonomously.
 */
export async function executeApproval(approval: any, shopId: string): Promise<void> {
  if (approval.status !== "pending") return;
  approval.status = "approved";
  approval.resolvedAt = new Date();
  approval.result = resultFor(approval.kind, (approval.payload ?? {}) as Record<string, unknown>);
  await approval.save();

  const payload = (approval.payload ?? {}) as Record<string, unknown>;
  if (approval.kind === "reminder") {
    const reminderId = payload.reminderId as string | undefined;
    if (reminderId) await ReminderModel.updateOne({ _id: reminderId, shopId }, { status: "done", doneAt: new Date() });
  } else if (approval.kind === "overdue_debt") {
    const debtId = payload.debtId as string | undefined;
    if (debtId) await DebtModel.updateOne({ _id: debtId, shopId }, { lastRemindedAt: new Date() });
  } else if (approval.kind === "low_stock") {
    const itemId = payload.itemId as string | undefined;
    const suggested = typeof payload.suggested === "number" ? payload.suggested : undefined;
    if (itemId)
      await InventoryItemModel.updateOne({ _id: itemId, shopId }, { needsRestock: true, restockQty: suggested, restockAddedAt: new Date() });
  }
}

/** Which action kinds the autopilot may carry out itself, per trust level. */
function canAutoExecute(kind: string, autonomy: Autonomy): boolean {
  if (autonomy === "suggest") return false;
  // low-risk, server-side actions are safe to auto-run at every level above "suggest"
  if (kind === "low_stock" || kind === "eod_summary") return true;
  // messaging a customer is only automated at the highest trust level
  if (kind === "overdue_debt") return autonomy === "full_auto";
  return false; // "reminder" nudges always surface for the owner to see
}

// ---- The autonomous run ----

const MAX_RUNS_PER_SHOP = 40;

/**
 * One autonomous pass over a shop: scan → apply the shop's trust level (auto-run
 * the safe stuff, flag the rest) → record a visible AutopilotRun → schedule the
 * next run. This is the heart of the Autopilot Agent: it works on a cadence the
 * owner sets, and acts within the guardrails the owner chose.
 */
export async function runAutopilotForShop(shopId: string, trigger: "scheduled" | "manual"): Promise<void> {
  try {
    const shop = await ShopModel.findById(shopId);
    if (!shop) return;
    const ap = (shop.autopilot as any) ?? {};
    const autonomy: Autonomy = ap.autonomy ?? AUTOPILOT_DEFAULTS.autonomy;
    const intervalHours: number = ap.intervalHours ?? AUTOPILOT_DEFAULTS.intervalHours;

    const runStart = new Date();
    const [overdueDebts, lowStock, eodSummary, dueReminders] = [
      await scanOverdueDebts(shopId),
      await scanLowStock(shopId),
      await generateEodSummary(shopId),
      await scanDueReminders(shopId),
    ];

    // everything this pass just raised, still awaiting a decision
    const raised = await ApprovalModel.find({ shopId, status: "pending", createdAt: { $gte: runStart } });
    const autoExecuted: { kind: string; title: string; result: string }[] = [];
    const pendingApproval: { kind: string; title: string }[] = [];

    for (const appr of raised) {
      if (canAutoExecute(appr.kind, autonomy)) {
        await executeApproval(appr, shopId);
        appr.readAt = new Date(); // the owner didn't need to act, so don't badge it unread
        await appr.save();
        autoExecuted.push({ kind: appr.kind, title: appr.title, result: appr.result ?? "Done" });
      } else {
        pendingApproval.push({ kind: appr.kind, title: appr.title });
      }
    }

    const summary = buildRunSummary(autoExecuted, pendingApproval);
    await AutopilotRunModel.create({
      shopId,
      trigger,
      detected: { overdueDebts, lowStock, dueReminders, eodSummary },
      autoExecuted,
      pendingApproval,
      autonomy,
      summary,
    });

    // keep the runs list bounded
    const count = await AutopilotRunModel.countDocuments({ shopId });
    if (count > MAX_RUNS_PER_SHOP) {
      const old = await AutopilotRunModel.find({ shopId }).sort({ createdAt: 1 }).limit(count - MAX_RUNS_PER_SHOP).select("_id");
      await AutopilotRunModel.deleteMany({ _id: { $in: old.map((o) => o._id) } });
    }

    // schedule the next autonomous run
    await ShopModel.updateOne(
      { _id: shopId },
      { $set: { "autopilot.lastRunAt": runStart, "autopilot.nextRunAt": new Date(runStart.getTime() + intervalHours * 3_600_000) } }
    );
  } catch (err) {
    console.error(`autopilot run failed for ${shopId}:`, (err as Error).message);
  }
}

function buildRunSummary(auto: { kind: string }[], pending: { kind: string }[]): string {
  const parts: string[] = [];
  const restocked = auto.filter((a) => a.kind === "low_stock").length;
  const loggedEod = auto.some((a) => a.kind === "eod_summary");
  const sentReminders = auto.filter((a) => a.kind === "overdue_debt").length;
  if (restocked) parts.push(`auto-added ${restocked} item${restocked === 1 ? "" : "s"} to restock`);
  if (loggedEod) parts.push("logged the day's summary");
  if (sentReminders) parts.push(`sent ${sentReminders} payment reminder${sentReminders === 1 ? "" : "s"}`);
  const flagged = pending.length;
  const done = parts.length ? parts.join(", ") : "";
  if (!done && !flagged) return "All clear — nothing needed your attention.";
  const first = done ? `Kredex ${done}.` : "";
  const second = flagged ? ` Flagged ${flagged} thing${flagged === 1 ? "" : "s"} for your approval.` : "";
  return (first + second).trim();
}

/** Scheduler tick: run every shop whose autopilot is enabled and due. */
export async function runDueShops(): Promise<void> {
  try {
    const now = new Date();
    // { $ne: false } matches shops that are enabled OR have no settings yet (default on)
    const shops = await ShopModel.find({ "autopilot.enabled": { $ne: false } }).select("_id autopilot");
    let ran = 0;
    for (const s of shops) {
      const next = (s.autopilot as any)?.nextRunAt as Date | undefined;
      if (!next || next <= now) {
        await runAutopilotForShop(String(s._id), "scheduled");
        ran++;
      }
    }
    if (ran > 0) console.log(`🛰️  autopilot: ran ${ran} shop(s)`);
  } catch (err) {
    console.error("autopilot scheduler failed:", (err as Error).message);
  }
}
