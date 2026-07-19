import { FactModel } from "../models/index.js";
import { qwen, MODELS } from "../lib/qwen.js";
import { Trie } from "../lib/trie.js";

/**
 * Tier 1 memory — STRUCTURED, overwriteable facts under canonical dotted keys.
 *
 * Flow:
 *   WRITE:  a turn → canonicalizer (LLM) → {key, value} facts → upsert (overwrite
 *           + push old value to history) → invalidate this shop's cached Trie.
 *   READ:   build (or reuse) the shop's Trie from Mongo → detect which subjects
 *           the query mentions → prefix-walk the Trie for each → deterministic hits.
 *
 * The Trie (lib/trie.ts) is the in-memory index; FactModel is the source of truth.
 */

export interface StoredFact {
  key: string;
  value: string | number;
  unit?: string;
  label?: string;
}

// ---------------------------------------------------------------------------
// Per-shop Trie cache (rebuilt from Mongo, invalidated on write)
// ---------------------------------------------------------------------------

interface ShopIndex {
  trie: Trie<StoredFact>;
  /** subjects present (e.g. "rice", "tunde") → their key prefixes ("product.rice") */
  subjectPrefixes: Map<string, Set<string>>;
  builtAt: number;
}

const cache = new Map<string, ShopIndex>();
const TTL_MS = 60_000; // rebuild at most once a minute even if not explicitly invalidated

/** Drop a shop's cached index so the next read rebuilds it (call after any write). */
export function invalidate(shopId: string): void {
  cache.delete(shopId);
}

/** Load a shop's facts from Mongo and build the Trie + subject index. */
async function buildIndex(shopId: string): Promise<ShopIndex> {
  const facts = await FactModel.find({ shopId }).select("key value unit label subject category");
  const trie = new Trie<StoredFact>();
  const subjectPrefixes = new Map<string, Set<string>>();

  for (const f of facts) {
    trie.insert(f.key, { key: f.key, value: f.value as any, unit: f.unit ?? undefined, label: f.label ?? undefined });
    if (f.subject && f.category) {
      const set = subjectPrefixes.get(f.subject) ?? new Set<string>();
      set.add(`${f.category}.${f.subject}`); // the prefix that gathers ALL of this subject's attributes
      subjectPrefixes.set(f.subject, set);
    }
  }
  const index: ShopIndex = { trie, subjectPrefixes, builtAt: Date.now() };
  cache.set(shopId, index);
  return index;
}

async function getIndex(shopId: string): Promise<ShopIndex> {
  const hit = cache.get(shopId);
  if (hit && Date.now() - hit.builtAt < TTL_MS) return hit;
  return buildIndex(shopId);
}

// ---------------------------------------------------------------------------
// WRITE: upsert a fact (atomic overwrite + history)
// ---------------------------------------------------------------------------

/** Split "product.rice.sell_price" → {category:"product", subject:"rice", attribute:"sell_price"}. */
function parts(key: string): { category?: string; subject?: string; attribute?: string } {
  const s = key.split(".").filter(Boolean);
  return { category: s[0], subject: s.slice(1, -1).join(".") || s[1], attribute: s[s.length - 1] };
}

export async function upsertFact(shopId: string, f: StoredFact & { source?: string }): Promise<void> {
  const key = f.key.trim().toLowerCase();
  if (!key.includes(".")) return; // not a canonical key — ignore
  const { category, subject, attribute } = parts(key);

  const existing = await FactModel.findOne({ shopId, key }).select("value unit updatedAt");
  const changed = existing && String(existing.value) !== String(f.value);

  await FactModel.updateOne(
    { shopId, key },
    {
      $set: {
        value: f.value,
        unit: f.unit,
        label: f.label ?? "",
        category,
        subject,
        attribute,
        source: f.source ?? "extracted",
      },
      // when the value actually changes, keep the old one as history ("used to be…")
      ...(changed ? { $push: { history: { value: existing!.value, unit: existing!.unit, at: existing!.updatedAt ?? new Date() } } } : {}),
    },
    { upsert: true }
  );
  invalidate(shopId);
}

// ---------------------------------------------------------------------------
// WRITE: canonicalizer — turn a turn into structured facts
// ---------------------------------------------------------------------------

