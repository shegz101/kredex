import mongoose from "mongoose";
import { MemoryModel } from "../models/index.js";
import { embed, cosine } from "../lib/embeddings.js";
import { qwen, MODELS } from "../lib/qwen.js";

/**
 * The MemoryAgent engine.
 *
 * Storage:   turns are distilled into typed, deduplicated memories
 *            (facts / preferences / events) — not raw chat.
 * Retrieval: score = cosine × importance × recency, then MMR-select a diverse,
 *            non-redundant set under a token budget (recall the critical few).
 * Learning:  recalled memories are reinforced (importance ↑, recency refreshed)
 *            so the agent gets sharper about a shop over time.
 * Forgetting: near-duplicates merge; contradictions supersede; and when a shop
 *            exceeds the cap, the lowest importance×recency memories are evicted.
 */

// ---- tunables ----
const MAX_PER_SHOP = 600; // hard cap → triggers forgetting
const CANDIDATE_FETCH = 400; // active memories scored per recall
const MIN_SIM = 0.36; // semantic gate (text-embedding-v4 packs paraphrases into ~0.3–0.5)
const DEDUP_SIM = 0.82; // ≥ this against an existing memory → merge (reinforce) instead of duplicating
const RECENCY_HALFLIFE_DAYS = 30;
const STALE_DAYS = 120; // low-importance memory untouched this long → timely forgetting
const STALE_IMPORTANCE = 3; // only decay memories at/below this importance (never the critical ones)
const MMR_LAMBDA = 0.72; // relevance vs. diversity in selection
const CHAR_BUDGET = 720; // ~ limited context window for injected memories
const DEFAULT_K = 6;

type Kind = "fact" | "preference" | "event" | "chat";

