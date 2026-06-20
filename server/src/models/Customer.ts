import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Customer = a person who buys from / owes the shop.
 *
 * IMPORTANT: customers never sign up. The owner doesn't enter an ID — the
 * backend creates this document the first time a customer is mentioned, and
 * MongoDB assigns the `_id` automatically. THAT `_id` *is* the customerId
 * that debts and transactions reference.
 *
 * `nameEmbedding` is a vector (list of numbers) from Qwen's embedding model.
 * We use it to fuzzy-match names ("iya tunde" == "Iya Tunde") so we reuse the
 * same customer instead of creating duplicates. Filled in when we create them.
 */
const customerSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true }, // for WhatsApp reminders
    nameEmbedding: { type: [Number], default: undefined, select: false }, // hidden unless asked for
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Fast lookups of all customers for a shop, sorted/searched by name.
customerSchema.index({ shopId: 1, name: 1 });

export type Customer = InferSchemaType<typeof customerSchema>;
export const CustomerModel = model("Customer", customerSchema);
