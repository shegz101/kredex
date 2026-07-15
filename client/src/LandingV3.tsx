import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import KredexMark from './components/KredexMark'
import dashboardDark from './assets/kredex-dashboard-dark.png'
import shopScene from './assets/kredex-shop-scene.jpg'

/*
 * Landing V3 — "The Kredex Ledger", an editorial / vintage-gazette landing page.
 * Inspiration: warm paper poster, big display serif, drop-capped columns, and a
 * painterly Nigerian market scene (kredex-shop-scene.jpg) where merchants keep
 * their books on a Kredex dashboard — so a vendor instantly reads what it does.
 *
 * Type: Fraunces (display serif) + JetBrains Mono (labels), loaded in index.html.
 * Palette: warm cream paper + ink brown + Kredex orange (a touch lighter in fills).
 * Self-contained — does not touch the other landing pages.
 */

const INK = '#2A2622'
const ORANGE = '#EB4A26'
const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"

/* ------------------------------------------------------------------ */
/*  Small editorial building blocks                                    */
/* ------------------------------------------------------------------ */

function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span style={{ fontFamily: MONO }} className={`uppercase tracking-[0.24em] ${className}`}>
      {children}
    </span>
  )
}

function Serif({
  children,
  className = '',
  italic = false,
}: {
  children: React.ReactNode
  className?: string
  italic?: boolean
}) {
  return (
    <span style={{ fontFamily: DISPLAY, fontStyle: italic ? 'italic' : 'normal' }} className={className}>
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  A retro device that frames the REAL dashboard screenshot           */
/* ------------------------------------------------------------------ */

function LedgerDevice() {
  return (
    <div className="relative">
      <div className="rounded-[26px] border-[3px] border-[#2A2622] bg-[#2A2622] p-3 shadow-[10px_12px_0_rgba(42,38,34,0.18)]">
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <span className="h-2 w-2 rounded-full" style={{ background: ORANGE }} />
          <span className="h-2 w-2 rounded-full bg-[#E3A63C]" />
          <span className="h-2 w-2 rounded-full bg-[#8A9A5B]" />
          <Mono className="ml-auto text-[9px] text-[#F4ECDC]/70">KREDEX · LIVE</Mono>
        </div>
        <img src={dashboardDark} alt="The Kredex dashboard — owed, revenue, health, reminders" className="w-full rounded-[14px] border border-black/40" />
      </div>
      <div className="absolute -bottom-3 left-1/2 h-3 w-24 -translate-x-1/2 rounded-b-xl bg-[#2A2622]" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const LEDGER: { no: string; title: string; body: string; icon: string }[] = [
  { no: '01', title: 'Sales & credit', body: 'Say “Iya Tunde took 5 bags, she go pay Saturday.” Logged — cash or credit.', icon: 'solar:cart-large-2-linear' },
  { no: '02', title: 'Debts & reminders', body: 'It tracks who owes what and nudges you the day a payment is due.', icon: 'solar:wallet-money-linear' },
  { no: '03', title: 'Receipt photos', body: 'Snap a supplier receipt; Kredex reads the items and logs your stock.', icon: 'solar:camera-linear' },
  { no: '04', title: 'Voice logging', body: 'Talk in English or Pidgin and Kredex writes the books — and talks back.', icon: 'solar:microphone-3-linear' },
  { no: '05', title: 'Profit verdict', body: 'A plain-language answer to the only question that matters: are you making money?', icon: 'solar:chart-2-linear' },
  { no: '06', title: 'A memory that learns', body: 'Prices, habits, terms — remembered across every chat, sharper every day.', icon: 'solar:cpu-bolt-linear' },
]

const STEPS = [
  { n: 'I', t: 'You tell it', d: 'In your own words — typed, spoken, or a photo of a receipt. No forms, no menus.' },
  { n: 'II', t: 'It keeps the books', d: 'Sales, debts, stock and expenses recorded to your ledger the moment you say them.' },
  { n: 'III', t: 'It remembers', d: 'Your prices, customers and habits stay known across every conversation, forever.' },
]

export default function LandingV3() {
  return (
    <div style={{ backgroundColor: '#F4ECDC', color: INK, fontFamily: DISPLAY }} className="min-h-screen w-full overflow-x-hidden antialiased selection:bg-[#EB4A26]/20">
      {/* faint paper vignette */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: 'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.5), transparent 60%), radial-gradient(100% 60% at 50% 120%, rgba(42,38,34,0.05), transparent 60%)' }} />

      <div className="relative z-10 mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* ---- masthead bar ---- */}
        <header className="flex items-center justify-between gap-4 border-b-2 border-[#2A2622] py-4">
          <div className="flex items-center gap-2">
            <KredexMark className="h-6 w-6" />
            <Mono className="text-[10px] sm:text-[11px]">Kredex Ledger Co.</Mono>
          </div>
          <Mono className="hidden text-[10px] text-[#2A2622]/70 md:block">AI Bookkeeping for Shops · Stores · Vendors</Mono>
          <Link to="/register" className="group inline-flex items-center gap-1.5 border-2 border-[#2A2622] px-3 py-1.5 text-[#2A2622] transition-colors hover:bg-[#2A2622] hover:text-[#F4ECDC]">
            <Mono className="text-[10px] font-semibold">Open the ledger</Mono>
            <Icon icon="solar:arrow-right-linear" width="14" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </header>

        {/* ---- hero masthead ---- */}
        <section className="pt-10 text-center sm:pt-14">
          <Mono className="text-[10px] text-[#EB4A26] sm:text-[11px]">The Kredex Bookkeeping System presents</Mono>
          <h1 className="mt-4 leading-[0.9]">
            <Serif className="block text-[19vw] font-semibold tracking-tight sm:text-[150px]">Kredex</Serif>
          </h1>
          <div className="mx-auto mt-4 flex max-w-2xl items-center gap-4">
            <span className="h-px flex-1 bg-[#2A2622]/40" />
            <Mono className="text-[10px] text-[#2A2622]/70">Conversational bookkeeping · remembered</Mono>
            <span className="h-px flex-1 bg-[#2A2622]/40" />
          </div>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[#2A2622]/80">
            <Serif italic>Keep your shop’s books by simply talking.</Serif> Kredex records every sale, debt and
            restock — and never forgets what it learns about your store.
          </p>
        </section>

        {/* ---- hero illustration ---- */}
        <section className="mt-8">
          <div className="rounded-[10px] border-2 border-[#2A2622] bg-[#F6EFDF] p-2 shadow-[12px_14px_0_rgba(42,38,34,0.12)]">
            <img
              src={shopScene}
              alt="Nigerian shop owners at their store — shelves of goods, a delivery truck and Vespa — with their books kept on a Kredex dashboard"
              className="w-full rounded-[6px] border border-[#2A2622]/25"
            />
          </div>
          <p className="mt-4 text-center">
            <Mono className="text-[10px] text-[#2A2622]/70">An AI bookkeeper for the merchants who keep the market moving</Mono>
          </p>
          {/* CTAs */}
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-white shadow-[0_10px_24px_-8px_rgba(235,74,38,0.6)] transition-transform hover:-translate-y-0.5 sm:w-auto" style={{ background: ORANGE }}>
              <Serif className="text-lg font-medium">Start free</Serif>
              <Icon icon="solar:arrow-right-linear" width="18" />
            </Link>
            <Link to="/login" className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#2A2622] px-7 py-3.5 transition-colors hover:bg-[#2A2622] hover:text-[#F4ECDC] sm:w-auto">
              <Serif className="text-lg font-medium">Log in</Serif>
            </Link>
          </div>
        </section>

        {/* ---- editorial thesis ---- */}
        <section className="mx-auto mt-24 max-w-4xl text-center">
          <Mono className="text-[10px] text-[#2A2622]/60">One shop · one memory · every sale accounted for</Mono>
          <h2 className="mx-auto mt-5 max-w-3xl text-[34px] leading-[1.06] sm:text-[52px]">
            <Serif italic className="font-medium">Because your books shouldn’t live in ten different notebooks.</Serif>
          </h2>
        </section>

        {/* two justified columns with drop caps */}
        <section className="mx-auto mt-10 grid max-w-4xl gap-10 text-[15px] leading-relaxed text-[#2A2622]/85 sm:grid-cols-2">
          <p className="text-justify">
            <span style={{ fontFamily: DISPLAY }} className="float-left mr-2 mt-1 text-[52px] font-semibold leading-[0.7] text-[#EB4A26]">F</span>
            or most shop owners the record of the business lives in a paper book, a phone gallery of
            receipts, and their own head. Kredex turns all of that into one plain conversation: tell it
            what happened and it keeps the ledger — sales, credit, stock, expenses — cleanly and correctly.
          </p>
          <p className="text-justify">
            <span style={{ fontFamily: DISPLAY }} className="float-left mr-2 mt-1 text-[52px] font-semibold leading-[0.7] text-[#EB4A26]">A</span>
            nd it <Serif italic>remembers</Serif>. Your selling and cost prices, who pays late but always pays,
            which supplier gives seven days — recalled in every future chat, even a brand-new one. Ask “how much
            do I sell rice for?” months later and the answer is simply there.
          </p>
        </section>

        {/* ---- control block + device ---- */}
        <section className="mt-24 grid items-center gap-12 md:grid-cols-2">
          <div>
            <Mono className="text-[10px] text-[#EB4A26]">Ledger No. 001</Mono>
            <h3 className="mt-3 text-3xl sm:text-4xl">
              <Serif className="font-medium">You talk. Kredex writes.</Serif>
            </h3>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#2A2622]/80">
              No spreadsheets, no accounting jargon, no ten tabs. The owner stays in control — Kredex just does
              the paperwork, in the background, in your language.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                ['solar:chat-round-line-linear', 'English or Nigerian Pidgin — typed or spoken'],
                ['solar:bell-linear', 'Reminders the day a debt or restock falls due'],
                ['solar:shield-check-linear', 'Your data, your shop — nothing autonomous'],
              ].map(([icon, label]) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#2A2622]">
                    <Icon icon={icon} width="16" />
                  </span>
                  <span className="text-[15px] text-[#2A2622]/85">{label}</span>
                </li>
              ))}
            </ul>
          </div>
          <LedgerDevice />
        </section>

        {/* ---- how it works ---- */}
        <section className="mt-24">
          <div className="flex items-center gap-4">
            <Mono className="text-[10px] text-[#2A2622]/60">How it keeps your books</Mono>
            <span className="h-px flex-1 bg-[#2A2622]/30" />
          </div>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t-2 border-[#2A2622] pt-5">
                <Serif className="block text-5xl font-semibold text-[#EB4A26]">{s.n}</Serif>
                <h4 className="mt-3 text-xl">
                  <Serif className="font-medium">{s.t}</Serif>
                </h4>
                <p className="mt-2 text-[14px] leading-relaxed text-[#2A2622]/80">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- the ledger (features) ---- */}
        <section className="mt-24">
          <div className="text-center">
            <Mono className="text-[10px] text-[#EB4A26]">Everything a shop needs — one book</Mono>
            <h3 className="mt-4 text-3xl sm:text-5xl">
              <Serif italic className="font-medium">The Kredex ledger</Serif>
            </h3>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-[10px] border-2 border-[#2A2622] bg-[#2A2622] sm:grid-cols-2 lg:grid-cols-3">
            {LEDGER.map((f) => (
              <div key={f.no} className="group bg-[#F4ECDC] p-6 transition-colors hover:bg-[#F6EFDF]">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-[#2A2622] text-[#2A2622] transition-colors group-hover:bg-[#EB4A26] group-hover:border-[#EB4A26] group-hover:text-white">
                    <Icon icon={f.icon} width="18" />
                  </span>
                  <Mono className="text-[11px] text-[#2A2622]/40">{f.no}</Mono>
                </div>
                <h4 className="mt-4 text-xl">
                  <Serif className="font-medium">{f.title}</Serif>
                </h4>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#2A2622]/75">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- pull quote ---- */}
        <section className="mx-auto mt-24 max-w-3xl text-center">
          <Serif className="block text-[80px] leading-[0.5] text-[#EB4A26]">&ldquo;</Serif>
          <blockquote className="mt-5 text-[26px] leading-[1.25] sm:text-[34px]">
            <Serif italic>“Your shop, finally, knows itself — every price, every debt, every regular, kept in one memory that never forgets.”</Serif>
          </blockquote>
          <p className="mt-6">
            <Mono className="text-[10px] text-[#2A2622]/60">Powered by Qwen Cloud · Built for the market</Mono>
          </p>
        </section>

        {/* ---- CTA ---- */}
        <section className="mt-24">
          <div className="relative overflow-hidden rounded-[14px] border-2 border-[#2A2622] px-8 py-14 text-center" style={{ background: ORANGE }}>
            <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.4) 12px, rgba(255,255,255,0.4) 13px)' }} />
            <div className="relative">
              <h3 className="text-4xl text-white sm:text-6xl">
                <Serif className="font-semibold">Open your shop’s ledger today.</Serif>
              </h3>
              <p className="mx-auto mt-4 max-w-lg text-white/90">Free to start. Talk to Kredex like you’d talk to your most trusted apprentice.</p>
              <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[#2A2622] shadow-lg transition-transform hover:-translate-y-0.5">
                <Serif className="text-lg font-semibold">Start free</Serif>
                <Icon icon="solar:arrow-right-linear" width="18" />
              </Link>
            </div>
          </div>
        </section>

        {/* ---- footer colophon ---- */}
        <footer className="mt-20 border-t-2 border-[#2A2622] py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <KredexMark className="h-6 w-6" />
              <Serif className="text-lg font-semibold">Kredex</Serif>
            </div>
            <Mono className="text-[10px] text-[#2A2622]/60">Know what you’re owed · Know your business</Mono>
            <div className="flex items-center gap-4">
              <Link to="/login"><Mono className="text-[10px] hover:text-[#EB4A26]">Log in</Mono></Link>
              <Link to="/register"><Mono className="text-[10px] hover:text-[#EB4A26]">Start free</Mono></Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
