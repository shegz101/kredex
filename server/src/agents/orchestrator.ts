import OpenAI from "openai";
import { qwen, MODELS } from "../lib/qwen.js";
import { ShopModel } from "../models/index.js";
import { classify, type Intent } from "../lib/classifier.js";
import { toolDefs, executeTool } from "./tools.js";

/**
 * The agent loop (multi-agent routing in one place):
 *   1. Local classifier guesses intent (cheap, no LLM).
 *   2. Qwen (agent model) sees the message + the available tools and decides
 *      which to call, with what arguments. We run the tool against MongoDB and
 *      feed the result back. Repeat until Qwen stops asking for tools.
 *   3. A final streamed call turns the tool results into a friendly,
 *      Pidgin-aware reply, token by token (feels instant in the UI).
 */

export interface ActionEvent {
  name: string;
  args: any;
  result: any;
}

export interface RunAgentOptions {
  message: string;
  shopId: string;
  /** Prior conversation turns (text only) for short-term memory/continuity. */
  history?: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  onIntent?: (intent: Intent) => void;
  onAction?: (action: ActionEvent) => void;
  onToken?: (token: string) => void;
}

function systemPrompt(shopName: string, currency: string): string {
  const today = new Date().toDateString();
  return [
    `You are Kredex, an AI financial assistant for "${shopName}", a small African business. Today is ${today}.`,
    `The owner speaks plain English and Nigerian Pidgin. Mirror their tone; be warm, brief, and concrete.`,
    `Currency is ${currency}. Always format money with the currency (e.g. ${currency} 4,250).`,
    `Use the provided tools to log stock, record sales (cash or credit), record payments, record running-cost expenses, and answer questions about debts, stock, and the day's summary.`,
    `If the owner sets a reorder level ("warn me when rice is below 10"), pass it as lowStockAt on log_stock. Treat "I paid for transport/rent/fuel" as record_expense, not a stock purchase. To bill someone or "send an invoice", use create_invoice and tell them the invoice number. When invoicing, if an item isn't in stock and no price is given, ASK the owner for the unit price first — never invoice at zero. If the owner gives a customer's phone number, call save_customer_phone so reminders can reach them. For anything the owner wants reminding about later ("remind me to call Alhaji Friday", "I borrowed from Musa, pay back Friday"), call set_reminder with the task and an ISO date.`,
    `Extract item names, quantities, prices, and customer names from natural sentences. If a sale doesn't say cash or credit, assume cash unless they mention a person taking goods to "pay later".`,
    `After a tool runs, confirm what happened in one or two short sentences. If a tool returns an "error" or "warnings", tell the owner plainly.`,
    `Never invent numbers — only state what the tools return.`,
  ].join(" ");
}

export async function runAgent(opts: RunAgentOptions): Promise<{ reply: string; actions: ActionEvent[] }> {
  const { message, shopId, history = [], onIntent, onAction, onToken } = opts;

  const intent = classify(message);
  onIntent?.(intent);

  const shop = await ShopModel.findById(shopId);
  const shopName = shop?.name ?? "your shop";
  const currency = shop?.currency ?? "NGN";

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(shopName, currency) },
    ...history,
    { role: "user", content: message },
  ];

  const actions: ActionEvent[] = [];

  // ---- Phase 1: resolve tools (non-streamed) ----
  for (let round = 0; round < 4; round++) {
    const res = await qwen.chat.completions.create({
      model: MODELS.agent,
      messages,
      tools: toolDefs,
      tool_choice: "auto",
      temperature: 0.2,
    });

    const msg = res.choices[0].message;
    if (!msg.tool_calls || msg.tool_calls.length === 0) break; // no (more) tools needed

    messages.push(msg); // assistant message carrying the tool calls
    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      let args: any = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        /* leave as {} */
      }
      const result = await executeTool(call.function.name, args, { shopId });
      const action: ActionEvent = { name: call.function.name, args, result };
      actions.push(action);
      onAction?.(action);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  // ---- Phase 2: stream the final natural-language reply (no tools) ----
  const stream = await qwen.chat.completions.create({
    model: MODELS.agent,
    messages,
    temperature: 0.4,
    stream: true,
  });

  let reply = "";
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? "";
    if (token) {
      reply += token;
      onToken?.(token);
    }
  }

  return { reply, actions };
}
