import { qwen, MODELS } from "../lib/qwen.js";

/**
 * Smoke test for the ONE dependency that must work: the Qwen API.
 * Run it with:  npm --prefix server run ping:qwen
 */
async function main() {
  console.log(`Pinging Qwen (${MODELS.agent})...`);
  const res = await qwen.chat.completions.create({
    model: MODELS.agent,
    messages: [
      { role: "system", content: "You are Kredex, a helpful assistant for Nigerian shop owners." },
      { role: "user", content: "Reply in one short sentence to confirm you are working." },
    ],
  });
  console.log("✅ Qwen replied:", res.choices[0]?.message?.content);
}

main().catch((err) => {
  console.error("❌ Qwen ping failed:", err?.message ?? err);
  process.exit(1);
});
