import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Throwaway MCP CLIENT that spawns the Kredex MCP server over stdio and drives it
 * exactly as Claude Desktop would: list tools, recall a fact, overwrite it, recall
 * again, then read a narrative memory. Proves the server works end-to-end.
 */

const SHOP_ID = process.env.KREDEX_SHOP_ID!;
const line = (s = "") => console.log(s);

function text(res: any): string {
  return (res?.content ?? []).map((c: any) => c.text ?? "").join("\n");
}

async function main() {
  // The client launches the server as a subprocess and pipes JSON-RPC over stdio.
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/mcp/server.ts"],
    env: { ...process.env, KREDEX_SHOP_ID: SHOP_ID } as Record<string, string>,
  });
  const client = new Client({ name: "kredex-demo-client", version: "0.0.1" }, { capabilities: {} });
  await client.connect(transport); // performs the MCP handshake (initialize)

  line("──────────────────────────────────────────────────────");
  line("1) tools/list  — what the server advertises");
  line("──────────────────────────────────────────────────────");
  const { tools } = await client.listTools();
  line(`   ${tools.length} tools exposed:`);
  for (const t of tools) line(`     • ${t.name}`);

  line("");
  line("──────────────────────────────────────────────────────");
  line('2) recall_facts { query: "rice price" }  — Tier 1 read');
  line("──────────────────────────────────────────────────────");
  line(text(await client.callTool({ name: "recall_facts", arguments: { query: "rice price" } })));

  line("");
  line("──────────────────────────────────────────────────────");
  line('3) remember_fact — OVERWRITE rice sell price → 40,000');
  line("──────────────────────────────────────────────────────");
  line(text(await client.callTool({
    name: "remember_fact",
    arguments: { key: "product.rice.sell_price", value: 40000, unit: "NGN", label: "Rice sells for NGN 40,000" },
  })));

  line("");
  line("──────────────────────────────────────────────────────");
  line('4) recall_facts { query: "rice price" }  — proves the overwrite');
  line("──────────────────────────────────────────────────────");
  line(text(await client.callTool({ name: "recall_facts", arguments: { query: "rice price" } })));

  line("");
  line("──────────────────────────────────────────────────────");
  line('5) recall_memories { query: "how does Tunde pay?" }  — Tier 2 read');
  line("──────────────────────────────────────────────────────");
  line(text(await client.callTool({ name: "recall_memories", arguments: { query: "how does Tunde pay?", k: 3 } })));

  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
