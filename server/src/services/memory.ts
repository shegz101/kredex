import { MemoryModel } from "../models/index.js";
import { embed, cosine } from "../lib/embeddings.js";

const MAX_PER_SHOP = 500; // cap so memory stays bounded ("forgetting")
const RECALL_FETCH = 300; // how many recent memories to score per query
const MIN_SCORE = 0.4; // relevance threshold (text-embedding-v4 compresses paraphrase scores into ~0.3–0.5; 0.4 catches genuine matches, top-k + the LLM filter the rest)

/** Store a durable, embedded memory for a shop. Safe to fire-and-forget. */
export async function remember(
  shopId: string,
  text: string,
  kind: "chat" | "fact" | "preference" | "event" = "chat",
  importance = 1
): Promise<void> {
  const clean = text.trim();
  if (clean.length < 4) return;
  try {
    const embedding = await embed(clean);
    await MemoryModel.create({ shopId, text: clean, kind, importance, embedding });
    await prune(shopId);
  } catch (err) {
    console.error("memory.remember failed:", (err as Error).message);
  }
}

/** Semantically recall the most relevant memories for a query. */
export async function recall(shopId: string, query: string, k = 5): Promise<string[]> {
  try {
    const q = await embed(query);
    const mems = await MemoryModel.find({ shopId })
      .select("+embedding text")
      .sort({ createdAt: -1 })
      .limit(RECALL_FETCH);
    return mems
      .map((m) => ({ text: m.text, score: cosine(q, (m.embedding as number[]) ?? []) }))
      .filter((s) => s.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((s) => s.text);
  } catch (err) {
    console.error("memory.recall failed:", (err as Error).message);
    return [];
  }
}

/** Keep only the most recent MAX_PER_SHOP memories — timely forgetting. */
async function prune(shopId: string): Promise<void> {
  const count = await MemoryModel.countDocuments({ shopId });
  if (count <= MAX_PER_SHOP) return;
  const excess = count - MAX_PER_SHOP;
  const old = await MemoryModel.find({ shopId }).sort({ createdAt: 1 }).limit(excess).select("_id");
  await MemoryModel.deleteMany({ _id: { $in: old.map((o) => o._id) } });
}
