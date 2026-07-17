import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import KredexMark from './components/KredexMark'

/*
 * Docs — "The Kredex Ledger Manual".
 * A three-column documentation site (left grouped nav · center content · right
 * on-this-page rail) rendered in Kredex's editorial "Ledger" design language:
 * warm cream paper, ink brown, rust orange, Fraunces + JetBrains Mono. Content is
 * a single-page app (state-driven pages) with scroll-spy, search, and prev/next.
 * Self-contained — no backend; authored from the real system.
 */

const INK = '#2A2622'
const ORANGE = '#EB4A26'
const PAPER = '#F4ECDC'
const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"
const REPO = 'https://github.com/shegz101/kredex'

/* ------------------------------------------------------------------ */
/*  Content primitives                                                  */
/* ------------------------------------------------------------------ */

function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span style={{ fontFamily: MONO }} className={`uppercase tracking-[0.22em] ${className}`}>
      {children}
    </span>
  )
}

function Serif({ children, className = '', italic = false }: { children: React.ReactNode; className?: string; italic?: boolean }) {
  return (
    <span style={{ fontFamily: DISPLAY, fontStyle: italic ? 'italic' : 'normal' }} className={className}>
      {children}
    </span>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-[1.75] text-[#2A2622]/85">{children}</p>
}

function K({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ fontFamily: MONO }} className="rounded bg-[#2A2622]/8 px-1.5 py-0.5 text-[12.5px] text-[#8a2f1a]">
      {children}
    </code>
  )
}

