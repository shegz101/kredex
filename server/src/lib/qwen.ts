import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { env } from "../config/env.js";

/**
 * Qwen is OpenAI-compatible: we use the official OpenAI SDK but point it at
 * Alibaba Cloud's DashScope endpoint. Every Qwen model (chat, vision, OCR,
 * embeddings) is reachable through this one client — we just pass a different
 * `model` name per call.
 *
 * Resilience: the SDK auto-retries transient failures (timeouts, 429s, 5xx) with
 * exponential backoff — we set it explicitly so it's intentional, and cap the
 * per-call timeout so a hung upstream fails fast instead of stalling the owner's
 * request. On top of this, callers degrade gracefully (see completeWithFallback,
 * and the empty-array fallbacks in the memory services).
 */
export const qwen = new OpenAI({
  apiKey: env.QWEN_API_KEY,
  baseURL: env.QWEN_BASE_URL,
  maxRetries: 2, // 2 automatic retries w/ exponential backoff on transient errors
  timeout: 30_000, // 30s per call — fail fast rather than hang for minutes
});

/**
 * Run a chat completion, and if the primary model errors (after the SDK's own
 * retries), fall back to a cheaper/faster model once before giving up. Used for
 * the heavy reasoning path (qwen3.7-max → qwen3.5-flash) so a flaky flagship
 * still yields an answer instead of failing the request.
 */
export async function completeWithFallback(
  params: ChatCompletionCreateParamsNonStreaming,
  fallbackModel: string
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await qwen.chat.completions.create(params);
  } catch (err) {
    console.warn(`qwen: ${params.model} failed, falling back to ${fallbackModel}:`, (err as Error).message);
    return await qwen.chat.completions.create({ ...params, model: fallbackModel });
  }
}

/** Central place to name the models we use, so swapping versions is one edit. */
export const MODELS = {
  brain: "qwen3.7-max",             // flagship: deep reasoning, thinking, P&L analysis
  agent: "qwen3.5-flash",           // fast + cheap: routing, tool calls, simple logging
  vision: "qwen-vl-max", // vision-language model: reads receipts and returns structured items
  omni: "qwen3.5-omni-flash",       // voice in/out (stretch)
  asr: "qwen3-asr-flash",           // speech-to-text (voice logging)
  tts: "qwen3-tts-flash",           // text-to-speech (Kredex talks back)
  embedding: "text-embedding-v4",   // fuzzy name/item matching
} as const;
