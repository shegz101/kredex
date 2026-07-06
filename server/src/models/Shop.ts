import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Shop = one business, owned by one User.
 *
 * The Shop is our "tenant": almost every other document (items, debts,
 * transactions) carries a `shopId` so we can keep each business's data
 * completely separate. This is how one app safely serves many shops.
 */
/**
 * Autopilot settings — how autonomously Kredex runs the shop's money workflows.
 * `intervalHours` is the cadence the owner chooses; `autonomy` is the trust level:
 *   suggest    — every action waits for the owner's approval (fully manual)
 *   auto_safe  — low-risk actions (restock, day summary) run themselves;
 *                anything that messages a customer still asks first  (default)
 *   full_auto  — the autopilot also resolves customer reminders on its own
 */
const autopilotSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    intervalHours: { type: Number, default: 6, min: 1, max: 24 },
    autonomy: { type: String, enum: ["suggest", "auto_safe", "full_auto"], default: "auto_safe" },
    quietStart: { type: Number, default: 21 }, // don't auto-message customers after this hour
    quietEnd: { type: Number, default: 7 }, // ...or before this hour
    lastRunAt: { type: Date },
    nextRunAt: { type: Date },
  },
  { _id: false }
);

const shopSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true }, // e.g. "provision store", "boutique"
    currency: { type: String, default: "NGN" },
    lowStockThreshold: { type: Number, default: 5 }, // default reorder level for items without their own
    location: { type: String, trim: true }, // e.g. "Yaba, Lagos, Nigeria" — powers the Opportunity Scout
    autopilot: { type: autopilotSchema, default: () => ({}) }, // autonomous-run settings
  },
  { timestamps: true }
);

export type Shop = InferSchemaType<typeof shopSchema>;
export const ShopModel = model("Shop", shopSchema);
