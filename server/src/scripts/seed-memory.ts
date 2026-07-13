import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db.js";
import { ShopModel, UserModel, MemoryModel, FactModel } from "../models/index.js";
import { rememberFromTurn, recallDetailed, listMemories, memoryStats } from "../services/memory.js";
import { rememberFactsFromTurn, recallFacts, listFacts } from "../services/facts.js";

/**
 * Seeds a shop's TWO-TIER long-term memory by running a realistic demo
 * conversation through the REAL pipeline — nothing is hand-inserted:
 *   • Tier 1 (structured facts): canonicalizer → canonical-key trie  (facts.ts)
 *   • Tier 2 (narrative memory): extraction → embeddings → dedup      (memory.ts)
 * Then it runs live recalls against both tiers to show them working.
 *
 * Run with:  npm --prefix server exec tsx src/scripts/seed-memory.ts
 * Optional:  SHOP="Olusegun enterprises" to target a specific shop by name.
 */

// A shop owner talking to Kredex over several sessions. Durable knowledge is
// mixed with transient chatter on purpose — the pipeline should keep the former
// and ignore the latter. Note the mix of STRUCTURED facts (prices, terms, phone
// numbers → Tier 1 trie) and NARRATIVE knowledge (habits, rules → Tier 2).
const CONVO: { user: string; assistant: string }[] = [
  {
    user: "Hi. I run a foodstuff and provisions shop here in Lagos. I usually close at 8pm, but on Fridays I close by 4pm for prayers.",
    assistant: "Got it — noted your hours: 8pm on weekdays, and you close early by 4pm on Fridays.",
  },
  {
    user: "A bag of rice sells for 32,000, and I buy it from my supplier at 28,000. A crate of coke sells for 4,500, I get it at 3,800.",
    assistant: "Saved your prices — rice: sell ₦32,000 / cost ₦28,000; coke: sell ₦4,500 / cost ₦3,800.",
  },
  {
    user: "Tunde is one of my regulars. He always buys on credit and clears it at the end of every month. He's never defaulted. His number is 0803 555 1212.",
    assistant: "Understood — Tunde buys on credit and settles monthly, reliably. Saved his number too.",
  },
  {
    user: "Amaka buys rice in bulk every two weeks for her restaurant. Give her a 5% discount whenever she buys.",
    assistant: "Noted — Amaka gets a 5% bulk discount on her fortnightly rice orders.",
  },
  {
    user: "My main rice supplier is Alhaji Musa at Mile 12. He gives me 7 days to pay and delivers every Tuesday.",
    assistant: "Saved: Alhaji Musa (Mile 12) supplies rice, 7-day payment terms, Tuesday deliveries.",
  },
  {
    user: "Please always remind me to restock garri when it drops below 5 bags — it's my fastest mover and I hate running out.",
    assistant: "Will do — I'll flag garri for restock whenever it falls under 5 bags.",
  },
  {
    user: "One rule: never sell anything below cost. I want at least a 15% margin on everything I sell.",
    assistant: "Understood — minimum 15% margin, never below cost.",
  },
  {
    user: "I sold 3 bags of rice today for 96,000 naira total. Just letting you know.",
    assistant: "Recorded that sale in today's ledger.",
  },
  {
    user: "Also, talk to me in simple English, and send me a summary of who owes me every Monday morning.",
    assistant: "Noted your preferences: simple English, and a weekly debtors summary every Monday morning.",
  },
  {
    // A LATER session correcting an earlier fact — demonstrates in-place overwrite
    // (the old ₦32,000 is pushed to history; the trie now returns ₦34,000).
    user: "Rice price just went up. I now sell a bag of rice for 34,000.",
    assistant: "Updated — a bag of rice now sells for ₦34,000 (was ₦32,000).",
  },
];

const RECALL_QUERIES = [
  "how does Tunde pay?",
  "what time do I close on Fridays?",
  "who supplies my rice and what are the terms?",
  "what should I restock and when?",
];

// queries aimed at the structured (Tier 1) fact store
const FACT_QUERIES = [
  "how much do I sell and buy rice for?",
  "what is the price of coke?",
  "what is Tunde's phone number?",
];

