import express from "express";
import cors from "cors";
import cron from "node-cron";
import compression from "compression";
import { env } from "./config/env.js";
import { apiLimiter, aiLimiter } from "./lib/rateLimit.js";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import autopilotRoutes from "./routes/autopilot.routes.js";
import receiptRoutes from "./routes/receipt.routes.js";
import pnlRoutes from "./routes/pnl.routes.js";
import invoicesRoutes from "./routes/invoices.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import remindersRoutes from "./routes/reminders.routes.js";
import voiceRoutes from "./routes/voice.routes.js";
import opportunitiesRoutes from "./routes/opportunities.routes.js";
import { runDueShops } from "./services/autopilot.js";

const app = express();

// gzip responses, but never buffer the SSE chat stream
app.use(
  compression({
    filter: (req, res) => {
      const ct = res.getHeader("Content-Type");
      if (typeof ct === "string" && ct.includes("text/event-stream")) return false;
      return compression.filter(req, res);
    },
  })
);
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// generous catch-all rate limit across the whole API
app.use("/api", apiLimiter);

// Health check — a simple "is the server alive?" endpoint.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "kredex-server", time: new Date().toISOString() });
});

// Auth: register / login / me
app.use("/api/auth", authRoutes);

// Chat: the AI agent spine (SSE streaming)
app.use("/api/chat", aiLimiter, chatRoutes);

// Dashboard: live aggregated shop data
app.use("/api/dashboard", dashboardRoutes);

// Autopilot: background scanners + human-in-the-loop approval feed
app.use("/api/autopilot", autopilotRoutes);

// Receipt OCR: photo -> Qwen vision -> structured items
app.use("/api/receipt", aiLimiter, receiptRoutes);

// P&L: real profit + a Qwen-written "are you making money?" verdict
app.use("/api/pnl", aiLimiter, pnlRoutes);

// Invoices: create, list, mark paid, download PDF
app.use("/api/invoices", invoicesRoutes);

// Settings: shop profile, low-stock default, change password
app.use("/api/settings", settingsRoutes);

// Reminders: personal nudges the autopilot surfaces when due
app.use("/api/reminders", remindersRoutes);

// Voice: speech-to-text (speak-to-log)
app.use("/api/voice", aiLimiter, voiceRoutes);

// Opportunity Scout: location-aware loans, grants, programs, events
app.use("/api/opportunities", aiLimiter, opportunitiesRoutes);

/**
 * The autopilot's heartbeat. These run server-wide on a schedule and raise
 * approvals for every shop. (For the demo, POST /api/autopilot/scan triggers
 * the same scanners on demand so you don't have to wait for the clock.)
 */
function scheduleAutopilot() {
  // One heartbeat: every 5 minutes we run each shop whose autopilot is due,
  // on the cadence (and at the autonomy level) that shop's owner chose.
  cron.schedule("*/5 * * * *", runDueShops);
  console.log("🛰️  Autopilot heartbeat scheduled (every 5m · per-shop intervals)");
}

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error("⚠️  Could not connect to MongoDB — starting anyway so /api/health works.");
    console.error("   ", (err as Error).message);
  }

  scheduleAutopilot();

  app.listen(env.PORT, () => {
    console.log(`🚀 Kredex server on http://localhost:${env.PORT}`);
  });
}

start();
