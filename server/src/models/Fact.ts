import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Fact = one STRUCTURED, overwriteable piece of knowledge about a shop, stored
 * under a canonical dotted key:
 *
 *     product.rice.sell_price   value 1000  unit "NGN"
 *     customer.tunde.pays_on    value "Fridays"
 *
 * This is Tier 1 of Kredex's memory — the deterministic half. Unlike the
 * embedded Memory collection (Tier 2, fuzzy/semantic), a Fact has ONE current
 * value per key, and a new statement about the same key OVERWRITES it (the old
 * value is pushed onto `history`). That's what makes "rice is now ₦1000" update
 * cleanly across every chat session.
 *
 * Mongo is the source of truth; at request time we load a shop's Facts and build
 * the in-memory Trie (lib/trie.ts) from them for O(key) lookup and prefix queries.
 * The unique (shopId, key) index is what enforces "one value per key" and lets an
 * anchored-prefix regex on `key` (e.g. /^product\.rice\./) scan straight off the index.
 */
const factHistorySchema = new Schema(
  { value: { type: Schema.Types.Mixed }, unit: { type: String }, at: { type: Date, default: Date.now } },
  { _id: false }
);

const factSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    key: { type: String, required: true }, // canonical dotted path, e.g. "product.rice.sell_price"
    category: { type: String }, // first segment: product | customer | supplier | shop ... (for grouping in the UI)
    subject: { type: String }, // middle: "rice", "tunde" — the thing this fact is about
    attribute: { type: String }, // last: "sell_price", "pays_on" — which property
    value: { type: Schema.Types.Mixed, required: true }, // number or string
    unit: { type: String }, // "NGN", "kg", etc. (optional)
    label: { type: String, default: "" }, // human rendering: "Rice sells for ₦1,000"
    history: { type: [factHistorySchema], default: [] }, // prior values, newest last — audit + "used to be" answers
    source: { type: String, default: "extracted" }, // extracted | manual
  },
  { timestamps: true }
);

// one value per key per shop → upsert-by-key = atomic overwrite; also serves prefix scans
factSchema.index({ shopId: 1, key: 1 }, { unique: true });

export type Fact = InferSchemaType<typeof factSchema>;
export const FactModel = model("Fact", factSchema);
