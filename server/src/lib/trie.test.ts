import { test } from "node:test";
import assert from "node:assert/strict";
import { Trie } from "./trie.js";

/**
 * Tests for the canonical-key trie that powers Tier 1 (structured) memory.
 * Pure data-structure tests — no MongoDB, no Qwen — so they run anywhere.
 * These lock in the three properties the memory story depends on:
 *   1. exact lookup,  2. in-place OVERWRITE,  3. prefix ("everything about X") recall.
 */

test("insert + search: exact lookup returns the stored value", () => {
  const t = new Trie<number>();
  t.insert("product.rice.sell_price", 32000);
  t.insert("product.rice.cost_price", 28000);
  assert.equal(t.search("product.rice.sell_price"), 32000);
  assert.equal(t.search("product.rice.cost_price"), 28000);
});

test("search: a missing key returns undefined", () => {
  const t = new Trie<number>();
  t.insert("product.rice.sell_price", 32000);
  assert.equal(t.search("product.rice.reorder_level"), undefined);
  assert.equal(t.search("product.beans.sell_price"), undefined);
});

test("search: a waypoint that isn't a full key has no value", () => {
  const t = new Trie<number>();
  t.insert("product.rice.sell_price", 32000);
  // "product.rice" is a path node, not a stored fact → no value of its own
  assert.equal(t.search("product.rice"), undefined);
  assert.equal(t.search("product"), undefined);
});

test("insert: writing the same key OVERWRITES in place (the 'rice is now 34,000' case)", () => {
  const t = new Trie<number>();
  t.insert("product.rice.sell_price", 32000);
  t.insert("product.rice.sell_price", 34000); // owner corrects the price
  assert.equal(t.search("product.rice.sell_price"), 34000);
  // overwrite must NOT create a duplicate leaf
  assert.equal(t.startsWith("product.rice.sell_price").length, 1);
});

test("startsWith: prefix walk returns every fact under a subject", () => {
  const t = new Trie<number>();
  t.insert("product.rice.sell_price", 34000);
  t.insert("product.rice.cost_price", 28000);
  t.insert("product.rice.reorder_level", 10);
  t.insert("product.beans.sell_price", 90000); // different subject — must not leak in

  const rice = t.startsWith("product.rice").map((e) => e.key).sort();
  assert.deepEqual(rice, [
    "product.rice.cost_price",
    "product.rice.reorder_level",
    "product.rice.sell_price",
  ]);
});

test("startsWith: an unknown prefix yields nothing (no throw)", () => {
  const t = new Trie<number>();
  t.insert("product.rice.sell_price", 34000);
  assert.deepEqual(t.startsWith("customer.tunde"), []);
  assert.deepEqual(t.startsWith("supplier"), []);
});

test("startsWith: subjects are isolated — 'rice' recall never returns 'beans'", () => {
  const t = new Trie<number>();
  t.insert("product.rice.sell_price", 34000);
  t.insert("product.beans.sell_price", 90000);
  const rice = t.startsWith("product.rice");
  assert.equal(rice.length, 1);
  assert.equal(rice[0].value, 34000);
});

test("delete: removes a fact and leaves siblings intact", () => {
  const t = new Trie<number>();
  t.insert("product.rice.sell_price", 34000);
  t.insert("product.rice.cost_price", 28000);
  assert.equal(t.delete("product.rice.sell_price"), true);
  assert.equal(t.search("product.rice.sell_price"), undefined);
  assert.equal(t.search("product.rice.cost_price"), 28000); // sibling survives
  assert.equal(t.delete("product.rice.sell_price"), false); // already gone
});

test("delete: deleting a non-existent key returns false", () => {
  const t = new Trie<number>();
  t.insert("product.rice.sell_price", 34000);
  assert.equal(t.delete("product.beans.sell_price"), false);
});

test("entries: lists every stored fact across the whole tree", () => {
  const t = new Trie<string>();
  t.insert("product.rice.sell_price", "34000");
  t.insert("customer.tunde.pays_on", "Friday");
  t.insert("shop.opening.closes_at", "8pm");
  const keys = t.entries().map((e) => e.key).sort();
  assert.deepEqual(keys, [
    "customer.tunde.pays_on",
    "product.rice.sell_price",
    "shop.opening.closes_at",
  ]);
});

test("segment trie tolerates stray/empty segments (leading/trailing dots)", () => {
  const t = new Trie<number>();
  t.insert(".product.rice.sell_price.", 34000); // filter(Boolean) drops empties
  assert.equal(t.search("product.rice.sell_price"), 34000);
});
