import OpenAI from "openai";
import {
  CustomerModel,
  DebtModel,
  InventoryItemModel,
  TransactionModel,
} from "../models/index.js";
import { isLow } from "../lib/stock.js";

/**
 * TOOLS = the actions the AI agent can take. Two halves:
 *  1) `toolDefs`  — JSON-schema descriptions we hand to Qwen so it knows what
 *     it can call and what arguments each needs (this is "function calling").
 *  2) `executeTool` — the real implementation that runs against MongoDB when
 *     Qwen decides to call one. Every executor is scoped to a single shopId,
 *     so a shop can only ever touch its own data.
 */

export interface ToolContext {
  shopId: string;
}

// ---------- small helpers ----------

/** Case-insensitive find of a customer; creates one if missing (find-or-create). */
async function findOrCreateCustomer(shopId: string, name: string) {
  const existing = await CustomerModel.findOne({
    shopId,
    name: new RegExp(`^${escapeRegex(name)}$`, "i"),
  });
  if (existing) return existing;
  return CustomerModel.create({ shopId, name });
}

/** Case-insensitive find of an inventory item by name. */
async function findItem(shopId: string, name: string) {
  return InventoryItemModel.findOne({
    shopId,
    name: new RegExp(`^${escapeRegex(name)}$`, "i"),
  });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- tool definitions (what Qwen sees) ----------

export const toolDefs: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "log_stock",
      description:
        "Add new stock the owner bought/restocked. Increases quantity if the item exists, otherwise creates it.",
      parameters: {
        type: "object",
        properties: {
          itemName: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string", description: "e.g. bag, bottle, carton" },
          costPrice: { type: "number", description: "price the owner paid per unit" },
          sellPrice: { type: "number", description: "price the owner sells per unit" },
          supplierName: { type: "string" },
          lowStockAt: { type: "number", description: "reorder level — warn the owner when stock drops to/below this" },
        },
        required: ["itemName", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_sale",
      description: "Record a CASH (or transfer) sale. Deducts the sold quantities from stock.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unitPrice: { type: "number", description: "optional; defaults to the item's sell price" },
              },
              required: ["name", "quantity"],
            },
          },
          paymentMethod: { type: "string", enum: ["cash", "transfer"] },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_credit_sale",
      description:
        "Record a sale given ON CREDIT. Deducts stock AND opens a debt the customer owes.",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unitPrice: { type: "number" },
              },
              required: ["name", "quantity"],
            },
          },
          dueDate: { type: "string", description: "ISO date or natural like 'Saturday' (optional)" },
        },
        required: ["customerName", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_payment",
      description: "Record money a customer paid toward their debt. Applies to oldest debts first.",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string" },
          amount: { type: "number" },
        },
        required: ["customerName", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_debts",
      description: "Look up who owes money. Pass a customerName for one person, or omit for everyone.",
      parameters: {
        type: "object",
        properties: { customerName: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_stock",
      description: "Check stock levels. Pass an itemName for one item, or omit for the whole shop.",
      parameters: {
        type: "object",
        properties: { itemName: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "daily_summary",
      description: "Get today's shop snapshot: sales, outstanding debts, and low-stock items.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "record_expense",
      description:
        "Record a running-cost expense the owner paid (rent, transport, fuel, repairs, electricity, etc.). NOT for buying stock — use log_stock for restocking.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "what the money was spent on" },
          amount: { type: "number" },
        },
        required: ["description", "amount"],
      },
    },
  },
];

// ---------- executors (what actually runs) ----------

type Executor = (args: any, ctx: ToolContext) => Promise<any>;

