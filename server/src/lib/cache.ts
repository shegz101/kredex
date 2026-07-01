/**
 * Dead-simple in-memory TTL cache for expensive reads (dashboard aggregation,
 * P&L + opportunities which call Qwen / web search). Keeps perceived latency
 * low and cuts repeat LLM cost. Per-process — fine for a single instance; swap
 * for Redis when we scale horizontally.
 */
interface Entry {
  exp: number;
  data: unknown;
}
const store = new Map<string, Entry>();

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.exp) {
    store.delete(key);
    return undefined;
  }
  return e.data as T;
}

export function cacheSet(key: string, data: unknown, ttlMs: number): void {
  store.set(key, { exp: Date.now() + ttlMs, data });
}

/** Drop everything for a shop (call after a write so reads aren't stale). */
export function cacheInvalidateShop(shopId: string): void {
  for (const key of store.keys()) {
    if (key.includes(shopId)) store.delete(key);
  }
}
