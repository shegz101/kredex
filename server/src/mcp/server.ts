import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from "@modelcontextprotocol/sdk/types.js";
import { connectDB } from "../lib/db.js";
import { toolDefs, executeTool } from "../agents/tools.js";
import { recallFacts, upsertFact, listFacts } from "../services/facts.js";
import { recall, remember, listMemories } from "../services/memory.js";

/**
 * Kredex MCP server — exposes a shop's MEMORY and bookkeeping tools over the
 * Model Context Protocol, so any MCP client (e.g. Claude Desktop) can use Kredex
 * as a memory + bookkeeping backend. It binds to ONE shop via KREDEX_SHOP_ID.
 *
 * Design note: the bookkeeping tools are NOT redefined here. We reuse the exact
 * same `toolDefs` + `executeTool` registry that powers the in-app Qwen agent —
 * one source of truth, two front-ends (Qwen function-calling and MCP). On top of
 * that we expose the two-tier memory directly: the trie-backed structured facts
 * and the vector-backed narrative memories, both read AND write.
 *
 * Run:  KREDEX_SHOP_ID=<shopId> npm --prefix server run mcp
 */

const SHOP_ID = process.env.KREDEX_SHOP_ID;

// ---- memory tools (the MemoryAgent surface, exposed over MCP) ----
const memoryTools: Tool[] = [
  {
    name: "recall_facts",
    description:
      "Recall CURRENT structured facts about the shop (prices, supplier terms, phone numbers, reorder levels) relevant to a query. Deterministic trie lookup — authoritative, up to date across all sessions. Use this before answering anything about a specific product/customer/supplier.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "what you want facts about, e.g. 'rice price' or 'Tunde'" } },
      required: ["query"],
    },
  },
  {
    name: "remember_fact",
    description:
      "Store or OVERWRITE a structured fact under a canonical dotted key (category.subject.attribute), e.g. product.rice.sell_price. Overwriting supersedes the old value (kept in history). Use for durable, single-current-value facts.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "canonical dotted key, e.g. product.rice.sell_price" },
        value: { description: "a number for money/quantities, or a short string" },
        unit: { type: "string", description: "e.g. NGN, kg, bag (optional)" },
        label: { type: "string", description: "short human sentence, e.g. 'Rice sells for NGN 34,000'" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "list_facts",
    description: "List ALL of the shop's structured facts, grouped by category and subject. Use to inspect what Kredex knows.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "recall_memories",
    description:
      "Recall narrative, fuzzy memories about the shop (habits, preferences, standing instructions) most relevant to a query — scored by relevance × importance × recency, diversified, and reinforced on use. For associative recall the trie can't answer, e.g. 'which customers are unreliable?'.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "what to recall about the shop" },
        k: { type: "number", description: "max memories to return (default 6)" },
      },
      required: ["query"],
    },
  },
  {
    name: "remember",
    description:
      "Store a durable, narrative memory about the shop (a habit, preference, or standing rule). Near-duplicates are merged and reinforced, not duplicated. Use for messy knowledge that can't be keyed as a structured fact.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "concise third-person fact, under ~140 chars" },
        kind: { type: "string", enum: ["fact", "preference", "event"], description: "default 'fact'" },
        importance: { type: "number", description: "1-5, how critical (default 2)" },
      },
      required: ["text"],
    },
  },
  {
    name: "list_memories",
    description: "List the shop's narrative memories with importance, access count, and recency. Use to inspect the vector tier.",
    inputSchema: { type: "object", properties: {} },
  },
];

// Bookkeeping tools reuse the agent registry verbatim (OpenAI function schema →
// MCP tool schema: parameters IS JSON Schema, so it maps 1:1).
const bookkeepingTools: Tool[] = toolDefs.map((t) => ({
  name: t.function.name,
  description: t.function.description ?? t.function.name,
  inputSchema: (t.function.parameters ?? { type: "object", properties: {} }) as Tool["inputSchema"],
}));

const memoryToolNames = new Set(memoryTools.map((t) => t.name));

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

async function handleMemoryTool(name: string, args: any, shopId: string) {
  switch (name) {
    case "recall_facts":
      return ok({ facts: await recallFacts(shopId, String(args.query ?? "")) });
    case "remember_fact":
      await upsertFact(shopId, { key: String(args.key), value: args.value, unit: args.unit, label: args.label, source: "mcp" });
      return ok({ ok: true, stored: args.key });
    case "list_facts":
      return ok({ facts: await listFacts(shopId) });
    case "recall_memories":
      return ok({ memories: await recall(shopId, String(args.query ?? ""), Number(args.k) || 6) });
    case "remember":
      await remember(shopId, String(args.text ?? ""), args.kind ?? "fact", Number(args.importance) || 2, "mcp");
      return ok({ ok: true });
    case "list_memories":
      return ok({ memories: await listMemories(shopId) });
    default:
      return ok({ error: `Unknown memory tool: ${name}` });
  }
}

async function main() {
  if (!SHOP_ID) {
    console.error("KREDEX_SHOP_ID is required — bind this MCP server to a shop, e.g. KREDEX_SHOP_ID=<id> npm run mcp");
    process.exit(1);
  }
  await connectDB();

  const server = new Server(
    { name: "kredex", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...memoryTools, ...bookkeepingTools],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    try {
      if (memoryToolNames.has(name)) return await handleMemoryTool(name, args, SHOP_ID);
      const result = await executeTool(name, args, { shopId: SHOP_ID });
      return ok(result);
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error running ${name}: ${(err as Error).message}` }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP speaks JSON-RPC over stdout — log ONLY to stderr so we don't corrupt it.
  console.error(`Kredex MCP server ready · shop ${SHOP_ID} · ${memoryTools.length + bookkeepingTools.length} tools`);
}

main().catch((err) => {
  console.error("Kredex MCP server failed to start:", err);
  process.exit(1);
});
