import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import KredexMark from './components/KredexMark'
import dashboardDark from './assets/kredex-dashboard-dark.png'

const ORANGE = '#EB4A26'

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#EB4A26]/20 bg-[#EB4A26]/5 px-3 py-1.5 text-xs font-medium text-[#EB4A26]">
      {children}
    </span>
  )
}

function FeatureCard({
  icon,
  title,
  body,
  className = '',
}: {
  icon: string
  title: string
  body: string
  className?: string
}) {
  return (
    <div
      className={`group relative flex flex-col gap-3 rounded-3xl border border-zinc-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-[#EB4A26]/30 hover:shadow-lg ${className}`}
    >
      <span className="flex size-11 items-center justify-center rounded-2xl bg-[#EB4A26]/10 text-[#EB4A26] transition-transform group-hover:scale-110">
        <Icon icon={icon} width="22" />
      </span>
      <h3 className="text-base font-semibold tracking-tight text-zinc-900">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-500">{body}</p>
    </div>
  )
}

function Step({ n, icon, title, body }: { n: string; icon: string; title: string; body: string }) {
  return (
    <div className="relative flex flex-col items-start gap-4 rounded-3xl border border-zinc-200/70 bg-white/60 p-7">
      <span className="absolute right-6 top-6 text-5xl font-bold tracking-tighter text-zinc-100">{n}</span>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#EB4A26] text-white shadow-lg shadow-[#EB4A26]/25">
        <Icon icon={icon} width="24" />
      </span>
      <h3 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-500">{body}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Landing                                                           */
/* ------------------------------------------------------------------ */

export default function LandingV2() {
  return (
    <div
      id="top"
      className="relative min-h-screen overflow-x-hidden bg-[#F6F4EE] font-sans text-zinc-900 antialiased selection:bg-[#EB4A26]/20"
    >
      {/* background texture + brand glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:34px_34px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_60%,transparent_100%)]" />
        <div className="absolute -top-[15%] left-1/2 h-[45%] w-[65%] -translate-x-1/2 rounded-full bg-[#EB4A26]/12 blur-[130px]" />
      </div>

      {/* ---------------- Navbar ---------------- */}
      <nav className="sticky top-0 z-40 border-b border-transparent backdrop-blur-md transition-colors">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="group flex items-center gap-2">
            <KredexMark className="h-8 w-8 drop-shadow-sm transition-transform group-hover:scale-105" />
            <span className="text-base font-semibold tracking-tight text-zinc-900">Kredex</span>
          </a>

          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm font-medium text-zinc-500 md:flex">
            <a href="#features" className="transition-colors hover:text-zinc-900">Features</a>
            <a href="#memory" className="transition-colors hover:text-zinc-900">Memory</a>
            <a href="#how" className="transition-colors hover:text-zinc-900">How it works</a>
            <a href="#why" className="transition-colors hover:text-zinc-900">Why Kredex</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 sm:block">
              Log in
            </Link>
            <Link
              to="/register"
              className="group flex items-center gap-2 rounded-full bg-[#EB4A26] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-[#EB4A26]/25 transition-all hover:-translate-y-0.5 hover:bg-[#EB4A26]/90"
            >
              Get started
              <Icon icon="solar:arrow-right-linear" width="16" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ---------------- Hero ---------------- */}
      <header className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-10 pt-16 text-center sm:pt-24">
        <Pill>
          <span className="size-2 animate-pulse rounded-full bg-[#EB4A26]" />
          Powered by Qwen Cloud · MemoryAgent
        </Pill>

        <h1 className="mt-8 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tighter sm:text-6xl">
          Bookkeeping that <span className="text-[#EB4A26]">remembers</span> your shop.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-500 sm:text-lg">
          Talk to Kredex in English or Pidgin — it logs your sales, debts, and stock,
          learns how your business works, and recalls it whenever you need. Your shop,
          finally, knows itself.
        </p>

        <div className="mt-9 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/register"
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#EB4A26] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#EB4A26]/25 transition-all hover:-translate-y-0.5 hover:bg-[#EB4A26]/90 sm:w-auto"
          >
            Start free
            <Icon icon="solar:arrow-right-linear" width="18" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#product"
            className="group flex w-full items-center justify-center gap-2 rounded-full border border-zinc-200/80 bg-white px-7 py-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md sm:w-auto"
          >
            <Icon icon="solar:play-circle-linear" width="18" className="text-[#EB4A26] transition-transform group-hover:scale-110" />
            See the dashboard
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5"><Icon icon="solar:check-circle-bold" width="15" className="text-[#EB4A26]" /> No card required</span>
          <span className="flex items-center gap-1.5"><Icon icon="solar:check-circle-bold" width="15" className="text-[#EB4A26]" /> English &amp; Pidgin</span>
          <span className="flex items-center gap-1.5"><Icon icon="solar:check-circle-bold" width="15" className="text-[#EB4A26]" /> Built on Qwen</span>
        </div>
      </header>

      {/* ---------------- Product preview ---------------- */}
      <section id="product" className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <div className="relative">
          {/* floating chips */}
          <div className="absolute -left-3 top-16 z-20 hidden animate-[float_6s_ease-in-out_infinite] rounded-2xl border border-zinc-200/70 bg-white/90 px-4 py-3 shadow-xl backdrop-blur sm:block">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#7C5CFF]/12 text-[#7C5CFF]"><Icon icon="solar:cpu-bolt-linear" width="18" /></span>
              <div className="text-left">
                <p className="text-xs font-semibold text-zinc-900">Memory updated</p>
                <p className="text-[11px] text-zinc-400">“Tunde pays on Fridays”</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-3 bottom-16 z-20 hidden animate-[float_7s_ease-in-out_infinite] rounded-2xl border border-zinc-200/70 bg-white/90 px-4 py-3 shadow-xl backdrop-blur sm:block">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#2E9C6E]/12 text-[#2E9C6E]"><Icon icon="solar:banknote-2-linear" width="18" /></span>
              <div className="text-left">
                <p className="text-xs font-semibold text-zinc-900">Revenue this month</p>
                <p className="text-[11px] text-zinc-400">+18% vs last month</p>
              </div>
            </div>
          </div>

          {/* browser frame */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70 p-2 shadow-[0_40px_90px_-25px_rgba(10,11,12,0.35)] backdrop-blur-md">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="size-3 rounded-full bg-[#EB4A26]/70" />
              <span className="size-3 rounded-full bg-amber-400/70" />
              <span className="size-3 rounded-full bg-emerald-400/70" />
              <span className="ml-3 hidden rounded-md bg-zinc-100 px-3 py-1 text-[11px] text-zinc-400 sm:block">app.kredex.xyz/dashboard</span>
            </div>
            <img
              src={dashboardDark}
              alt="The Kredex dashboard — total owed, revenue, business health, and overdue reminders"
              className="w-full rounded-xl border border-zinc-900/10"
            />
          </div>
        </div>

        {/* trust strip */}
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Built on a modern, multilingual AI stack</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-zinc-500">
            <span className="flex items-center gap-2"><Icon icon="solar:magic-stick-3-linear" width="18" className="text-[#EB4A26]" /> Qwen Cloud models</span>
            <span className="flex items-center gap-2"><Icon icon="solar:global-linear" width="18" className="text-[#EB4A26]" /> Alibaba Cloud</span>
            <span className="flex items-center gap-2"><Icon icon="solar:shield-check-linear" width="18" className="text-[#EB4A26]" /> JWT-secured</span>
            <span className="flex items-center gap-2"><Icon icon="solar:translation-2-linear" width="18" className="text-[#EB4A26]" /> English &amp; Pidgin</span>
          </div>
        </div>
      </section>

      {/* ---------------- Features (bento) ---------------- */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Pill>Everything your shop needs</Pill>
          <h2 className="mt-5 text-3xl font-semibold tracking-tighter sm:text-4xl">
            One assistant. Your whole business.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-500">
            Kredex replaces the notebook, the calculator, and the mental math — and remembers
            everything so you don’t have to.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* big highlight card */}
          <div className="group relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-[#EB4A26]/20 bg-gradient-to-br from-[#EB4A26] to-[#c73a1a] p-8 text-white shadow-lg shadow-[#EB4A26]/20 md:col-span-2 md:row-span-2">
            <div className="absolute -right-10 -top-10 size-56 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
                <Icon icon="solar:cpu-bolt-linear" width="26" />
              </span>
              <h3 className="mt-6 max-w-md text-2xl font-semibold tracking-tight">
                A long-term memory for your shop
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">
                Kredex distils every conversation into typed memories — who pays late, your
                supplier terms, your reorder rules — then recalls the right ones on every reply.
                It gets sharper the more you use it.
              </p>
            </div>
            <div className="relative flex flex-wrap gap-2">
              {['Remembers customers', 'Learns your habits', 'Recalls on demand', 'Forgets the noise'].map((t) => (
                <span key={t} className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">{t}</span>
              ))}
            </div>
          </div>

          <FeatureCard icon="solar:chat-round-line-linear" title="Conversational bookkeeping" body="Just say what happened — “sold 3 bags of rice to Amaka on credit” — and it’s recorded, correctly." />
          <FeatureCard icon="solar:camera-minimalistic-linear" title="Receipt photo OCR" body="Snap a supplier receipt; Kredex reads the line items and logs your stock in seconds." />
          <FeatureCard icon="solar:microphone-2-linear" title="Talk & listen" body="Log entries with your voice and let Kredex read replies back — hands-free bookkeeping." />
          <FeatureCard icon="solar:bill-list-linear" title="Invoices & PDF" body="Generate numbered invoices from chat, mark paid or unpaid, and download a clean PDF." />
          <FeatureCard icon="solar:chart-2-linear" title="Profit & Loss" body="A plain-language “are you making money?” verdict from revenue, cost of goods, and expenses." />
          <FeatureCard icon="solar:bell-bing-linear" title="Smart notifications" body="Due reminders, low-stock alerts, and credit payments that have reached their due date." />
          <FeatureCard icon="solar:rocket-2-linear" title="Opportunity Scout" body="Finds grants, events, and programs relevant to your shop — with live web search." />
          <FeatureCard icon="solar:wallet-money-linear" title="Debts & credit" body="Track who owes what, set due dates, and record part-payments — balances never drift." />
        </div>
      </section>

      {/* ---------------- Memory spotlight ---------------- */}
      <section id="memory" className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <Pill>The MemoryAgent core</Pill>
            <h2 className="mt-5 text-3xl font-semibold tracking-tighter sm:text-4xl">
              Your shop knows itself.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-500">
              Most tools forget the moment you close the app. Kredex keeps a structured,
              long-term memory — and recalls the critical few facts, scored by relevance,
              importance, and recency, on every single answer.
            </p>
            <ul className="mt-7 flex flex-col gap-4">
              {[
                ['solar:verified-check-bold', 'Typed, durable memory', 'Facts, preferences, and events — not a wall of raw chat history.'],
                ['solar:restart-linear', 'Learns and forgets', 'Recalled memories are reinforced; stale ones fade automatically.'],
                ['solar:magic-stick-3-linear', 'Optimized recall', 'Scored + diverse selection under a token budget — the right context, every time.'],
              ].map(([icon, t, b]) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#EB4A26]/10 text-[#EB4A26]">
                    <Icon icon={icon} width="18" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900">{t}</span>
                    <span className="block text-sm text-zinc-500">{b}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* memory mock card */}
          <div className="relative">
            <div className="absolute inset-0 -z-0 rounded-3xl bg-[#EB4A26]/10 blur-2xl" />
            <div className="relative rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Icon icon="solar:cpu-bolt-linear" width="18" className="text-[#7C5CFF]" /> What Kredex remembers
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500">12 memories</span>
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {[
                  ['#EB4A26', 'Fact', 'Tunde buys on credit, settles at month-end'],
                  ['#7C5CFF', 'Preference', 'Closes at 4pm on Fridays'],
                  ['#C67A12', 'Event', 'Alhaji Musa delivers rice on Tuesdays'],
                  ['#EB4A26', 'Fact', 'Reorder garri below 5 bags'],
                ].map(([c, k, t]) => (
                  <div key={t} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: c, background: `${c}1a` }}>{k}</span>
                    <span className="text-sm text-zinc-700">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Pill>How it works</Pill>
          <h2 className="mt-5 text-3xl font-semibold tracking-tighter sm:text-4xl">Three steps. No spreadsheets.</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Step n="01" icon="solar:chat-round-line-linear" title="Talk to it" body="Type or speak what happened — a sale, a payment, new stock, a debt. In your own words." />
          <Step n="02" icon="solar:cpu-bolt-linear" title="It remembers" body="Kredex records it, then distils the durable facts about your shop into long-term memory." />
          <Step n="03" icon="solar:chart-2-linear" title="It works for you" body="Ask anything — debts, stock, profit — and get answers backed by real knowledge of your shop." />
        </div>
      </section>

      {/* ---------------- Stats / Why ---------------- */}
      <section id="why" className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-zinc-200/70 bg-white/60 p-10 backdrop-blur">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              ['4', 'languages understood'],
              ['7', 'Qwen models orchestrated'],
              ['1', 'notebook you can retire'],
              ['∞', 'things it remembers'],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="text-4xl font-bold tracking-tighter text-[#EB4A26] sm:text-5xl">{n}</div>
                <div className="mt-2 text-sm text-zinc-500">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#EB4A26] to-[#b8330f] px-8 py-16 text-center text-white shadow-2xl shadow-[#EB4A26]/25 sm:px-16">
          <div className="absolute -left-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 size-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tighter sm:text-4xl">
              Give your shop a memory today.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/85">
              Set up in minutes. Start logging by chat, and watch Kredex learn your business.
            </p>
            <Link
              to="/register"
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#EB4A26] shadow-lg transition-all hover:-translate-y-0.5"
            >
              Get started free
              <Icon icon="solar:arrow-right-linear" width="18" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="relative z-10 border-t border-zinc-200/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <KredexMark className="h-7 w-7" />
            <span className="text-sm font-semibold text-zinc-900">Kredex</span>
            <span className="ml-2 text-xs text-zinc-400">The AI bookkeeper that remembers your shop.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="#features" className="transition-colors hover:text-zinc-900">Features</a>
            <a href="#memory" className="transition-colors hover:text-zinc-900">Memory</a>
            <Link to="/login" className="transition-colors hover:text-zinc-900">Log in</Link>
            <Link to="/register" className="transition-colors hover:text-zinc-900">Get started</Link>
          </div>
        </div>
        <div className="border-t border-zinc-200/70 py-5 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Kredex · Built on Qwen Cloud, deployed on Alibaba Cloud.
        </div>
      </footer>

      {/* float keyframes */}
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}
