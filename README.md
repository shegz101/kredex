![Kredex — the AI bookkeeper that remembers your shop](docs/assets/kredex-banner.png)

# Kredex — The AI Bookkeeper That Remembers Your Shop

> An AI bookkeeper for African micro-businesses that you run by **conversation** —
> and that **remembers**. The owner just says what happened (in English or Nigerian
> Pidgin, typed or spoken) and Kredex records the sale, tracks the debt, and answers
> questions. Crucially, it distils every conversation into durable, typed memories —
> your customers' payment habits, your preferences, standing instructions — recalls
> the **critical few** across sessions, **reinforces** what it uses, and **forgets**
> what goes stale. So it gets sharper about your shop every day.

Built for the **Global AI Hackathon Series with Qwen Cloud** — **MemoryAgent** track.

![License: MIT](https://img.shields.io/badge/License-MIT-EB4A26.svg)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-2E9C6E.svg)
![Powered by Qwen](https://img.shields.io/badge/AI-Qwen%20Cloud-7C5CFF.svg)
![Docker ready](https://img.shields.io/badge/Docker-ready-2496ED.svg)

**Kredex is free and open source (MIT).** Contributions are welcome — see
[Contributing](#contributing).

---

## Live

- 🌐 **Live app** — https://kredex.xyz
- ☁️ **On Alibaba Cloud** — http://8.222.241.247 (Simple Application Server, Singapore)
- 🐦 **Twitter / X** — https://x.com/getkredex
- 🎥 **Demo video** — _add link before submission_
- 🗺️ **Architecture** — see [Architecture](#architecture) below
- 💻 **Repo** — https://github.com/shegz101/kredex

---

## Table of Contents

- [Quick Path](#quick-path)
- [Why It Stands Out](#why-it-stands-out)
- [What it does](#what-it-does)
- [Architecture](#architecture)
- [The agent layer](#the-agent-layer)
- [Requirements](#requirements)
- [Run with Docker (easiest)](#run-with-docker-easiest)
- [Local development (without Docker)](#local-development-without-docker)
- [Usage](#usage)
- [Deployment](#deployment)
- [Project layout](#project-layout)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Path

**Fastest — with Docker** (only needs Docker + a Qwen API key; MongoDB runs in a
container, nothing else to install):

```bash
cp .env.example .env      # add QWEN_API_KEY + JWT_SECRET (details below)
docker compose up -d --build web server mongo
```

Then open **`http://localhost:8080`**.

**Or run it natively** (Node + a local or Atlas MongoDB):

```bash
cp server/.env.example server/.env   # QWEN_API_KEY · MONGODB_URI · JWT_SECRET
npm run install:all
npm run dev                          # Vite :5173 + Express :3001
```

Then open **`http://localhost:5173`**.

Either way, register a shop and tell Kredex:

```text
> sold 3 bags of rice for 4500 each
> Musa carry 2 crates of coke, e go pay Friday
> remind me to call my supplier on Monday
> warn me when milk is below 10
```

---

## Why It Stands Out

Kredex is built for the **MemoryAgent** track: a genuine, optimized long-term
memory architecture — not a chat window with history.

- **Structured memory, not raw logs.** Every conversation is distilled by a model
  pass into durable, typed memories — *facts*, *preferences*, *events* (e.g.
  "Tunde pays late but always pays", "owner closes early on Fridays"). Transient
  transactions are ignored, so memory stays clean and useful.
- **Optimized retrieval within a limited context window.** Recall scores each
  memory by **cosine × importance × recency**, then uses **MMR** to select a
  diverse, non-redundant set under a **token budget** — surfacing the *critical
  few*, not just the top cosine match.
- **It learns, and it forgets.** Memories that get recalled are **reinforced**
  (importance ↑, recency refreshed) so the agent grows more accurate across
  sessions; near-duplicates **merge**, and the least important, oldest memories are
  **evicted** past a cap. A built-in **Memory inspector** lets you watch it all.

It speaks the owner's language (English + Nigerian Pidgin, typed **or spoken**),
reads receipt photos, and runs entirely on **Qwen** models via Alibaba Model Studio.

## What it does

- **Conversational bookkeeping** — the owner says what happened and Kredex does the
  accounting. A cheap local classifier routes the intent, then a Qwen tool-calling
  agent runs the right action against MongoDB and confirms in a sentence or two.
  Tools: `record_sale`, `record_credit_sale`, `record_payment`, `record_expense`,
  `log_stock`, `create_invoice`, `save_customer_phone`, `set_reminder`,
  `query_debts`, `query_stock`, `daily_summary`.
- **Long-term memory engine (the MemoryAgent core)** — each turn is distilled into
  typed memories (fact / preference / event) embedded with `text-embedding-v4`
  (1024-dim). Recall is scored by **cosine × importance × recency**, selected with
  **MMR** under a token budget, and **reinforced** on use; near-duplicates merge and
  stale memories are evicted. So the agent recalls the *right* context across
  sessions without bloating its prompt. (`server/src/services/memory.ts`)
- **Memory inspector** — a dedicated page shows everything the agent remembers
  (type, importance, times recalled, last used) plus a **live recall tester**: type
  a query and watch which memories it retrieves and how strongly they score.
- **Memory-aware answers** — recalled facts are injected into the agent's context,
  so Kredex answers and advises with real knowledge of your shop, customers, and
  habits — and gets more accurate the more you use it.
- **Receipt photo OCR** — snap a supplier receipt; `qwen-vl-max` extracts
  structured line items to confirm and log.
- **Voice, both ways** — speak your entries (`qwen3-asr-flash`, speech-to-text) and
  have Kredex read replies aloud (`qwen3-tts-flash`, text-to-speech).
- **Invoices + PDF** — generate numbered invoices from chat or UI, mark paid/unpaid,
  download as PDF.
- **Profit & Loss analysis** — the flagship `qwen3.7-max` reasons over revenue,
  COGS, and expenses to give a plain-language "are you making money?" verdict.
- **Opportunity Scout** — finds grants, business events, and empowerment programs
  relevant to the shop via Qwen **live web search**, with source links and a cached,
  animated radar UI.
- **Dashboard & business health** — revenue chart, stat cards, low-stock and
  needs-attention panels, and a 0–100 business-health score (Strong / Good / Watch
  / At risk).
- **Currency-aware everywhere** — NGN / USD / GHS / KES / ZAR propagates across the
  dashboard, chat, and invoices.
- **Production hardening** — JWT auth (bcrypt, live email-taken check, password
  reset), rate limiting, SSE-safe gzip compression, in-memory TTL caching, and
  validated environment config.

## Architecture

Kredex is a **conversational, memory-driven** agent. The owner *talks* (types,
speaks, or snaps a receipt); the engine logs it to MongoDB, **distils durable
memories** from the conversation, and **recalls** the critical few on every new
turn. Every AI call goes to **Qwen** (Alibaba Model Studio / DashScope) through one
OpenAI-compatible client, and the whole stack is deployed on **Alibaba Cloud**.

![Kredex system architecture overview](docs/assets/architecture-overview.png)

> Deployment: Browser → Caddy (HTTPS) → nginx → Express → MongoDB, on Alibaba Cloud.
> Vector source: [`architecture-overview.svg`](docs/assets/architecture-overview.svg)

**The Qwen model map** (`server/src/lib/qwen.ts` — one edit swaps a version):

| Model | Role in Kredex |
|---|---|
| `qwen3.7-max` | Deep P&L / profit reasoning |
| `qwen3.5-flash` | Chat tool-calling, opportunity scout |
| `qwen-vl-max` | Receipt photo OCR |
| `qwen3-asr-flash` | Speech-to-text (voice logging) |
| `qwen3-tts-flash` | Text-to-speech (talk-back) |
| `qwen3.5-omni-flash` | Voice (omni path) |
| `text-embedding-v4` | Semantic memory + fuzzy item matching |

## The agent layer

The heart of Kredex is a **memory loop** wrapped around a tool-calling agent:

```text
Owner message
  -> local classifier (cheap intent guess, no LLM)
  -> recall(query): score each memory by cosine × importance × recency,
       MMR-select a diverse set under a token budget, reinforce what's used  ──► inject
  -> Qwen tool-calling loop -> run tools against MongoDB -> stream the reply
  -> rememberFromTurn: distil the turn into typed memories
       (extract facts/preferences/events · dedup & merge · forget the stale)
```

- `server/src/agents/orchestrator.ts` — the Qwen tool-calling loop; injects recalled memories into the system prompt.
- `server/src/services/memory.ts` — the memory engine: `rememberFromTurn()` (extraction), `recall()` (scored + MMR + reinforcement), `forget()` (eviction), `listMemories()`.
- `server/src/lib/embeddings.ts` — `embed()` + `cosine()`.
- `server/src/routes/memory.routes.ts` — the Memory inspector API (list, recall preview, forget).

## Requirements

The only thing you always need is a **Qwen Cloud API key** — from Alibaba
**Model Studio** (DashScope), the OpenAI-compatible endpoint. Then pick a path:

- **Docker path (easiest):** Docker + Docker Compose. MongoDB runs in a container.
- **Native path:** Node.js 20+ (developed on 24), npm, and MongoDB (local or a free
  Atlas cluster).

Get the API key at the Alibaba Cloud Model Studio console. Use a **pay-as-you-go**
key (`sk-…`) with the `dashscope-intl` endpoint — a Token-Plan key (`sk-sp-…`) is
for interactive tools only and will `401` against a backend.

## Run with Docker (easiest)

The whole stack — **nginx (web)**, the **Express API**, and **MongoDB** — is
containerized, so one command runs everything locally. No Node, no local Mongo.

**1. Configure secrets** — copy the root template and fill in two values:

```bash
cp .env.example .env
```

`.env` (repo root) needs only:

| Variable | What to put |
|---|---|
| `QWEN_API_KEY` | your `sk-…` key from Alibaba Model Studio |
| `QWEN_BASE_URL` | leave as the default `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| `JWT_SECRET` | any long random string — `openssl rand -hex 32` |

> `MONGODB_URI` is **not** set here — Compose points the API at the bundled Mongo
> container automatically (`mongodb://mongo:27017/kredex`).

**2. Build and run:**

```bash
docker compose up -d --build web server mongo
```

**3. Open http://localhost:8080** and register a shop.

Handy:

```bash
docker compose ps                 # service status
docker compose logs -f server     # follow the API logs
docker compose down               # stop (keeps the mongo_data volume)
```

> The compose file also defines a `caddy` service for production HTTPS — you can
> ignore it locally (that's why the command above lists only `web server mongo`).
> Running the whole stack in production is covered in [Deployment](#deployment).

## Local development (without Docker)

Prefer running the code directly (hot reload, no containers)?

### 1. Configure environment
```bash
cp server/.env.example server/.env
```
Fill in `server/.env`:
- `QWEN_API_KEY` — from the Alibaba Cloud Model Studio console
- `QWEN_BASE_URL` — defaults to `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- `MONGODB_URI` — local (`mongodb://127.0.0.1:27017/kredex`) or Atlas connection string
- `JWT_SECRET` — a long random string:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `PORT` — defaults to `3001`

### 2. Start MongoDB (if running locally)
```bash
sudo systemctl start mongod   # Linux; or run mongod / use MongoDB Atlas
```

### 3. Install and run
```bash
npm run install:all   # installs root, client, and server deps
npm run dev           # Express on :3001 + Vite on :5173, together
```

Open `http://localhost:5173` and register a shop.

## Usage

```bash
# Run both dev servers (client + server) with colored logs
npm run dev

# Run one side only
npm run dev:server
npm run dev:client

# Production build (client bundle + server tsc)
npm run build

# Verify the Qwen connection
npm --prefix server run ping:qwen
```

Try these in the chat once you're logged in:

```text
> sold 5 loaves of bread at 800 each
> Amaka took 3 cartons of milk on credit, due next week
> she paid 2000 today
> I paid 1500 for transport
> how much does Amaka owe me?
> what's low in stock?
> are you making money this month?
```

Then open **Memory** to see what Kredex has learned about your shop — and use the
**recall tester** to type a question and watch which memories it retrieves, scored.

## Deployment

Kredex is deployed as one Docker Compose stack on a single **Alibaba Cloud** Simple
Application Server (Singapore). In production a fourth service — **Caddy** — is the
public entry point: it terminates HTTPS with an auto-renewing Let's Encrypt
certificate and reverse-proxies to nginx.

```bash
# on the server, once .env holds QWEN_API_KEY + JWT_SECRET
docker compose up -d --build     # starts caddy + web + server + mongo
```

Caddy serves the domain from the [`Caddyfile`](Caddyfile) (`kredex.xyz`). To ship a
change: `git pull && docker compose up -d --build`. The `mongo_data` volume persists
across rebuilds. Live at **https://kredex.xyz**.

## Project layout

```
server/src/
  index.ts             # Express app: middleware + route mounts
  config/env.ts        # validated environment (fails loud on missing vars)
  agents/
    orchestrator.ts    # Qwen tool-calling agent loop + memory recall injection
    tools.ts           # function-calling tools (record_sale, log_stock, create_invoice…)
  services/
    memory.ts          # the memory engine: rememberFromTurn · recall (scored+MMR) · forget · list
  lib/
    qwen.ts            # one OpenAI-compatible DashScope client + central model map
    embeddings.ts      # embed() + cosine() for semantic memory
    classifier.ts      # cheap local intent classifier (pre-LLM routing)
    cache.ts           # in-memory TTL cache        rateLimit.ts # api/auth/ai limiters
    money.ts           # currency formatting        stock.ts     # low-stock helpers
    jwt.ts             # sign/verify tokens          invoicePdf.ts# PDF generation
    db.ts              # Mongoose connection
  models/              # 10 Mongoose schemas incl. Memory.ts
  routes/              # auth · chat · memory · dashboard · receipt · pnl ·
                       # invoices · settings · reminders · voice · opportunities
  middleware/auth.ts   # requireAuth (JWT)

client/src/
  Landing.tsx · App.tsx · main.tsx
  pages/               # Login · Register · ForgotPassword
  components/
    dashboard/         # DashboardPage · ChatPage · MemoryPage · PnlPage ·
                       # InvoicesPage · OpportunitiesPage · RemindersPage ·
                       # SettingsPage · Sidebar · …
    Toast.tsx · …
  lib/api.ts           # typed API client (REST + SSE)
  hooks/ · utils/
```

## Contributing

Contributions are welcome — bug reports, features, docs, and translations. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the full guide; the short version:

1. **Open an issue** first for anything non-trivial, so we can agree on the approach.
2. **Fork** the repo and create a branch: `git checkout -b feat/your-thing`.
3. Get it running with the [Docker](#run-with-docker-easiest) or
   [native](#local-development-without-docker) path above.
4. Keep the code style of the surrounding files. Type-check before pushing:
   `npm --prefix server run build` and `npm --prefix client run typecheck`.
5. **Open a pull request** describing what changed and why. Link the issue.

Good first areas: more languages/locales beyond English & Pidgin, additional
currencies, memory strategies (summarization, decay tuning, contradiction handling),
and test coverage. Be respectful and constructive — this project exists to help real
small businesses.

## License

**MIT** — free to use, modify, and distribute. See [`LICENSE`](LICENSE).
```
