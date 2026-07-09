import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Shop = one business, owned by one User.
 *
 * The Shop is our "tenant": almost every other document (items, debts,
 * transactions) carries a `shopId` so we can keep each business's data
 * completely separate. This is how one app safely serves many shops.
 */
const shopSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true }, // e.g. "provision store", "boutique"
    currency: { type: String, default: "NGN" },
    lowStockThreshold: { type: Number, default: 5 }, // default reorder level for items without their own
    location: { type: String, trim: true }, // e.g. "Yaba, Lagos, Nigeria" — powers the Opportunity Scout
  },
  { timestamps: true }
);

export type Shop = InferSchemaType<typeof shopSchema>;
export const ShopModel = model("Shop", shopSchema);
