import { test } from "node:test";
import assert from "node:assert/strict";
import { makeThinkFilter } from "../lib/think-filter.js";

/** Run a filter over a list of streamed chunks and return the visible output. */
function run(chunks: string[]): string {
  let out = "";
  const f = makeThinkFilter((t) => (out += t));
  for (const c of chunks) f.feed(c);
  f.flush();
  return out;
}

test("passes plain content through untouched", () => {
  assert.equal(run(["Bread has been added."]), "Bread has been added.");
});

test("drops a full think block, keeps the answer", () => {
  assert.equal(run(["<think>let me reason</think>The answer."]), "The answer.");
});

test("drops a stray closing tag with no opener (the observed leak)", () => {
  // The exact shape from the screenshot: a lone </think> before the real reply.
  // The filter's job is tag removal; the leading whitespace it exposes is trimmed
  // downstream by the orchestrator's first-token guard, so here we only assert the tag is gone.
  assert.equal(run(["</think>\n\nBread has been added."]), "\n\nBread has been added.");
});

test("catches a tag split across chunk boundaries", () => {
  assert.equal(run(["hi <thi", "nk>secret</thi", "nk> bye"]), "hi  bye");
});

test("catches a closing tag split across chunks", () => {
  assert.equal(run(["<think>a</th", "ink>real"]), "real");
});

test("does not eat text that merely looks like the start of a tag", () => {
  assert.equal(run(["2 < 3 and 4 > 1"]), "2 < 3 and 4 > 1");
});

test("handles content streamed one character at a time", () => {
  const s = "<think>reasoning here</think>Final reply.";
  assert.equal(run([...s]), "Final reply.");
});

test("trims nothing internal — only the think spans", () => {
  assert.equal(run(["A ", "<think>x</think>", "B"]), "A B");
});