function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-[1.7] text-[#2A2622]/85">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ORANGE }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

const NOTE_STYLES: Record<string, { icon: string; ring: string; chip: string }> = {
  note: { icon: 'solar:notebook-linear', ring: 'border-[#2A2622]/25', chip: '#2A2622' },
  tip: { icon: 'solar:lightbulb-bolt-linear', ring: 'border-[#8A9A5B]', chip: '#5f7040' },
  warn: { icon: 'solar:danger-triangle-linear', ring: 'border-[#EB4A26]', chip: ORANGE },
}

function Note({ kind = 'note', title, children }: { kind?: 'note' | 'tip' | 'warn'; title: string; children: React.ReactNode }) {
  const s = NOTE_STYLES[kind]
  return (
    <div className={`rounded-[8px] border-l-[3px] ${s.ring} border-y border-r border-y-[#2A2622]/12 border-r-[#2A2622]/12 bg-[#F8F2E4] p-4`}>
      <div className="flex items-center gap-2">
        <Icon icon={s.icon} width="16" style={{ color: s.chip }} />
        <Mono className="text-[10px]" >{title}</Mono>
      </div>
      <div className="mt-2 text-[14px] leading-[1.7] text-[#2A2622]/80">{children}</div>
    </div>
  )
}

function Code({ label = 'shell', code }: { label?: string; code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="overflow-hidden rounded-[10px] border-2 border-[#2A2622] shadow-[6px_7px_0_rgba(42,38,34,0.12)]">
      <div className="flex items-center gap-1.5 bg-[#2A2622] px-3 py-2">
        <span className="h-2 w-2 rounded-full" style={{ background: ORANGE }} />
        <span className="h-2 w-2 rounded-full bg-[#E3A63C]" />
        <span className="h-2 w-2 rounded-full bg-[#8A9A5B]" />
        <Mono className="ml-2 text-[9px] text-[#F4ECDC]/60">{label}</Mono>
        <button
          onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
          className="ml-auto flex items-center gap-1 text-[#F4ECDC]/60 transition-colors hover:text-[#F4ECDC]"
        >
          <Icon icon={copied ? 'solar:check-read-linear' : 'solar:copy-linear'} width="13" />
          <Mono className="text-[9px]">{copied ? 'Copied' : 'Copy'}</Mono>
        </button>
      </div>
      <pre style={{ fontFamily: MONO }} className="overflow-x-auto bg-[#221E1B] px-4 py-3.5 text-[12.5px] leading-[1.65] text-[#EDE4D2]">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-[10px] border-2 border-[#2A2622] bg-[#F8F2E4] p-4 text-center">
      <Serif className="block text-3xl font-semibold text-[#EB4A26] sm:text-4xl">{big}</Serif>
      <Mono className="mt-2 block text-[9px] text-[#2A2622]/60">{label}</Mono>
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border-2 border-[#2A2622]">
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="bg-[#2A2622] text-[#F4ECDC]">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5">
                <Mono className="text-[9px]">{h}</Mono>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-[#F8F2E4]' : 'bg-[#F4ECDC]'}>
              {r.map((c, j) => (
                <td key={j} className="border-t border-[#2A2622]/12 px-4 py-2.5 text-[#2A2622]/85 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A titled, anchorable content block that also registers in the right rail. */
function Doc({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-toc-id={id} className="scroll-mt-28 pt-12 first:pt-0">
      <h2 style={{ fontFamily: DISPLAY }} className="text-[26px] font-medium leading-tight sm:text-[30px]">
        {title}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Pages                                                              */
/* ------------------------------------------------------------------ */

type Page = {
  id: string
  group: string
  label: string
  kicker: string
  title: string
  lead: string
  toc: { id: string; title: string }[]
  body: React.ReactNode
}

const PAGES: Page[] = [
  {
    id: 'overview',
    group: 'Getting started',
    label: 'Overview',
    kicker: 'Getting started',
    title: 'Overview',
    lead: 'Kredex is an AI bookkeeper for African micro-businesses that you run by conversation — and that remembers. The owner just says what happened, in English or Nigerian Pidgin, typed or spoken; Kredex records the sale, tracks the debt, and answers questions.',
    toc: [
      { id: 'the-one-idea', title: 'The one idea' },
      { id: 'what-kredex-does', title: 'What Kredex does' },
      { id: 'why-its-different', title: "Why it's different" },
      { id: 'where-next', title: 'Where to next' },
    ],
    body: (
      <>
        <Doc id="the-one-idea" title="The one idea">
          <P>
            A chatbot with scroll-back is not a memory. Kredex is built around a single rule: <strong>the right data
            structure for each kind of knowledge</strong>. Exact facts that must be overwritten cleanly (a price, a
            supplier term) live in a <K>trie</K>. Messy, associative knowledge (“Tunde grumbles but always pays”) lives
            in a <K>vector store</K>. The agent trusts the trie for exact values and the vectors for recall.
          </P>
          <Note kind="tip" title="The rule">
            Every answer about your shop is grounded in memory that <strong>persists across every chat session</strong> and
            <strong> updates the moment you change it</strong> — overwrite a price in one conversation and it is the truth in
            all the others, instantly and deterministically.
          </Note>
        </Doc>
        <Doc id="what-kredex-does" title="What Kredex does">
          <P>Given a message from the owner, Kredex:</P>
          <UL
            items={[
              <><strong>Recalls</strong> the shop’s current facts and relevant habits — across all past sessions — before it answers.</>,
              <><strong>Acts</strong> through a Qwen tool-calling agent: records sales (cash or credit), payments, expenses, stock, invoices, reminders.</>,
              <><strong>Remembers</strong> what’s durable: a canonicalizer distils keyed facts for the trie; an extractor distils typed memories for the vector tier. Transient transactions are ignored.</>,
              <><strong>Forgets on time</strong>: facts forget by overwrite (old value kept in history); stale, low-value memories decay; the least useful are evicted past a cap.</>,
              <><strong>Sees and speaks</strong>: reads receipt photos, takes voice input, and can talk its replies back.</>,
            ]}
          />
        </Doc>
        <Doc id="why-its-different" title="Why it's different">
          <UL
            items={[
              <>It’s a <strong>two-tier memory engine</strong>, not a chat window with history.</>,
              <>Structured recall is <strong>deterministic</strong> — a key exists or it doesn’t, no similarity threshold to tune.</>,
              <>Vector recall selects the <strong>critical few</strong> under a token budget, not just the top cosine match.</>,
              <>The whole memory is <strong>reusable over MCP</strong> — any agent can use Kredex as a memory backend.</>,
            ]}
          />
        </Doc>
        <Doc id="where-next" title="Where to next">
          <P>New here? Start with the <strong>Quickstart</strong>. Want the internals? Read <strong>The memory engine</strong>. Wiring another agent in? Jump to the <strong>MCP server</strong>.</P>
        </Doc>
      </>
    ),
  },
  {
    id: 'quickstart',
    group: 'Getting started',
    label: 'Quickstart',
    kicker: 'Getting started',
    title: 'Quickstart',
    lead: 'The only thing you always need is a Qwen Cloud API key from Alibaba Model Studio (DashScope). Then pick Docker (nothing else to install) or a native Node run.',
    toc: [
      { id: 'docker', title: 'Run with Docker' },
      { id: 'native', title: 'Run natively' },
      { id: 'first-words', title: 'Your first words' },
    ],
    body: (
      <>
        <Doc id="docker" title="Run with Docker">
          <P>MongoDB runs in a container — you only supply two secrets.</P>
          <Code label="shell" code={`cp .env.example .env      # add QWEN_API_KEY + JWT_SECRET\ndocker compose up -d --build web server mongo`} />
          <P>Then open <K>http://localhost:8080</K> and register a shop.</P>
        </Doc>
        <Doc id="native" title="Run natively">
          <Code label="shell" code={`cp server/.env.example server/.env   # QWEN_API_KEY · MONGODB_URI · JWT_SECRET\nnpm run install:all\nnpm run dev                          # Vite :5173 + Express :3001`} />
          <Note kind="warn" title="Use a pay-as-you-go key">
            Use an <K>sk-…</K> key with the <K>dashscope-intl</K> endpoint. A Token-Plan key (<K>sk-sp-…</K>) is for
            interactive tools only and will <K>401</K> against a backend.
          </Note>
        </Doc>
        <Doc id="first-words" title="Your first words">
          <P>Once you’re in, just talk to it:</P>
          <Code label="chat" code={`sold 3 bags of rice for 4500 each\nMusa carry 2 crates of coke, e go pay Friday\nI sell a bag of rice for 32,000\nwarn me when milk is below 10`} />
          <P>Then open a <strong>new chat</strong> and ask “how much do I sell rice for?” — it answers from memory, even though you never said it in that thread.</P>
        </Doc>
      </>
    ),
  },
  {
    id: 'how-it-works',
    group: 'Core concepts',
    label: 'How Kredex works',
    kicker: 'Core concepts',
    title: 'How Kredex works',
    lead: 'One message travels through a cheap classifier, hybrid recall across both memory tiers, a Qwen tool-calling loop, a streamed reply, and finally two asynchronous memory writes.',
    toc: [
      { id: 'the-loop', title: 'The agent loop' },
      { id: 'hybrid-recall', title: 'Hybrid recall' },
      { id: 'sessions', title: 'Sessions vs. memory' },
    ],
    body: (
      <>
        <Doc id="the-loop" title="The agent loop">
          <Code
            label="orchestrator.ts"
            code={`Owner message  (in some chat session)
  -> local classifier (cheap intent guess, no LLM)
  -> HYBRID RECALL (shop-wide, across all sessions):
       Tier 1 · recallFacts()  → trie prefix walk → exact facts
       Tier 2 · recall()       → cosine × importance × recency → MMR
       → inject facts (authoritative) + memories (associative)
  -> Qwen tool-calling loop → run tools against MongoDB → stream reply
  -> WRITE both tiers · async (fire-and-forget):
       rememberFactsFromTurn() → canonicalize → upsert (overwrite + history)
       rememberFromTurn()      → extract typed memories → embed → dedup → forget`}
          />
        </Doc>
        <Doc id="hybrid-recall" title="Hybrid recall">
          <P>
            Both tiers are queried in parallel with <K>Promise.all</K>. Facts are injected as an
            <em> authoritative</em> system message (“use these exact values”); memories are injected separately as
            things the assistant <em>may</em> find relevant. The agent is told to trust the trie over anything vaguer.
          </P>
        </Doc>
        <Doc id="sessions" title="Sessions vs. memory">
          <P>
            Owners keep separate conversation threads, like chats in ChatGPT. But long-term memory is <strong>shop-scoped and
            shared</strong> — sessions only scope the short-term replay. Tell Kredex something in one chat and it’s known in all.
          </P>
        </Doc>
      </>
    ),
  },
  {
    id: 'structured-facts',
    group: 'The memory engine',
    label: 'Structured facts (trie)',
    kicker: 'The memory engine · Tier 1',
    title: 'Structured facts — the canonical-key trie',
    lead: 'Facts with a single current value — prices, supplier terms, phone numbers, reorder levels — live under canonical dotted keys in a segment trie. Exact lookup, prefix recall, and in-place overwrite, all independent of how many facts a shop has.',
    toc: [
      { id: 'canonical-keys', title: 'Canonical keys' },
      { id: 'overwrite', title: 'Overwrite semantics' },
      { id: 'trie-numbers', title: 'The numbers' },
    ],
    body: (
      <>
        <Doc id="canonical-keys" title="Canonical keys">
          <P>
            Every fact is keyed <K>category.subject.attribute</K>. Each dot-segment is one edge in the tree, so facts about
            the same subject share a path — which makes “everything about rice” a single subtree walk.
          </P>
          <Code
            label="facts"
            code={`product.rice.sell_price   -> 34000  (NGN)
product.rice.cost_price   -> 28000  (NGN)
product.rice.reorder_level-> 10     (bag)
customer.tunde.pays_on    -> "Friday"`}
          />
          <P>A canonicalizer (a Qwen pass) turns a sentence like “I sell a bag of rice for 34,000” into <K>product.rice.sell_price = 34000</K>.</P>
        </Doc>
        <Doc id="overwrite" title="Overwrite semantics">
          <P>
            Setting a key that already exists <strong>overwrites in place</strong> — that’s the whole point. Say “rice is
            now 36,000” and the old value is superseded, kept in a <K>history</K> array (“used to be…”). It is exact and
            deterministic; there is no fuzzy match and no duplicate.
          </P>
          <Note kind="note" title="Source of truth">
            The trie is the in-memory index; a unique-keyed <K>Fact</K> collection in MongoDB is the source of truth. The
            per-shop trie is rebuilt from it on a cache miss (60s TTL) and invalidated on every write.
          </Note>
        </Doc>
        <Doc id="trie-numbers" title="The numbers">
          <P>Measured with <K>npm run bench</K> — the trie stays flat as facts grow, while a naive linear scan does not:</P>
          <div className="grid grid-cols-3 gap-3">
            <Stat big="~3.7µs" label="Exact lookup @ 30k facts" />
            <Stat big="~350×" label="Faster than array scan" />
            <Stat big="O(key-length)" label="Lookup · overwrite · prefix" />
          </div>
          <Table
            head={['Facts', 'Trie lookup', 'Array scan', 'Overwrite', 'Prefix recall']}
            rows={[
              ['300', '2.7 µs', '5.8 µs', '3.7 µs', '3.4 µs'],
              ['3,000', '2.3 µs', '53.6 µs', '2.0 µs', '2.7 µs'],
              ['30,000', '3.7 µs', '1,283.9 µs', '6.3 µs', '4.8 µs'],
            ]}
          />
        </Doc>
      </>
    ),
  },
  {
    id: 'vector-memory',
    group: 'The memory engine',
    label: 'Narrative memory (vectors)',
    kicker: 'The memory engine · Tier 2',
    title: 'Narrative memory — the vector store',
    lead: 'Knowledge that can’t be keyed — habits, preferences, standing rules — is embedded with text-embedding-v4 and recalled by relevance, importance, and recency, then filtered to a diverse, budgeted set: the critical few.',
    toc: [
      { id: 'scoring', title: 'Scoring' },
      { id: 'mmr', title: 'MMR + the budget' },
      { id: 'reinforce', title: 'Reinforcement' },
    ],
    body: (
      <>
        <Doc id="scoring" title="Scoring">
          <P>Each candidate memory is scored:</P>
          <Code label="memory.ts" code={`score = cosine(query, memory) × importanceBoost(importance, pinned) × recencyBoost(lastAccessedAt)`} />
          <P>
            Candidates below a similarity gate (<K>MIN_SIM = 0.36</K>) are dropped. Recency uses a 30-day half-life;
            importance ranges 1–10 (pinned memories get an extra multiplier).
          </P>
        </Doc>
        <Doc id="mmr" title="MMR + the budget">
          <P>
            High-scoring memories are often near-duplicates. <strong>Maximal Marginal Relevance</strong> (<K>λ = 0.72</K>)
            greedily picks memories that are relevant <em>and</em> diverse, stopping at a character budget so the injected
            context stays small.
          </P>
          <div className="grid grid-cols-3 gap-3">
            <Stat big="~180 tok" label="Max context injected" />
            <Stat big="~98.7%" label="Less than raw memory at cap" />
            <Stat big="~2.4ms" label="Scoring 400 × 1024-d" />
          </div>
          <Note kind="tip" title="The critical few">
            A shop at the 600-memory cap holds ~54,000 characters of memory. Recall injects at most 720 characters
            (~180 tokens) of the most relevant, diverse few — bounded no matter how much the shop accumulates.
          </Note>
        </Doc>
        <Doc id="reinforce" title="Reinforcement">
          <P>
            Memories that get recalled matter: on use, their importance rises and recency refreshes. Near-duplicates
            (<K>≥ 0.82</K> cosine) merge into the existing memory rather than duplicating. The tier gets sharper with use.
          </P>
        </Doc>
      </>
    ),
  },
  {
    id: 'forgetting',
    group: 'The memory engine',
    label: 'Forgetting',
    kicker: 'The memory engine',
    title: 'Forgetting — three mechanisms',
    lead: 'A memory that only accumulates becomes noise. Kredex forgets outdated information on time, in three distinct ways across the two tiers.',
    toc: [
      { id: 'by-overwrite', title: 'By overwrite (facts)' },
      { id: 'by-decay', title: 'By decay (vectors)' },
      { id: 'by-cap', title: 'By cap (vectors)' },
    ],
    body: (
      <>
        <Doc id="by-overwrite" title="By overwrite — structured facts">
          <P>A corrected fact supersedes the old value, which is preserved in <K>history</K>. This is the cleanest kind of forgetting: the stale value is no longer <em>current</em>, but it isn’t lost.</P>
        </Doc>
        <Doc id="by-decay" title="By decay — time-based">
          <P>
            Low-importance memories (<K>importance ≤ 3</K>), unpinned, untouched for more than <K>120 days</K>, are
            <strong> soft-deactivated</strong> (<K>active: false</K>) — auditable and reversible. Pinned or important
            memories are never touched, no matter how old.
          </P>
        </Doc>
        <Doc id="by-cap" title="By cap — eviction">
          <P>
            If a shop still exceeds <K>600</K> active memories after decay, the lowest <K>importance × recency</K> memories
            are hard-evicted to bound storage. Pinned memories are exempt.
          </P>
        </Doc>
      </>
    ),
  },
  {
    id: 'mcp-server',
    group: 'MCP & integrations',
    label: 'MCP server',
    kicker: 'MCP & integrations',
    title: 'MCP server — Kredex as a memory backend',
    lead: 'Kredex exposes a shop’s two-tier memory and bookkeeping tools over the Model Context Protocol, so any MCP client (Claude Desktop, an IDE agent, another app) can use Kredex as a durable memory backend — not just our own UI.',
    toc: [
      { id: 'one-registry', title: 'One registry, two front-ends' },
      { id: 'the-tools', title: 'The tools' },
      { id: 'run-mcp', title: 'Run it' },
      { id: 'wire-mcp', title: 'Wire into a client' },
    ],
    body: (
      <>
        <Doc id="one-registry" title="One registry, two front-ends">
          <P>
            The bookkeeping tools aren’t re-declared for MCP. The server reuses the <em>exact same</em> <K>toolDefs</K> +
            <K> executeTool</K> registry that powers the in-app Qwen agent — an OpenAI function schema maps 1:1 to MCP’s
            JSON-Schema <K>inputSchema</K>. One source of truth, exposed to both Qwen function-calling and MCP.
          </P>
        </Doc>
        <Doc id="the-tools" title="The tools">
          <P><strong>17 tools</strong> — 6 memory + 11 bookkeeping. The memory surface is the star:</P>
          <Table
            head={['Tool', 'Tier', 'What it does']}
            rows={[
              [<K>recall_facts</K>, '1 · trie', 'Current structured facts for a query (deterministic)'],
              [<K>remember_fact</K>, '1 · trie', 'Store/overwrite a fact under a canonical key'],
              [<K>list_facts</K>, '1 · trie', 'All structured facts, grouped'],
              [<K>recall_memories</K>, '2 · vector', 'Relevant narrative memories (scored + diversified)'],
              [<K>remember</K>, '2 · vector', 'Store a narrative memory (deduped, reinforced)'],
              [<K>list_memories</K>, '2 · vector', 'Inspect the vector tier'],
            ]}
          />
          <P>Plus the 11 bookkeeping tools: <K>record_sale</K>, <K>record_credit_sale</K>, <K>record_payment</K>, <K>log_stock</K>, <K>query_debts</K>, <K>query_stock</K>, <K>daily_summary</K>, <K>record_expense</K>, <K>create_invoice</K>, <K>save_customer_phone</K>, <K>set_reminder</K>.</P>
        </Doc>
        <Doc id="run-mcp" title="Run it">
          <P>The server binds to one shop via <K>KREDEX_SHOP_ID</K>; every tool is scoped to that shop.</P>
          <Code label="shell" code={`KREDEX_SHOP_ID=<your-shop-id> npm --prefix server run mcp`} />
        </Doc>
        <Doc id="wire-mcp" title="Wire into a client">
          <P>For Claude Desktop, add to <K>claude_desktop_config.json</K>:</P>
          <Code
            label="claude_desktop_config.json"
            code={`{
  "mcpServers": {
    "kredex": {
      "command": "npm",
      "args": ["--prefix", "/absolute/path/to/kredex/server", "run", "mcp"],
      "env": {
        "KREDEX_SHOP_ID": "<your-shop-id>",
        "MONGODB_URI": "mongodb://127.0.0.1:27017/kredex"
      }
    }
  }
}`}
          />
          <Note kind="tip" title="Try it">
            Ask the client “what do I sell rice for?” — it calls <K>recall_facts</K> over MCP and answers from the trie.
            Say “rice is now 40,000” and it calls <K>remember_fact</K>, overwriting the value for every future recall.
          </Note>
        </Doc>
      </>
    ),
  },
  {
    id: 'qwen-models',
    group: 'MCP & integrations',
    label: 'Qwen model map',
    kicker: 'MCP & integrations',
    title: 'The Qwen model map',
    lead: 'Every AI call goes to Qwen (Alibaba Model Studio / DashScope) through one OpenAI-compatible client. One central map means a single edit swaps any version.',
    toc: [{ id: 'models', title: 'Models' }],
    body: (
      <Doc id="models" title="Models">
        <Table
          head={['Model', 'Role in Kredex']}
          rows={[
            [<K>qwen3.7-max</K>, 'Deep P&L / profit reasoning'],
            [<K>qwen3.5-flash</K>, 'Chat tool-calling · opportunity scout · memory + fact extraction'],
            [<K>qwen-vl-max</K>, 'Receipt photo OCR'],
            [<K>qwen3-asr-flash</K>, 'Speech-to-text (voice logging)'],
            [<K>qwen3-tts-flash</K>, 'Text-to-speech (talk-back)'],
            [<K>qwen3.5-omni-flash</K>, 'Voice (omni path)'],
            [<K>text-embedding-v4</K>, 'Semantic memory (1024-d) + fuzzy item matching'],
          ]}
        />
      </Doc>
    ),
  },
  {
    id: 'reliability',
    group: 'Reference',
    label: 'Reliability',
    kicker: 'Reference',
    title: 'Reliability & failure modes',
    lead: 'An owner logging a sale should never see a stack trace because an AI call blipped. Kredex is designed to degrade gracefully.',
    toc: [
      { id: 'qwen-fail', title: 'A Qwen call fails' },
      { id: 'recall-miss', title: 'A recall miss' },
      { id: 'mongo-blip', title: 'MongoDB blips' },
    ],
    body: (
      <>
        <Doc id="qwen-fail" title="A Qwen call fails or times out">
          <P>
            The client auto-retries transient errors <strong>twice with backoff</strong> and caps each call at a
            <strong> 30s timeout</strong>. The heavy P&L path uses a fallback chain
            (<K>qwen3.7-max → qwen3.5-flash → a computed verdict</K>), so a verdict always comes back. If a chat call still
            fails, the route emits a clean SSE <K>error</K> — and no ledger data is lost, because the write is separate from the reply.
          </P>
        </Doc>
        <Doc id="recall-miss" title="A recall miss (trie or vector)">
          <P>
            Both recall paths are wrapped to <strong>return empty on any error</strong>. A trie miss simply falls through to
            the vector tier and the live tools that query the real ledger. The worst case for memory is “answer without
            memory context,” never a failed turn.
          </P>
        </Doc>
        <Doc id="mongo-blip" title="MongoDB blips">
          <P>
            The driver buffers commands and auto-reconnects through brief interruptions; a short
            <K> serverSelectionTimeoutMS</K> makes a real outage fail fast and clean. Long-term memory writes are
            <strong> best-effort and fire-and-forget</strong> — a failed write is logged and dropped, never breaking the reply.
          </P>
        </Doc>
      </>
    ),
  },
  {
    id: 'architecture',
    group: 'Reference',
    label: 'Architecture',
    kicker: 'Reference',
    title: 'Architecture',
    lead: 'A conversational, memory-driven agent: the owner talks, the engine logs to MongoDB, distils durable memories into two tiers, and performs hybrid recall on every turn — all on Qwen, deployed on Alibaba Cloud.',
    toc: [
      { id: 'the-diagram', title: 'System diagram' },
      { id: 'deployment', title: 'Deployment' },
      { id: 'scale', title: 'Scaling' },
    ],
    body: (
      <>
        <Doc id="the-diagram" title="System diagram">
          <div className="overflow-hidden rounded-[10px] border-2 border-[#2A2622] bg-white p-2 shadow-[8px_9px_0_rgba(42,38,34,0.12)]">
            <img src="https://raw.githubusercontent.com/shegz101/kredex/master/docs/assets/kredex_system_architecture.png" alt="Kredex system architecture" className="w-full rounded-[6px]" loading="lazy" />
          </div>
        </Doc>
        <Doc id="deployment" title="Deployment">
          <P>One Docker Compose stack on a single Alibaba Cloud server:</P>
          <Code label="topology" code={`Browser → Caddy (HTTPS) → nginx → Express API → MongoDB`} />
          <P>Caddy terminates HTTPS with an auto-renewing certificate and reverse-proxies to nginx. Live at <K>kredex.xyz</K>.</P>
        </Doc>
        <Doc id="scale" title="Scaling">
          <UL
            items={[
              <>The API is <strong>stateless</strong> (JWT) → scales horizontally behind nginx/Caddy with no sticky sessions.</>,
              <>Hot paths are indexed: unique <K>(shopId, key)</K> on facts, <K>(shopId, active, importance)</K> on memories.</>,
              <>Honest caveat: the per-shop trie cache is in-memory per instance (60s TTL bounds staleness). A shared <strong>Redis</strong> cache is the documented next step.</>,
            ]}
          />
        </Doc>
      </>
    ),
  },
]

/* ------------------------------------------------------------------ */
/*  Shell                                                              */
/* ------------------------------------------------------------------ */

const GROUP_ORDER = ['Getting started', 'Core concepts', 'The memory engine', 'MCP & integrations', 'Reference']

export default function Docs() {
  const [activeId, setActiveId] = useState(() => {
    const h = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : ''
    return PAGES.some((p) => p.id === h) ? h : 'overview'
  })
  const [activeHeading, setActiveHeading] = useState('')
  const [query, setQuery] = useState('')
  const [navOpen, setNavOpen] = useState(false)

  const page = useMemo(() => PAGES.find((p) => p.id === activeId) ?? PAGES[0], [activeId])
  const pageIndex = PAGES.findIndex((p) => p.id === activeId)
  const prev = PAGES[pageIndex - 1]
  const next = PAGES[pageIndex + 1]

  // grouped + search-filtered nav
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GROUP_ORDER.map((g) => ({
      group: g,
      items: PAGES.filter((p) => p.group === g && (!q || p.label.toLowerCase().includes(q) || p.group.toLowerCase().includes(q))),
    })).filter((g) => g.items.length)
  }, [query])

  // reset scroll + heading on page change; keep the hash in sync
  useEffect(() => {
    window.scrollTo({ top: 0 })
    setActiveHeading(page.toc[0]?.id ?? '')
    setNavOpen(false)
    if (window.location.hash.replace('#', '') !== activeId) history.replaceState(null, '', `#${activeId}`)
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // scroll-spy for the right rail
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-toc-id]'))
    if (!nodes.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveHeading(visible[0].target.getAttribute('data-toc-id') || '')
      },
      { rootMargin: '-88px 0px -72% 0px' }
    )
    nodes.forEach((n) => obs.observe(n))
    return () => obs.disconnect()
  }, [activeId])

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ backgroundColor: PAPER, color: INK, fontFamily: DISPLAY }} className="min-h-screen w-full antialiased selection:bg-[#EB4A26]/20">
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: 'radial-gradient(120% 60% at 50% -10%, rgba(255,255,255,0.5), transparent 60%)' }} />

      {/* ---- top bar ---- */}
      <header className="sticky top-0 z-40 border-b-2 border-[#2A2622] bg-[#F4ECDC]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1360px] items-center gap-4 px-4 py-3 sm:px-6">
          <button onClick={() => setNavOpen((v) => !v)} className="lg:hidden" aria-label="Toggle navigation">
            <Icon icon={navOpen ? 'solar:close-square-linear' : 'solar:hamburger-menu-linear'} width="22" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <KredexMark className="h-6 w-6" />
            <span className="flex items-baseline gap-1.5">
              <Serif className="text-lg font-semibold">Kredex</Serif>
              <Mono className="text-[10px] text-[#2A2622]/60">Docs</Mono>
            </span>
          </Link>

          {/* search */}
          <div className="relative ml-auto hidden items-center sm:flex">
            <Icon icon="solar:magnifer-linear" width="15" className="absolute left-3 text-[#2A2622]/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs"
              style={{ fontFamily: MONO }}
              className="w-52 rounded-full border-2 border-[#2A2622] bg-transparent py-1.5 pl-9 pr-3 text-[11px] uppercase tracking-wider placeholder:text-[#2A2622]/40 focus:outline-none focus:ring-2 focus:ring-[#EB4A26]/40"
            />
          </div>

          <nav className="ml-auto flex items-center gap-4 sm:ml-4">
            <a href={REPO} target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 hover:text-[#EB4A26] sm:flex">
              <Icon icon="mdi:github" width="18" />
              <Mono className="text-[10px]">GitHub</Mono>
            </a>
            <Link to="/register" className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-white transition-transform hover:-translate-y-0.5" style={{ background: ORANGE }}>
              <Mono className="text-[10px] font-semibold">Open app</Mono>
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-[1360px] gap-8 px-4 sm:px-6">
        {/* ---- left nav ---- */}
        <aside
          className={`${navOpen ? 'block' : 'hidden'} fixed inset-x-0 top-[57px] bottom-0 z-30 overflow-y-auto border-r-2 border-[#2A2622] bg-[#F4ECDC] px-4 py-6 lg:sticky lg:top-[57px] lg:block lg:h-[calc(100vh-57px)] lg:w-64 lg:shrink-0 lg:border-r lg:border-[#2A2622]/20 lg:bg-transparent lg:px-0 lg:pr-4`}
        >
          {groups.map((g) => (
            <div key={g.group} className="mb-7">
              <Mono className="text-[9.5px] text-[#2A2622]/50">{g.group}</Mono>
              <ul className="mt-3 space-y-0.5">
                {g.items.map((it) => {
                  const active = it.id === activeId
                  return (
                    <li key={it.id}>
                      <button
                        onClick={() => setActiveId(it.id)}
                        className={`w-full rounded-[6px] px-3 py-1.5 text-left text-[14px] transition-colors ${
                          active ? 'bg-[#2A2622] text-[#F4ECDC]' : 'text-[#2A2622]/80 hover:bg-[#2A2622]/8'
                        }`}
                      >
                        {it.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {!groups.length && <Mono className="text-[10px] text-[#2A2622]/50">No matches</Mono>}
        </aside>

        {/* ---- center content ---- */}
        <main className="min-w-0 flex-1 py-10 lg:py-12">
          <Mono className="text-[10px] text-[#EB4A26]">{page.kicker}</Mono>
          <h1 style={{ fontFamily: DISPLAY }} className="mt-3 text-[38px] font-semibold leading-[1.02] sm:text-[46px]">
            {page.title}
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-[1.7] text-[#2A2622]/75">
            <Serif italic>{page.lead}</Serif>
          </p>
          <div className="mt-4 h-px w-full bg-[#2A2622]/15" />

          <article className="mt-2 max-w-2xl">{page.body}</article>

          {/* prev / next flippers */}
          <div className="mt-16 grid gap-4 border-t-2 border-[#2A2622] pt-6 sm:grid-cols-2">
            {prev ? (
              <button onClick={() => setActiveId(prev.id)} className="group rounded-[8px] border-2 border-[#2A2622]/25 p-4 text-left transition-colors hover:border-[#2A2622]">
                <Mono className="text-[9px] text-[#2A2622]/50">← Previous</Mono>
                <span className="mt-1 block"><Serif className="text-lg font-medium group-hover:text-[#EB4A26]">{prev.label}</Serif></span>
              </button>
            ) : <span />}
            {next ? (
              <button onClick={() => setActiveId(next.id)} className="group rounded-[8px] border-2 border-[#2A2622]/25 p-4 text-right transition-colors hover:border-[#2A2622] sm:text-right">
                <Mono className="text-[9px] text-[#2A2622]/50">Next →</Mono>
                <span className="mt-1 block"><Serif className="text-lg font-medium group-hover:text-[#EB4A26]">{next.label}</Serif></span>
              </button>
            ) : <span />}
          </div>

          <footer className="mt-12 flex items-center justify-between border-t border-[#2A2622]/15 pt-6">
            <Mono className="text-[9px] text-[#2A2622]/50">Kredex · Powered by Qwen Cloud</Mono>
            <a href={`${REPO}/edit/master/README.md`} target="_blank" rel="noreferrer" className="hover:text-[#EB4A26]">
              <Mono className="text-[9px]">Edit on GitHub</Mono>
            </a>
          </footer>
        </main>

        {/* ---- right rail: on this page ---- */}
        <aside className="hidden w-52 shrink-0 py-12 xl:block">
          <div className="sticky top-[81px]">
            <Mono className="text-[9.5px] text-[#2A2622]/50">On this page</Mono>
            <ul className="mt-3 space-y-1.5 border-l-2 border-[#2A2622]/15">
              {page.toc.map((t) => {
                const active = t.id === activeHeading
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => jump(t.id)}
                      className={`-ml-0.5 border-l-2 pl-3 text-left text-[13px] leading-snug transition-colors ${
                        active ? 'border-[#EB4A26] font-medium text-[#EB4A26]' : 'border-transparent text-[#2A2622]/60 hover:text-[#2A2622]'
                      }`}
                    >
                      {t.title}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
