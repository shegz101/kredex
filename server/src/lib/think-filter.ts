/**
 * Some Qwen models — notably the flagship we fall back to when the flash tier's
 * quota runs out — emit chain-of-thought wrapped in <think>…</think>, and can leak
 * a stray tag into the visible content stream. This filters those out as tokens
 * arrive: it drops anything inside a think block, drops orphan tags, and buffers a
 * possible partial tag across chunk boundaries (a tag split over two deltas is still
 * caught). The owner only ever sees the real answer.
 */
export function makeThinkFilter(onText: (t: string) => void) {
  const OPEN = "<think>";
  const CLOSE = "</think>";
  let inThink = false;
  let carry = "";

  // Longest suffix of s that is a proper prefix of tag (a tag that may complete next chunk).
  const partialLen = (s: string, tag: string) => {
    for (let n = Math.min(s.length, tag.length - 1); n > 0; n--) {
      if (s.slice(s.length - n) === tag.slice(0, n)) return n;
    }
    return 0;
  };

  const feed = (text: string) => {
    carry += text;
    for (;;) {
      if (!inThink) {
        const o = carry.indexOf(OPEN);
        const c = carry.indexOf(CLOSE);
        if (o !== -1 && (c === -1 || o < c)) {
          if (o > 0) onText(carry.slice(0, o));
          carry = carry.slice(o + OPEN.length);
          inThink = true;
          continue;
        }
        if (c !== -1) {
          // stray closing tag with no opener (the leak we saw) — emit before it, drop it
          if (c > 0) onText(carry.slice(0, c));
          carry = carry.slice(c + CLOSE.length);
          continue;
        }
        const keep = Math.max(partialLen(carry, OPEN), partialLen(carry, CLOSE));
        if (carry.length > keep) onText(carry.slice(0, carry.length - keep));
        carry = carry.slice(carry.length - keep);
        return;
      }
      const c = carry.indexOf(CLOSE);
      if (c !== -1) {
        carry = carry.slice(c + CLOSE.length);
        inThink = false;
        continue;
      }
      carry = carry.slice(carry.length - partialLen(carry, CLOSE)); // still thinking: discard
      return;
    }
  };

  // Anything left when not thinking is real content (a partial that never became a tag).
  const flush = () => {
    if (!inThink && carry) onText(carry);
    carry = "";
  };

  return { feed, flush };
}
