import OpenAI from "openai";
import { env } from "../config/env.js";

/**
 * Qwen is OpenAI-compatible: we use the official OpenAI SDK but point it at
 * Alibaba Cloud's DashScope endpoint. Every Qwen model (chat, vision, OCR,
 * embeddings) is reachable through this one client — we just pass a different
 * `model` name per call.
 */
export const qwen = new OpenAI({
  apiKey: env.QWEN_API_KEY,
  baseURL: env.QWEN_BASE_URL,
});

/** Central place to name the models we use, so swapping versions is one edit. */
export const MODELS = {
  brain: "qwen3.7-max",             // flagship: deep reasoning, thinking, P&L analysis
  agent: "qwen3.5-flash",           // fast + cheap: routing, tool calls, simple logging
  vision: "qwen-vl-max", // vision-language model: reads receipts and returns structured items
  omni: "qwen3.5-omni-flash",       // voice in/out (stretch)
  embedding: "text-embedding-v4",   // fuzzy name/item matching
} as const;
