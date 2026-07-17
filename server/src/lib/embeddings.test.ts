import { test } from "node:test";
import assert from "node:assert/strict";
import { cosine } from "./embeddings.js";

/**
 * Tests for cosine() — the similarity math behind Tier 2 (vector) recall.
 * Pure function; no network. Guards the scoring that ranks which memories
 * are the "critical few" worth injecting into a limited context window.
 */

test("cosine: identical vectors score 1", () => {
  assert.equal(cosine([1, 2, 3], [1, 2, 3]), 1);
});

test("cosine: parallel vectors (same direction) score 1 regardless of magnitude", () => {
  assert.ok(Math.abs(cosine([1, 0, 0], [5, 0, 0]) - 1) < 1e-9);
});

test("cosine: orthogonal vectors score 0", () => {
  assert.equal(cosine([1, 0], [0, 1]), 0);
});

test("cosine: opposite vectors score -1", () => {
  assert.ok(Math.abs(cosine([1, 1], [-1, -1]) - -1) < 1e-9);
});

test("cosine: a more-similar pair outranks a less-similar pair (ranking property)", () => {
  const query = [1, 1, 0];
  const near = [1, 0.9, 0.1];
  const far = [0, 0, 1];
  assert.ok(cosine(query, near) > cosine(query, far));
});

test("cosine: an all-zero vector yields 0 instead of NaN (guarded divide)", () => {
  assert.equal(cosine([0, 0, 0], [1, 2, 3]), 0);
});

test("cosine: mismatched lengths compare over the shared prefix without throwing", () => {
  assert.equal(cosine([1, 2, 3, 999], [1, 2, 3]), 1);
});
