import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Memory = one durable, embedded fact the agent has learned about a shop —
 * a customer/supplier habit, a preference, a standing instruction, an event.
 * This is the MemoryAgent core: structured long-term memory with
 *   • importance (how much it matters)     — for recalling the CRITICAL few
 *   • accessCount / lastAccessedAt (usage) — reinforced when recalled
 *   • recency (createdAt / lastAccessedAt) — powers recency-weighted recall
 *   • active / supersededBy                — principled forgetting & updating
 * Retrieval scores by cosine × importance × recency, selects a diverse set
 * under a token budget (MMR), and reinforces what it uses.
 */
const memorySchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    kind: { type: String, enum: ["fact", "preference", "event", "chat"], default: "fact" },
    text: { type: String, required: true },
    embedding: { type: [Number], select: false }, // 1024-d vector (hidden by default)
    importance: { type: Number, default: 2, min: 1, max: 10 }, // how critical this memory is
    accessCount: { type: Number, default: 0 }, // times recalled + used
    lastAccessedAt: { type: Date, default: Date.now }, // reinforced on recall
    pinned: { type: Boolean, default: false }, // never forgotten
    active: { type: Boolean, default: true }, // false = forgotten / superseded
    supersededBy: { type: Schema.Types.ObjectId, ref: "Memory" }, // replaced by a newer memory
    source: { type: String, default: "extracted" }, // extracted | manual | chat
  },
  { timestamps: true }
);

// candidate fetch for recall (active, prioritised by importance / recent use)
memorySchema.index({ shopId: 1, active: 1, importance: -1, lastAccessedAt: -1 });

export type Memory = InferSchemaType<typeof memorySchema>;
export const MemoryModel = model("Memory", memorySchema);
