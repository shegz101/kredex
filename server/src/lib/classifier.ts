/**
 * Local keyword classifier — runs in <1ms with NO LLM cost.
 *
 * It can't extract structured data (that's the LLM's job), but it gives a cheap
 * first guess at intent. We pass that guess to the agent as a hint (improves
 * accuracy + speed) and surface it in the UI ("⚡ understood locally as…").
 * It understands plain English AND Nigerian Pidgin keywords.
 */
export type Intent =
  | "log_stock"
  | "sale"
  | "credit_sale"
  | "payment"
  | "query_debt"
  | "query_stock"
  | "summary"
  | "chat";

const RULES: Array<{ intent: Intent; words: string[] }> = [
  { intent: "summary", words: ["summary", "today", "how my shop", "wetin my shop", "situation", "report", "overview"] },
  { intent: "payment", words: ["paid", "pay me", "don pay", "settled", "cleared", "payment", "dey pay"] },
  { intent: "query_debt", words: ["who owe", "who dey owe", "how much owe", "debt", "owing", "outstanding", "owes"] },
  { intent: "credit_sale", words: ["credit", "go pay", "on tick", "pay later", "borrow", "carry", "lend"] },
  { intent: "query_stock", words: ["how many", "stock", "remaining", "left", "low", "run out", "finish", "remain"] },
  { intent: "log_stock", words: ["bought", "buy", "got", "restock", "add stock", "supplied", "i get", "i carry from"] },
  { intent: "sale", words: ["sold", "sell", "sale", "bought from me", "cash"] },
];

export function classify(message: string): Intent {
  const text = message.toLowerCase();
  for (const rule of RULES) {
    if (rule.words.some((w) => text.includes(w))) return rule.intent;
  }
  return "chat";
}
