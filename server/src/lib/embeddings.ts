import { qwen, MODELS } from "./qwen.js";

/** Embed text into a vector with Qwen's embedding model. */
export async function embed(text: string): Promise<number[]> {
  const res = await qwen.embeddings.create({ model: MODELS.embedding, input: text });
  return res.data[0].embedding as number[];
}

/** Cosine similarity between two equal-length vectors (−1…1). */
export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
