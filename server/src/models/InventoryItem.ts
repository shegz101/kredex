import { Schema, model, InferSchemaType } from "mongoose";

/**
 * InventoryItem = one product line the shop stocks.
 *
 * Design choice — EMBED vs REFERENCE:
 * `supplier` is EMBEDDED (a small object living inside the item) because we
 * always read it together with the item and it's tiny. We don't need a whole
 * separate `suppliers` collection for the MVP. If suppliers grow their own
 * life (multiple items, contact history), we'd promote them to a reference.
 */
const supplierSchema = new Schema(
  {
    name: { type: String, trim: true },
    lastPrice: { type: Number }, // last cost quoted — powers "this is higher than before" alerts
  },
  { _id: false } // embedded sub-doc: no separate id needed
);

const inventoryItemSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true, trim: true },
    unit: { type: String, trim: true }, // "bag", "bottle", "carton"
    quantity: { type: Number, required: true, default: 0 },
    costPrice: { type: Number, required: true, default: 0 }, // what the owner paid
    sellPrice: { type: Number, required: true, default: 0 }, // what the owner sells for
    lowStockAt: { type: Number, default: 0 }, // per-item reorder threshold for low-stock alerts
    supplier: { type: supplierSchema, default: undefined },
    nameEmbedding: { type: [Number], default: undefined, select: false }, // fuzzy item matching
  },
  { timestamps: true }
);

inventoryItemSchema.index({ shopId: 1, name: 1 });

export type InventoryItem = InferSchemaType<typeof inventoryItemSchema>;
export const InventoryItemModel = model("InventoryItem", inventoryItemSchema);