async function main() {
  await connectDB();

  const wanted = process.env.SHOP?.trim();
  let shop = wanted
    ? await ShopModel.findOne({ name: new RegExp(wanted, "i") })
    : await ShopModel.findOne().sort({ createdAt: 1 });

  // If the DB has no shop (e.g. a fresh local DB), create a demo owner + shop
  // so the seed works out of the box. Login: demo@kredex.xyz / demo1234
  if (!shop) {
    console.log("No shop found — creating a demo owner + shop (demo@kredex.xyz / demo1234).");
    const passwordHash = await bcrypt.hash("demo1234", 10);
    const owner = await UserModel.findOneAndUpdate(
      { email: "demo@kredex.xyz" },
      { $setOnInsert: { name: "Olusegun", email: "demo@kredex.xyz", passwordHash } },
      { new: true, upsert: true }
    );
    shop = await ShopModel.create({
      ownerId: owner._id,
      name: "Olusegun Enterprises",
      type: "Food Stuffs and Provisions",
      currency: "NGN",
      location: "Yaba, Lagos, Nigeria",
    });
  }
  const shopId = String(shop._id);
  console.log(`\n🏪  Seeding memory for: ${shop.name}  (${shopId})`);

  // fresh start so the demo is reproducible — clear BOTH tiers
  const [clearedMem, clearedFacts] = await Promise.all([
    MemoryModel.deleteMany({ shopId }),
    FactModel.deleteMany({ shopId }),
  ]);
  console.log(`🧹  Cleared ${clearedMem.deletedCount} memories and ${clearedFacts.deletedCount} facts.\n`);

  console.log("💬  Running the demo conversation through BOTH tiers (facts + memory)…");
  for (const [i, turn] of CONVO.entries()) {
    // exactly what production does on every turn (see chat.routes.ts)
    await rememberFactsFromTurn(shopId, turn.user, turn.assistant); // Tier 1 · structured facts (trie)
    await rememberFromTurn(shopId, turn.user, turn.assistant); //      Tier 2 · narrative memory (vectors)
    process.stdout.write(`   turn ${i + 1}/${CONVO.length} ✓\n`);
  }

  // ---- Tier 1 · structured facts (the canonical-key trie) ----
  const facts = await listFacts(shopId);
  console.log(`\n🗂️   TIER 1 — ${facts.length} structured facts (category · subject · attribute → value):`);
  for (const f of facts) {
    const val = typeof f.value === "number" ? f.value.toLocaleString() : String(f.value);
    const changed = f.changes > 0 ? `  (overwritten ${f.changes}×)` : "";
    console.log(`   ${f.key.padEnd(30)} = ${val}${f.unit ? " " + f.unit : ""}${changed}`);
  }

  console.log("\n🔎  Tier 1 recall — deterministic key/prefix lookup via the trie:");
  for (const q of FACT_QUERIES) {
    const hits = await recallFacts(shopId, q);
    console.log(`\n   Q: "${q}"`);
    if (!hits.length) console.log("      (no matching subject in the query)");
    for (const h of hits) {
      const val = typeof h.value === "number" ? h.value.toLocaleString() : String(h.value);
      console.log(`      ${h.key}  →  ${val}${h.unit ? " " + h.unit : ""}`);
    }
  }

  // ---- Tier 2 · narrative memory (vectors) ----
  const stats = await memoryStats(shopId);
  console.log(`\n🧠  TIER 2 — stored ${stats.total} narrative memories:`, stats.kinds);

  const mems = await listMemories(shopId);
  console.log("\n📋  Narrative memories (by importance):");
  for (const m of mems) {
    console.log(`   [${m.kind.padEnd(10)}] imp ${String(m.importance).padStart(4)}  · ${m.text}`);
  }

  console.log("\n🔎  Tier 2 recall (score = cosine × importance × recency, MMR-selected):");
  for (const q of RECALL_QUERIES) {
    const hits = await recallDetailed(shopId, q, 4);
    console.log(`\n   Q: "${q}"`);
    if (!hits.length) console.log("      (nothing crossed the relevance gate)");
    for (const h of hits) console.log(`      ${h.score.toFixed(3)}  · ${h.text}`);
  }

  console.log("\n✅  Done. Open the Memory page to see both tiers populated.\n");
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
