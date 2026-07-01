import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Memory = a durable, embedded fact the agent can semantically recall across
 * sessions — what the owner told Kredex, key events, preferences. This is the
 * MemoryAgent layer: retrieval-augmented recall, not just CRUD lookups. Old
 * low-value memories are pruned ("forgetting").
 */
const memorySchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    kind: { type: String, enum: ["chat", "fact", "preference", "event"], default: "chat" },
    text: { type: String, required: true },
    embedding: { type: [Number], select: false }, // 1024-d vector (hidden by default)
    importance: { type: Number, default: 1 },
  },
  { timestamps: true }
);

memorySchema.index({ shopId: 1, createdAt: -1 });

export type Memory = InferSchemaType<typeof memorySchema>;
export const MemoryModel = model("Memory", memorySchema);
