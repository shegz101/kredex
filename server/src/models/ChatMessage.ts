import { Schema, model, InferSchemaType } from "mongoose";

/**
 * One line of the shop's conversation with Kredex. Persisting these lets the
 * chat survive navigation/reload AND gives the agent short conversational memory
 * (we replay the last few turns back into the model on each new message).
 *
 * Note: this is the CONVERSATION log. The shop's actual facts (stock, debts,
 * customers, ledger) live in their own collections — that's the real memory the
 * agent reads from via tools.
 */
const actionSchema = new Schema(
  { name: { type: String, required: true }, result: { type: Schema.Types.Mixed } },
  { _id: false }
);

const chatMessageSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    text: { type: String, default: "" },
    intent: { type: String },
    actions: { type: [actionSchema], default: [] },
  },
  { timestamps: true }
);

chatMessageSchema.index({ shopId: 1, createdAt: 1 });

export type ChatMessage = InferSchemaType<typeof chatMessageSchema>;
export const ChatMessageModel = model("ChatMessage", chatMessageSchema);
