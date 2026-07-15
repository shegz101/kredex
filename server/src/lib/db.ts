import mongoose from "mongoose";
import { env } from "../config/env.js";

/**
 * Connect to MongoDB once at startup.
 *
 * MongoDB stores "documents" (JSON-like objects) inside "collections"
 * (think: a table, but every row is a flexible object). We talk to it
 * through Mongoose, which lets us define a Schema (the shape of a document)
 * and a Model (the thing we call .find() / .create() on).
 */
export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () =>
    console.log("✅ MongoDB connected")
  );
  mongoose.connection.on("error", (err) =>
    console.error("❌ MongoDB error:", err.message)
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("⚠️  MongoDB disconnected — driver will auto-reconnect")
  );

  // The driver buffers commands and auto-reconnects through brief blips; a short
  // server-selection timeout means a real outage fails a request fast (clean 500)
  // instead of hanging, while transient hiccups are absorbed transparently.
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 45_000,
  });
}