function extractJson(text: string): any {
  const t = text.replace(/```json\s*|\s*```/g, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("no json");
  return JSON.parse(t.slice(a, b + 1));
}

function recencyBoost(date: Date): number {
  const ageDays = (Date.now() - new Date(date).getTime()) / 86_400_000;
  return 0.75 + 0.25 * Math.exp(-ageDays / RECENCY_HALFLIFE_DAYS); // 1.0 (now) → 0.75 (old)
}
function importanceBoost(importance: number, pinned: boolean): number {
  return (pinned ? 1.35 : 1) * (1 + 0.12 * (importance - 1)); // imp 1→1.0, 5→1.48, 10→2.08
}

// ---------------------------------------------------------------------------
// WRITE: distil a conversation turn into durable, typed memories
// ---------------------------------------------------------------------------

const EXTRACT_SYS = `You maintain the long-term memory of an AI bookkeeper for a small African shop.
From one conversation turn, extract only DURABLE, reusable knowledge about the shop, its customers, suppliers, habits, preferences, or standing instructions.
DO capture: payment habits ("Tunde always pays late but pays"), preferences ("owner closes early on Fridays"), supplier terms, recurring patterns, standing rules ("always remind me on Mondays").
DO NOT capture: one-off transactions, amounts/quantities already saved in the ledger, greetings, questions, or anything transient.
Return ONLY JSON: {"memories":[{"text":"concise third-person fact","kind":"fact|preference|event","importance":1-5}]}.
Return {"memories":[]} if nothing durable. Keep each text under 140 characters.`;

/** Distil a turn (user + assistant) into 0–N typed memories and store them. */
export async function rememberFromTurn(shopId: string, userMsg: string, assistantMsg = ""): Promise<void> {
  try {
    const res = await qwen.chat.completions.create({
      model: MODELS.agent,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: EXTRACT_SYS },
        { role: "user", content: `Owner said: ${userMsg}\nKredex replied: ${assistantMsg}`.slice(0, 2000) },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "";
    const parsed = extractJson(raw);
    const mems: any[] = Array.isArray(parsed.memories) ? parsed.memories : [];
    for (const m of mems.slice(0, 5)) {
      if (m?.text && String(m.text).trim().length >= 4) {
        await remember(shopId, String(m.text).trim(), (m.kind as Kind) ?? "fact", Number(m.importance) || 2);
      }
    }
    await forget(shopId);
  } catch (err) {
    console.error("memory.rememberFromTurn failed:", (err as Error).message);
  }
}

/** Low-level store with dedup/merge. Safe to fire-and-forget. */
export async function remember(shopId: string, text: string, kind: Kind = "fact", importance = 2, source = "extracted"): Promise<void> {
  const clean = text.trim();
  if (clean.length < 4) return;
  try {
    const embedding = await embed(clean);
    // dedup: if very similar to an existing active memory, merge (reinforce) instead of duplicating
    const existing = await MemoryModel.find({ shopId, active: true }).select("+embedding text importance accessCount").limit(300);
    let bestSim = 0;
    let bestId: any = null;
    for (const e of existing) {
      const s = cosine(embedding, (e.embedding as number[]) ?? []);
      if (s > bestSim) { bestSim = s; bestId = e._id; }
    }
    if (bestId && bestSim >= DEDUP_SIM) {
      await MemoryModel.updateOne(
        { _id: bestId },
        { $inc: { importance: 1, accessCount: 1 }, $set: { lastAccessedAt: new Date() } }
      );
      // keep importance bounded
      await MemoryModel.updateOne({ _id: bestId, importance: { $gt: 10 } }, { $set: { importance: 10 } });
      return;
    }
    await MemoryModel.create({ shopId, text: clean, kind, importance: Math.min(10, Math.max(1, importance)), embedding, source });
  } catch (err) {
    console.error("memory.remember failed:", (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// READ: scored, diverse, budgeted recall + reinforcement
// ---------------------------------------------------------------------------

interface Scored {
  id: any;
  text: string;
  emb: number[];
  score: number;
}

/** Recall the most relevant memories for a query (texts), reinforcing what it uses. */
export async function recall(shopId: string, query: string, k = DEFAULT_K): Promise<string[]> {
  const detailed = await recallDetailed(shopId, query, k);
  return detailed.map((d) => d.text);
}

/** Recall with metadata (used by the memory inspector's "why recalled" view). */
export async function recallDetailed(shopId: string, query: string, k = DEFAULT_K): Promise<{ id: string; text: string; score: number }[]> {
  try {
    const q = await embed(query);
    const cands = await MemoryModel.find({ shopId, active: true })
      .select("+embedding text importance lastAccessedAt pinned")
      .sort({ pinned: -1, importance: -1, lastAccessedAt: -1 })
      .limit(CANDIDATE_FETCH);

    const scored: Scored[] = [];
    for (const m of cands) {
      const emb = (m.embedding as number[]) ?? [];
      const sim = cosine(q, emb);
      if (sim < MIN_SIM) continue;
      const score = sim * importanceBoost(m.importance ?? 2, !!m.pinned) * recencyBoost(m.lastAccessedAt ?? (m as any).createdAt);
      scored.push({ id: m._id, text: m.text, emb, score });
    }
    scored.sort((a, b) => b.score - a.score);

    // MMR: greedily pick relevant-but-diverse memories under a char budget
    const selected: Scored[] = [];
    let used = 0;
    while (selected.length < k && scored.length) {
      let bestIdx = -1;
      let best = -Infinity;
      for (let i = 0; i < scored.length; i++) {
        const c = scored[i];
        const maxSim = selected.reduce((mx, s) => Math.max(mx, cosine(c.emb, s.emb)), 0);
        const mmr = MMR_LAMBDA * c.score - (1 - MMR_LAMBDA) * maxSim;
        if (mmr > best) { best = mmr; bestIdx = i; }
      }
      if (bestIdx < 0) break;
      const pick = scored.splice(bestIdx, 1)[0];
      if (used + pick.text.length > CHAR_BUDGET && selected.length) break;
      selected.push(pick);
      used += pick.text.length;
    }

    // reinforce: memories that get recalled matter → importance ↑, recency refreshed
    if (selected.length) {
      const ids = selected.map((s) => s.id);
      await MemoryModel.updateMany({ _id: { $in: ids } }, { $inc: { accessCount: 1 }, $set: { lastAccessedAt: new Date() } });
      await MemoryModel.updateMany({ _id: { $in: ids }, importance: { $lt: 10 } }, { $inc: { importance: 0.5 } });
    }

    return selected.map((s) => ({ id: String(s.id), text: s.text, score: Math.round(s.score * 1000) / 1000 }));
  } catch (err) {
    console.error("memory.recall failed:", (err as Error).message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// FORGET: evict the least important, least recently used memories
// ---------------------------------------------------------------------------

async function forget(shopId: string): Promise<void> {
  // 1. TIME-BASED decay — retire stale, low-value knowledge (outdated info).
  //    Soft-deactivate (active:false) rather than hard-delete: auditable and
  //    reversible, and it keeps supersededBy chains intact. Pinned + important
  //    memories are never touched, no matter how old.
  const staleBefore = new Date(Date.now() - STALE_DAYS * 86_400_000);
  await MemoryModel.updateMany(
    {
      shopId,
      active: true,
      pinned: { $ne: true },
      importance: { $lte: STALE_IMPORTANCE },
      lastAccessedAt: { $lt: staleBefore },
    },
    { $set: { active: false } }
  );

  // 2. CAP-BASED eviction — if a shop is still over the hard cap after decay,
  //    hard-delete the lowest importance×recency memories to bound storage.
  const count = await MemoryModel.countDocuments({ shopId, active: true });
  if (count <= MAX_PER_SHOP) return;
  const excess = count - MAX_PER_SHOP;
  const mems = await MemoryModel.find({ shopId, active: true, pinned: { $ne: true } }).select("importance lastAccessedAt");
  const ranked = mems
    .map((m) => ({ id: m._id, keep: importanceBoost(m.importance ?? 2, false) * recencyBoost(m.lastAccessedAt ?? (m as any).createdAt) }))
    .sort((a, b) => a.keep - b.keep) // lowest value first
    .slice(0, excess);
  if (ranked.length) await MemoryModel.deleteMany({ _id: { $in: ranked.map((r) => r.id) } });
}

// ---------------------------------------------------------------------------
// INSPECTOR: list a shop's memories (no vectors)
// ---------------------------------------------------------------------------

export async function listMemories(shopId: string) {
  const mems = await MemoryModel.find({ shopId, active: true })
    .select("text kind importance accessCount lastAccessedAt pinned createdAt")
    .sort({ importance: -1, lastAccessedAt: -1 })
    .limit(200);
  return mems.map((m) => ({
    id: String(m._id),
    text: m.text,
    kind: m.kind,
    importance: Math.round((m.importance ?? 2) * 10) / 10,
    accessCount: m.accessCount ?? 0,
    lastAccessedAt: m.lastAccessedAt,
    pinned: !!m.pinned,
    createdAt: (m as any).createdAt,
  }));
}

export async function memoryStats(shopId: string) {
  const [total, byKind] = await Promise.all([
    MemoryModel.countDocuments({ shopId, active: true }),
    MemoryModel.aggregate([
      { $match: { shopId: new mongoose.Types.ObjectId(shopId), active: true } },
      { $group: { _id: "$kind", n: { $sum: 1 } } },
    ]),
  ]);
  const kinds: Record<string, number> = {};
  for (const b of byKind) kinds[b._id] = b.n;
  return { total, kinds };
}

export async function forgetOne(shopId: string, id: string): Promise<boolean> {
  const r = await MemoryModel.updateOne({ _id: id, shopId }, { $set: { active: false } });
  return r.matchedCount > 0;
}
