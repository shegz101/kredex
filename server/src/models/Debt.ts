import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Debt = money a customer owes the shop (a credit sale).
 *
 * Design choice — EMBED vs REFERENCE:
 * `payments` are EMBEDDED inside the debt because you ALWAYS read a debt
 * together with its payment history, and the list is short. Embedding = one
 * fast read, no joins. By contrast `customerId` is a REFERENCE because a
 * customer exists independently and is shared across many debts/transactions.
 *
 * We compute the outstanding `balance` as a VIRTUAL (derived on read) so it
 * can never drift out of sync with the actual payments.
 */
const paymentSchema = new Schema(
  {
    amount: { type: Number, required: true },
    paidAt: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { _id: false }
);

const debtSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    amount: { type: Number, required: true }, // original amount owed
    payments: { type: [paymentSchema], default: [] },
    status: { type: String, enum: ["open", "paid", "overdue"], default: "open" },
    dueDate: { type: Date },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" }, // the sale that opened it
    lastRemindedAt: { type: Date }, // when the autopilot last sent a reminder (set on approve)
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Outstanding balance = original amount minus everything paid so far.
debtSchema.virtual("balance").get(function () {
  const paid = (this.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  return this.amount - paid;
});

// Common autopilot query: "open/overdue debts for this shop, by due date".
debtSchema.index({ shopId: 1, status: 1, dueDate: 1 });

export type Debt = InferSchemaType<typeof debtSchema>;
export const DebtModel = model("Debt", debtSchema);
