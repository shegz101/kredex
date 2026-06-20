import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Transaction = one entry in the shop's ledger: a sale, a purchase (restock),
 * or an expense. This collection is the source of truth that powers the P&L
 * ("are you making money?") and the tax-season export.
 *
 * `items` (line items) are EMBEDDED because they only exist as part of this
 * one transaction. We also snapshot the name/price at the time of sale, so a
 * later price change on the InventoryItem never rewrites history.
 */
const lineItemSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" }, // optional link back to stock
    name: { type: String, required: true }, // snapshot of the name at sale time
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true }, // sell price per unit at sale time
    costPrice: { type: Number, default: 0 }, // cost per unit at sale time — powers accurate P&L
  },
  { _id: false }
);

const transactionSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    type: { type: String, enum: ["sale", "purchase", "expense"], required: true },
    items: { type: [lineItemSchema], default: [] },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cash", "credit", "transfer"], default: "cash" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" }, // set on credit sales
    note: { type: String, trim: true },
    occurredAt: { type: Date, default: Date.now }, // when it happened (may differ from createdAt)
  },
  { timestamps: true }
);

// Powers dashboards & reports: a shop's ledger ordered by time.
transactionSchema.index({ shopId: 1, occurredAt: -1 });

export type Transaction = InferSchemaType<typeof transactionSchema>;
export const TransactionModel = model("Transaction", transactionSchema);
