import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Invoice = a billable document for a customer. Generated from chat or the
 * Invoices page, rendered to a branded PDF, and tracked as unpaid/paid.
 */
const invoiceLineSchema = new Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    number: { type: String, required: true }, // e.g. KRD-007
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true },
    items: { type: [invoiceLineSchema], default: [] },
    total: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    notes: { type: String, trim: true },
    dueDate: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

invoiceSchema.index({ shopId: 1, createdAt: -1 });

export type Invoice = InferSchemaType<typeof invoiceSchema>;
export const InvoiceModel = model("Invoice", invoiceSchema);
