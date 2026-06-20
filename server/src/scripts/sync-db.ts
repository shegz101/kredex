import mongoose from "mongoose";
import { connectDB } from "../lib/db.js";
import * as models from "../models/index.js";

/**
 * Ensures every collection exists and every index we declared is built.
 * Safe to run anytime. Run with:  npm --prefix server run db:sync
 */
async function main() {
  await connectDB();

  const modelList = [
    models.UserModel,
    models.ShopModel,
    models.CustomerModel,
    models.InventoryItemModel,
    models.DebtModel,
    models.TransactionModel,
  ];

  for (const m of modelList) {
    await m.createCollection().catch(() => {}); // no-op if it already exists
    await m.syncIndexes();
    console.log(`  ✅ ${m.collection.collectionName}`);
  }

  const cols = await mongoose.connection.db!.listCollections().toArray();
  console.log("\nCollections in 'kredex':", cols.map((c) => c.name).sort().join(", "));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ sync-db failed:", err);
  process.exit(1);
});
