import { Schema, model, InferSchemaType } from "mongoose";

/**
 * A ChatSession is one conversation thread in the UI (like a ChatGPT chat).
 * A shop can have many. Crucially, sessions do NOT partition memory: the shop's
 * long-term memory — structured facts (the trie) and semantic memories — is
 * shop-scoped, so anything learned in one session is recalled in every other.
 * Sessions only scope the SHORT-TERM replay (the last few turns of THIS thread).
 */
const chatSessionSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    title: { type: String, default: "New chat" }, // auto-set from the first user message
    lastMessageAt: { type: Date, default: Date.now }, // for sorting threads, newest first
  },
  { timestamps: true }
);

chatSessionSchema.index({ shopId: 1, lastMessageAt: -1 });

export type ChatSession = InferSchemaType<typeof chatSessionSchema>;
export const ChatSessionModel = model("ChatSession", chatSessionSchema);