const executors: Record<string, Executor> = {
  async log_stock(args, { shopId }) {
    const { itemName, quantity, unit, costPrice, sellPrice, supplierName, lowStockAt } = args;
    let item = await findItem(shopId, itemName);

    if (item) {
      item.quantity += quantity;
      if (unit) item.unit = unit;
      if (typeof costPrice === "number") item.costPrice = costPrice;
      if (typeof sellPrice === "number") item.sellPrice = sellPrice;
      if (typeof lowStockAt === "number") item.lowStockAt = lowStockAt;
      if (supplierName) item.supplier = { name: supplierName, lastPrice: costPrice ?? item.supplier?.lastPrice };
      await item.save();
    } else {
      item = await InventoryItemModel.create({
        shopId,
        name: itemName,
        unit,
        quantity,
        costPrice: costPrice ?? 0,
        sellPrice: sellPrice ?? 0,
        lowStockAt: typeof lowStockAt === "number" ? lowStockAt : undefined,
        supplier: supplierName ? { name: supplierName, lastPrice: costPrice } : undefined,
      });
    }

    // Log the restock as a purchase transaction (feeds the P&L later).
    if (typeof costPrice === "number") {
      await TransactionModel.create({
        shopId,
        type: "purchase",
        items: [{ itemId: item._id, name: item.name, quantity, unitPrice: costPrice }],
        total: quantity * costPrice,
        paymentMethod: "cash",
      });
    }

    return { ok: true, item: { name: item.name, quantity: item.quantity, unit: item.unit } };
  },

  async record_sale(args, { shopId }) {
    const result = await sellItems(shopId, args.items);
    if (result.error) return result;
    const tx = await TransactionModel.create({
      shopId,
      type: "sale",
      items: result.lines,
      total: result.total,
      paymentMethod: args.paymentMethod === "transfer" ? "transfer" : "cash",
    });
    return { ok: true, total: result.total, soldItems: result.lines, stockNow: result.stockNow, warnings: result.warnings, transactionId: String(tx._id) };
  },

  async record_credit_sale(args, { shopId }) {
    const { customerName, items, dueDate } = args;
    const result = await sellItems(shopId, items);
    if (result.error) return result;

    const customer = await findOrCreateCustomer(shopId, customerName);
    const tx = await TransactionModel.create({
      shopId,
      type: "sale",
      items: result.lines,
      total: result.total,
      paymentMethod: "credit",
      customerId: customer._id,
    });
    const debt = await DebtModel.create({
      shopId,
      customerId: customer._id,
      amount: result.total,
      dueDate: parseDate(dueDate),
      transactionId: tx._id,
    });

    return {
      ok: true,
      customer: customer.name,
      total: result.total,
      owes: result.total,
      dueDate: debt.dueDate ?? null,
      stockNow: result.stockNow,
      warnings: result.warnings,
    };
  },

  async record_payment(args, { shopId }) {
    const { customerName, amount } = args;
    const customer = await CustomerModel.findOne({
      shopId,
      name: new RegExp(`^${escapeRegex(customerName)}$`, "i"),
    });
    if (!customer) return { error: `No customer named "${customerName}" found.` };

    // Oldest open debts first.
    const debts = await DebtModel.find({ shopId, customerId: customer._id, status: { $ne: "paid" } }).sort({ createdAt: 1 });
    let remaining = amount;
    for (const debt of debts) {
      if (remaining <= 0) break;
      const balance = debt.amount - debt.payments.reduce((s, p) => s + p.amount, 0);
      const pay = Math.min(balance, remaining);
      debt.payments.push({ amount: pay, paidAt: new Date() });
      if (pay >= balance) debt.status = "paid";
      await debt.save();
      remaining -= pay;
    }

    const stillOwed = await totalOwedByCustomer(shopId, String(customer._id));
    return { ok: true, customer: customer.name, paid: amount - Math.max(remaining, 0), unapplied: Math.max(remaining, 0), stillOwes: stillOwed };
  },

  async query_debts(args, { shopId }) {
    if (args.customerName) {
      const customer = await CustomerModel.findOne({
        shopId,
        name: new RegExp(`^${escapeRegex(args.customerName)}$`, "i"),
      });
      if (!customer) return { error: `No customer named "${args.customerName}".` };
      const owed = await totalOwedByCustomer(shopId, String(customer._id));
      return { customer: customer.name, owes: owed };
    }

    const debts = await DebtModel.find({ shopId, status: { $ne: "paid" } }).populate("customerId", "name");
    const byCustomer: Record<string, { name: string; owes: number; dueDate: Date | null }> = {};
    let total = 0;
    for (const d of debts) {
      const balance = d.amount - d.payments.reduce((s, p) => s + p.amount, 0);
      if (balance <= 0) continue;
      const c = d.customerId as any;
      const key = String(c?._id ?? "unknown");
      if (!byCustomer[key]) byCustomer[key] = { name: c?.name ?? "Unknown", owes: 0, dueDate: d.dueDate ?? null };
      byCustomer[key].owes += balance;
      total += balance;
    }
    return { totalOutstanding: total, customers: Object.values(byCustomer) };
  },

  async query_stock(args, { shopId }) {
    if (args.itemName) {
      const item = await findItem(shopId, args.itemName);
      if (!item) return { error: `No item named "${args.itemName}" in stock.` };
      return { name: item.name, quantity: item.quantity, unit: item.unit, low: isLow(item) };
    }
    const items = await InventoryItemModel.find({ shopId }).sort({ name: 1 });
    return {
      items: items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, low: isLow(i) })),
      lowStock: items.filter((i) => isLow(i)).map((i) => i.name),
    };
  },

  async daily_summary(_args, { shopId }) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sales = await TransactionModel.find({ shopId, type: "sale", occurredAt: { $gte: startOfDay } });
    const salesTotal = sales.reduce((s, t) => s + t.total, 0);

    const openDebts = await DebtModel.find({ shopId, status: { $ne: "paid" } });
    const outstanding = openDebts.reduce((s, d) => s + (d.amount - d.payments.reduce((x, p) => x + p.amount, 0)), 0);

    const items = await InventoryItemModel.find({ shopId });
    const lowStock = items.filter((i) => isLow(i)).map((i) => ({ name: i.name, quantity: i.quantity }));

    return {
      salesToday: salesTotal,
      numSalesToday: sales.length,
      outstandingDebt: outstanding,
      numDebtors: new Set(openDebts.map((d) => String(d.customerId))).size,
      lowStock,
    };
  },

  async record_expense(args, { shopId }) {
    const { description, amount } = args;
    await TransactionModel.create({ shopId, type: "expense", total: amount, note: description, items: [] });
    return { ok: true, expense: description, amount };
  },
};