const CANON_SYS = `You convert a shop owner's message into STRUCTURED, updatable facts about their business.
Only extract facts that have a clear subject and a single CURRENT value that could later change or be corrected:
selling price, cost price, stock reorder level, a customer's usual payment day, phone numbers, opening/closing hours, or a standing rule tied to a subject.
DO NOT extract one-off events, quantities of a single sale, greetings, or questions.

Key format: category.subject.attribute — all lowercase snake_case, joined by dots.
  categories: product | customer | supplier | shop
  examples of attribute: sell_price, cost_price, reorder_level, pays_on, phone, closes_at
value: a NUMBER for money/quantities (no commas, no currency symbol) or a short string otherwise.
unit: "NGN", "kg", "bag", etc. when relevant, otherwise omit.
label: a short human sentence, e.g. "Rice sells for NGN 1,000".

Return ONLY JSON: {"facts":[{"key":"...","value":...,"unit":"...","label":"..."}]}. Return {"facts":[]} if none.

Examples:
"I sell a bag of rice for 32000, I buy at 28000" ->
{"facts":[{"key":"product.rice.sell_price","value":32000,"unit":"NGN","label":"Rice sells for NGN 32,000/bag"},{"key":"product.rice.cost_price","value":28000,"unit":"NGN","label":"Rice costs NGN 28,000/bag"}]}
"Tunde always pays me on Fridays" ->
{"facts":[{"key":"customer.tunde.pays_on","value":"Friday","label":"Tunde usually pays on Fridays"}]}
"warn me when rice drops below 10 bags" ->
{"facts":[{"key":"product.rice.reorder_level","value":10,"unit":"bag","label":"Reorder rice below 10 bags"}]}`;

function extractJson(text: string): any {
  const t = text.replace(/```json\s*|\s*```/g, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("no json");
  return JSON.parse(t.slice(a, b + 1));
}

/**
 * Extract structured facts from a turn and upsert them. Safe to fire-and-forget.
 *
 * IMPORTANT: we canonicalize ONLY the owner's own message — never Kredex's reply.
 * Facts are the owner's ground truth; feeding the assistant's text back in let its
 * guesses launder into stored facts (e.g. a hallucinated "Amaka pays on Wednesdays"
 * being saved as customer.amaka.pays_on), and confused the model into emitting
 * malformed JSON that silently dropped real updates like a new selling price. The
 * `_assistantMsg` param is kept for call-site compatibility but intentionally unused.
 */
export async function rememberFactsFromTurn(shopId: string, userMsg: string, _assistantMsg = ""): Promise<void> {
  try {
    const res = await qwen.chat.completions.create({
      model: MODELS.agent,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: CANON_SYS },
        { role: "user", content: `Owner said: ${userMsg}`.slice(0, 2000) },
      ],
    });
    const parsed = extractJson(res.choices[0]?.message?.content ?? "");
    const facts: any[] = Array.isArray(parsed.facts) ? parsed.facts : [];
    for (const f of facts.slice(0, 8)) {
      if (f?.key && f?.value !== undefined && f?.value !== null) {
        await upsertFact(shopId, { key: String(f.key), value: f.value, unit: f.unit, label: f.label });
      }
    }
  } catch (err) {
    console.error("facts.rememberFactsFromTurn failed:", (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// READ: recall structured facts relevant to a query (deterministic, via the Trie)
// ---------------------------------------------------------------------------

/**
 * Find the facts a query is asking about. We detect which known subjects the
 * query mentions, then PREFIX-WALK the Trie for each ("everything about rice").
 * This is exact and deterministic — no embeddings, no threshold.
 */
export async function recallFacts(shopId: string, query: string): Promise<StoredFact[]> {
  try {
    const { trie, subjectPrefixes } = await getIndex(shopId);
    if (subjectPrefixes.size === 0) return [];
    const ql = ` ${query.toLowerCase()} `;

    const seen = new Set<string>();
    const hits: StoredFact[] = [];
    for (const [subject, prefixes] of subjectPrefixes) {
      if (!ql.includes(` ${subject} `) && !ql.includes(`${subject}`)) continue; // query doesn't mention this subject
      for (const prefix of prefixes) {
        for (const entry of trie.startsWith(prefix)) {
          if (seen.has(entry.value.key)) continue;
          seen.add(entry.value.key);
          hits.push(entry.value);
        }
      }
    }
    return hits;
  } catch (err) {
    console.error("facts.recallFacts failed:", (err as Error).message);
    return [];
  }
}

/** All of a shop's facts, grouped for the Memory tab (category → subject → attributes). */
export async function listFacts(shopId: string) {
  const facts = await FactModel.find({ shopId })
    .select("key category subject attribute value unit label updatedAt history")
    .sort({ category: 1, subject: 1, attribute: 1 });
  return facts.map((f) => ({
    id: String(f._id),
    key: f.key,
    category: f.category,
    subject: f.subject,
    attribute: f.attribute,
    value: f.value,
    unit: f.unit,
    label: f.label,
    updatedAt: f.updatedAt,
    changes: (f.history ?? []).length,
  }));
}
