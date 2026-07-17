/**
 * Memory benchmark — measures the core operations of both memory tiers on real
 * hardware. Pure and self-contained: no MongoDB, no Qwen key. Reproduce with:
 *
 *     npm --prefix server run bench
 *
 * Tier 1 (structured / trie): exact lookup, in-place overwrite, and prefix recall,
 *   each compared against the naive baseline (a flat array scanned linearly). The
 *   point is scaling — the trie stays flat as the fact count grows; the scan doesn't.
 *
 * Tier 2 (vector): the per-recall scoring cost (cosine over the candidate set at
 *   the real 1024-d embedding width), plus the context-budget guarantee that keeps
 *   the "critical few" injection bounded no matter how much a shop accumulates.
 */
import { Trie } from "../lib/trie.js";
import { cosine } from "../lib/embeddings.js";

// timing helper: run `fn` `iters` times, return nanoseconds per op
function perOp(iters: number, fn: (i: number) => void): number {
  // warm up (let the JIT settle) so numbers aren't first-call noise
  for (let i = 0; i < Math.min(iters, 1000); i++) fn(i);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iters; i++) fn(i);
  const t1 = process.hrtime.bigint();
  return Number(t1 - t0) / iters;
}

const fmt = (ns: number) => (ns >= 1000 ? `${(ns / 1000).toFixed(2)} µs` : `${ns.toFixed(0)} ns`);

// Build a realistic fact space: N subjects × 3 attributes = 3N canonical keys.
function makeKeys(subjects: number): string[] {
  const attrs = ["sell_price", "cost_price", "reorder_level"];
  const keys: string[] = [];
  for (let s = 0; s < subjects; s++) for (const a of attrs) keys.push(`product.item${s}.${a}`);
  return keys;
}

// ── Tier 1: trie vs. naive array, across growing fact counts ────────────────
console.log("\nTier 1 — structured facts (canonical-key trie)\n");
console.log("facts | trie lookup | array lookup | trie overwrite | trie prefix-recall");
console.log("------|-------------|--------------|----------------|-------------------");

for (const subjects of [100, 1000, 10000]) {
  const keys = makeKeys(subjects);
  const n = keys.length;

  // trie index
  const trie = new Trie<number>();
  keys.forEach((k, i) => trie.insert(k, i));

  // naive baseline: a flat array of {key,value}, searched by linear scan
  const arr = keys.map((k, i) => ({ key: k, value: i }));

  const probe = keys[Math.floor(n / 2)]; // a middle key (worst-ish case for the scan)
  const ITERS = 200_000;

  const trieLookup = perOp(ITERS, () => { trie.search(probe); });
  const arrLookup = perOp(ITERS, () => { arr.find((e) => e.key === probe); });
  const trieOverwrite = perOp(ITERS, (i) => { trie.insert(probe, i); }); // overwrite in place
  const subjectPrefix = `product.item${Math.floor(subjects / 2)}`; // one subject's 3 attrs
  const triePrefix = perOp(50_000, () => { trie.startsWith(subjectPrefix); });

  console.log(
    `${String(n).padStart(5)} | ${fmt(trieLookup).padStart(11)} | ${fmt(arrLookup).padStart(12)} | ${fmt(trieOverwrite).padStart(14)} | ${fmt(triePrefix)}`
  );
}

// ── Tier 2: vector recall scoring cost, at real embedding width ─────────────
console.log("\nTier 2 — vector recall (cosine over candidates, 1024-d)\n");

const DIM = 1024; // text-embedding-v4 width
const CANDIDATE_FETCH = 400; // matches memory.ts
function randVec(): number[] { return Array.from({ length: DIM }, () => Math.random() * 2 - 1); }

const query = randVec();
const cands = Array.from({ length: CANDIDATE_FETCH }, randVec);
const scoreAll = perOp(2000, () => { for (const c of cands) cosine(query, c); });
console.log(`Scoring ${CANDIDATE_FETCH} candidates × ${DIM}-d per recall: ${fmt(scoreAll)}  (${(scoreAll / 1000 / CANDIDATE_FETCH).toFixed(3)} µs / candidate)`);

// ── Tier 2: the "critical few" context guarantee (arithmetic on real constants)
console.log("\nTier 2 — critical-few context budget (by design)\n");
const MAX_PER_SHOP = 600; // memory.ts cap
const CHAR_BUDGET = 720; // memory.ts injection budget
const AVG_MEM_CHARS = 90; // typical extracted memory (<=140 hard cap)
const rawAtCap = MAX_PER_SHOP * AVG_MEM_CHARS;
const reduction = (1 - CHAR_BUDGET / rawAtCap) * 100;
console.log(`A shop at the ${MAX_PER_SHOP}-memory cap holds ~${rawAtCap.toLocaleString()} chars of raw memory.`);
console.log(`Recall injects at most ${CHAR_BUDGET} chars (~${Math.round(CHAR_BUDGET / 4)} tokens) of the MOST relevant, `
  + `diverse memories → ${reduction.toFixed(1)}% less context, bounded regardless of shop size.`);
console.log("");