// ---------- shared sale logic (used by cash + credit) ----------

async function sellItems(shopId: string, items: Array<{ name: string; quantity: number; unitPrice?: number }>) {
  const lines: Array<{ itemId?: any; name: string; quantity: number; unitPrice: number; costPrice: number }> = [];
  const stockNow: Array<{ name: string; quantity: number }> = [];
  const warnings: string[] = [];
  let total = 0;

  for (const line of items) {
    const item = await findItem(shopId, line.name);
    if (!item) return { error: `No item named "${line.name}" in stock. Add it first.` };

    const unitPrice = typeof line.unitPrice === "number" ? line.unitPrice : item.sellPrice;
    if (item.quantity < line.quantity) {
      warnings.push(`Only ${item.quantity} ${item.name} in stock, but ${line.quantity} requested.`);
    }
    item.quantity = Math.max(0, item.quantity - line.quantity);
    await item.save();

    // snapshot the cost at sale time so P&L stays accurate later
    lines.push({ itemId: item._id, name: item.name, quantity: line.quantity, unitPrice, costPrice: item.costPrice });
    stockNow.push({ name: item.name, quantity: item.quantity });
    if (isLow(item)) warnings.push(`${item.name} is now low (${item.quantity} left).`);
    total += unitPrice * line.quantity;
  }

  return { lines, stockNow, warnings, total };
}

async function totalOwedByCustomer(shopId: string, customerId: string) {
  const debts = await DebtModel.find({ shopId, customerId, status: { $ne: "paid" } });
  return debts.reduce((s, d) => s + (d.amount - d.payments.reduce((x, p) => x + p.amount, 0)), 0);
}

function parseDate(input?: string): Date | undefined {
  if (!input) return undefined;
  const d = new Date(input);
  return isNaN(d.getTime()) ? undefined : d;
}

// ---------- dispatcher ----------

export async function executeTool(name: string, args: any, ctx: ToolContext) {
  const fn = executors[name];
  if (!fn) return { error: `Unknown tool: ${name}` };
  try {
    return await fn(args, ctx);
  } catch (err) {
    console.error(`tool ${name} failed:`, err);
    return { error: `Failed to run ${name}.` };
  }
}
