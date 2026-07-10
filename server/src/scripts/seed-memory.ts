import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db.js";
import { ShopModel, UserModel, MemoryModel } from "../models/index.js";
import { rememberFromTurn, recallDetailed, listMemories, memoryStats } from "../services/memory.js";

/**
 * Seeds a shop's long-term memory by running a realistic demo conversation
 * through the REAL pipeline (Qwen extraction + embeddings + dedup) — nothing is
 * hand-inserted. Then it runs a few live recalls to show the scoring at work.
 *
 * Run with:  npm --prefix server exec tsx src/scripts/seed-memory.ts
 * Optional:  SHOP="Olusegun enterprises" to target a specific shop by name.
 */

// A shop owner talking to Kredex over several sessions. Durable knowledge is
// mixed with transient chatter on purpose — the extractor should keep the
// former and ignore the latter.
const CONVO: { user: string; assistant: string }[] = [
  {
    user: "Hi. I run a foodstuff and provisions shop here in Lagos. I usually close at 8pm, but on Fridays I close by 4pm for prayers.",
    assistant: "Got it — noted your hours: 8pm on weekdays, and you close early by 4pm on Fridays.",
  },
  {
    user: "Tunde is one of my regulars. He always buys on credit and clears it at the end of every month. He's never defaulted.",
    assistant: "Understood. Tunde buys on credit and settles monthly, reliably.",
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
    user: "I sold 3 bags of rice today for 45,000 naira total. Just letting you know.",
    assistant: "Recorded that sale in today's ledger.",
  },
  {
    user: "Also, talk to me in simple English, and send me a summary of who owes me every Monday morning.",
    assistant: "Noted your preferences: simple English, and a weekly debtors summary every Monday morning.",
  },
];

const RECALL_QUERIES = [
  "how does Tunde pay?",
  "what time do I close on Fridays?",
  "who supplies my rice and what are the terms?",
  "what should I restock and when?",
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

  // fresh start so the demo is reproducible
  const cleared = await MemoryModel.deleteMany({ shopId });
  console.log(`🧹  Cleared ${cleared.deletedCount} existing memories.\n`);

  console.log("💬  Running the demo conversation through the extractor…");
  for (const [i, turn] of CONVO.entries()) {
    await rememberFromTurn(shopId, turn.user, turn.assistant);
    process.stdout.write(`   turn ${i + 1}/${CONVO.length} ✓\n`);
  }

  const stats = await memoryStats(shopId);
  console.log(`\n🧠  Stored ${stats.total} memories:`, stats.kinds);

  const mems = await listMemories(shopId);
  console.log("\n📋  Stored memories (by importance):");
  for (const m of mems) {
    console.log(`   [${m.kind.padEnd(10)}] imp ${String(m.importance).padStart(4)}  · ${m.text}`);
  }

  console.log("\n🔎  Live recall (score = cosine × importance × recency, MMR-selected):");
  for (const q of RECALL_QUERIES) {
    const hits = await recallDetailed(shopId, q, 4);
    console.log(`\n   Q: "${q}"`);
    if (!hits.length) console.log("      (nothing crossed the relevance gate)");
    for (const h of hits) console.log(`      ${h.score.toFixed(3)}  · ${h.text}`);
  }

  console.log("\n✅  Done. Open the Memory page to see it populated.\n");
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
