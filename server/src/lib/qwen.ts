import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";
import type { Stream } from "openai/streaming";
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
 * Detect a DashScope free-quota-exhaustion error so we can react to it
 * intentionally. When a model's free tier runs out (and "Stop-on-Exhaust" is on,
 * or the account has no paid balance), DashScope returns HTTP 403 with a code like
 * `AllocationQuota.FreeTierOnly` / `Throttling.AllocationQuota`. Different models
 * empty at different rates, so a quota error on one model doesn't mean the account
 * is dry — falling back to a model that still has budget keeps the app alive.
 */
export function isQuotaError(err: unknown): boolean {
  const e = err as any;
  const status = e?.status ?? e?.response?.status;
  const code = String(e?.code ?? e?.error?.code ?? "");
  const msg = String(e?.message ?? "");
  return status === 403 || /AllocationQuota|FreeTierOnly|arrearage|insufficient|quota/i.test(code + " " + msg);
}

/**
 * Run a chat completion, and if the primary model errors (after the SDK's own
 * retries), fall back to another model once before giving up. Covers two paths:
 *   - heavy reasoning: qwen3.7-max → qwen3.5-flash (a flaky flagship still answers)
 *   - agent (quota safety): qwen3.5-flash → qwen3.7-max (the flash tier empties
 *     first; the flagship still has budget), so judging never dies on a 403.
 */
export async function completeWithFallback(
  params: ChatCompletionCreateParamsNonStreaming,
  fallbackModel: string
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await qwen.chat.completions.create(params);
  } catch (err) {
    const why = isQuotaError(err) ? "free quota exhausted" : (err as Error).message;
    console.warn(`qwen: ${params.model} failed (${why}), falling back to ${fallbackModel}`);
    return await qwen.chat.completions.create({ ...params, model: fallbackModel });
  }
}

/**
 * Streaming twin of completeWithFallback. Quota exhaustion (403) surfaces at
 * request time — before the first token — so a try/catch around `create` catches
 * it and re-opens the stream on the fallback model. The caller consumes the
 * returned stream identically either way.
 */
export async function streamWithFallback(
  params: ChatCompletionCreateParamsStreaming,
  fallbackModel: string
): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  try {
    return await qwen.chat.completions.create(params);
  } catch (err) {
    const why = isQuotaError(err) ? "free quota exhausted" : (err as Error).message;
    console.warn(`qwen: ${params.model} stream failed (${why}), falling back to ${fallbackModel}`);
    return await qwen.chat.completions.create({ ...params, model: fallbackModel });
  }
}

/** Central place to name the models we use, so swapping versions is one edit. */
export const MODELS = {
  brain: "qwen3.7-max",             // flagship: deep reasoning, thinking, P&L analysis
  agent: "qwen3.5-flash",           // fast + cheap: routing, tool calls, simple logging
  agentFallback: "qwen3.7-max",     // if the flash tier's free quota runs dry, the agent falls back here
  vision: "qwen-vl-max", // vision-language model: reads receipts and returns structured items
  omni: "qwen3.5-omni-flash",       // voice in/out (stretch)
  asr: "qwen3-asr-flash",           // speech-to-text (voice logging)
  tts: "qwen3-tts-flash",           // text-to-speech (Kredex talks back)
  embedding: "text-embedding-v4",   // fuzzy name/item matching
} as const;
