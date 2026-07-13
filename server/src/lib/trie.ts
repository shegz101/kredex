/**
 * Trie (prefix tree) for Kredex's structured memory.
 *
 * We store canonical, dotted keys — e.g.
 *     product.rice.sell_price   -> 1000
 *     product.rice.cost_price   -> 600
 *     customer.tunde.pays_on    -> "Fridays"
 *
 * This is a SEGMENT trie: we split the key on "." and each SEGMENT
 * ("product", "rice", "sell_price") is one edge in the tree. So the three
 * facts above share the path  root -> product -> rice, then branch into
 * sell_price / cost_price. That shared path is the whole point: it makes
 * "everything about rice" a single subtree walk, and overwriting one price a
 * single O(depth) write.
 *
 * Why a trie here (and NOT for the fuzzy/semantic memory):
 *   • overwrite an exact fact in O(key length), regardless of how many facts exist
 *   • "give me everything under product.rice.*" = collect the leaves of a subtree
 *   • deterministic: a key exists or it doesn't — no similarity threshold
 * Fuzzy recall ("which customers are unreliable?") still belongs to embeddings.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * YOU are writing the four method bodies below. Each has the algorithm spelled
 * out in words + the complexity. Fill in the TODOs; ping me to reveal any one
 * method if you get stuck, or to check your version.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** One node = one segment of a key. The root is an empty segment. */
class TrieNode<V> {
  /** segment -> child node, e.g. "rice" -> (the rice node) */
  children = new Map<string, TrieNode<V>>();
  /** set ONLY when a full key ends here — i.e. this node holds a stored fact */
  value?: V;
  /** the full dotted key that ends here (handy when collecting a subtree) */
  key?: string;
}

/** An entry returned by prefix/collect operations. */
export interface TrieEntry<V> {
  key: string;
  value: V;
}

export class Trie<V = unknown> {
  private root = new TrieNode<V>();

  /** Split "product.rice.sell_price" -> ["product","rice","sell_price"]. */
  private segments(key: string): string[] {
    return key.split(".").filter(Boolean);
  }

  /**
   * Walk from the root following `key`'s segments and return the node it lands
   * on — or undefined if the path breaks partway (the key/prefix doesn't exist).
   * This is the shared "descend" that search, startsWith, and delete all reuse.
   */
  private nodeAt(key: string): TrieNode<V> | undefined {
    let node: TrieNode<V> | undefined = this.root;
    for (const seg of this.segments(key)) {
      node = node.children.get(seg);
      if (!node) return undefined; // fell off the tree — not present
    }
    return node;
  }

  /**
   * insert(key, value) — create/overwrite the fact at `key`.
   *
   * Algorithm:
   *   1. node = root
   *   2. for each segment in segments(key):
   *        if node has no child for that segment, create an empty TrieNode and
   *        put it in node.children; then descend: node = that child.
   *   3. after the last segment, you're on the node that represents this key:
   *        set node.value = value  and  node.key = key.
   *      (If a value was already there, you just OVERWROTE it — that's the
   *       "rice is now 1000" update, and it's exactly what we want.)
   *
   * Complexity: O(L) where L = number of segments. Independent of total facts.
   */
  insert(key: string, value: V): void {
    let node = this.root;
    for (const seg of this.segments(key)) {
      // descend, creating the child the first time we see this segment
      let next = node.children.get(seg);
      if (!next) {
        next = new TrieNode<V>();
        node.children.set(seg, next);
      }
      node = next;
    }
    // we're on the node that represents the whole key: stamp the fact here.
    // if a value already existed, this line overwrites it — that's the update.
    node.value = value;
    node.key = key;
  }

  /**
   * search(key) — exact lookup. Returns the value, or undefined if absent.
   *
   * Algorithm:
   *   1. node = root
   *   2. for each segment: node = node.children.get(segment).
   *        if it's missing at any point, the key doesn't exist -> return undefined.
   *   3. return node.value  (undefined if this node is only a waypoint, not a leaf).
   *
   * Complexity: O(L).
   */
  search(key: string): V | undefined {
    const node = this.nodeAt(key);
    // node?.value is undefined for a missing key OR for a waypoint that isn't a
    // stored fact (e.g. "product.rice" with no value of its own) — both mean "no fact".
    return node?.value;
  }

  /**
   * startsWith(prefix) — every stored fact under `prefix`, e.g. all of
   * "product.rice.*". Returns [] if the prefix path doesn't exist.
   *
   * Algorithm:
   *   1. Walk from root down the prefix segments (like search). If a segment is
   *      missing, return [] — nothing lives under this prefix.
   *   2. You're now at the "prefix node". Do a DFS from here and collect every
   *      node that has a value (use node.key + node.value for each hit).
   *      A small recursive helper is the clean way — see collect() below.
   *
   * Note: the prefix node itself may hold a value (if `prefix` is also a full
   * stored key). Include it if so.
   *
   * Complexity: O(P + M) — P = prefix length, M = size of the subtree.
   */
  startsWith(prefix: string): TrieEntry<V>[] {
    const node = this.nodeAt(prefix);
    if (!node) return []; // nothing lives under this prefix
    return this.collect(node); // every fact at/under the prefix node
  }

  /**
   * delete(key) — remove the fact at `key`. Returns true if something was removed.
   *
   * Simple, correct version (good enough — pruning is a nice-to-have):
   *   1. Walk to the node for `key` (like search). If missing -> return false.
   *   2. If node.value is undefined -> nothing stored here -> return false.
   *   3. Clear node.value and node.key; return true.
   *
   * Nice-to-have (optional): after clearing, walk back up and delete any node
   * that now has no value AND no children, so the tree doesn't accumulate dead
   * branches. Ask me and we'll do the pruning version together.
   *
   * Complexity: O(L).
   */
  delete(key: string): boolean {
    const node = this.nodeAt(key);
    if (!node || node.value === undefined) return false; // no fact stored here
    node.value = undefined;
    node.key = undefined;
    return true;
  }

  /** All stored facts (whole-tree DFS). Handy for the Memory tab view. */
  entries(): TrieEntry<V>[] {
    return this.collect(this.root);
  }

  /**
   * DFS helper: collect every node at/under `node` that holds a value.
   *
   * Algorithm:
   *   - out = []
   *   - if node.value !== undefined, push { key: node.key!, value: node.value }
   *   - for each child in node.children.values(): concat collect(child) into out
   *   - return out
   */
  private collect(node: TrieNode<V>): TrieEntry<V>[] {
    const out: TrieEntry<V>[] = [];
    if (node.value !== undefined) out.push({ key: node.key!, value: node.value });
    for (const child of node.children.values()) {
      out.push(...this.collect(child)); // recurse into every branch
    }
    return out;
  }
}
