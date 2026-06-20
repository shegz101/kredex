import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { usePlayDing } from '../hooks/usePlayDing'
import KredexMark from './KredexMark'

/*
 * Features — not a generic icon-card row. Each tile renders a small, real-looking
 * slice of the Kredex product (ledger, payroll table, invoice, health gauge,
 * receipt-vision), arranged in an asymmetric bento so the whole thing reads as a
 * product, not a template.
 */

const TILE =
  'rounded-3xl bg-white border border-zinc-200 shadow-sm hover:shadow-xl hover:shadow-[#EB4A26]/5 hover:-translate-y-1 hover:border-[#EB4A26]/30 transition-all duration-300 group relative overflow-hidden flex flex-col'

function TileHead({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-2 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-[#F3F4EF] border border-zinc-200 flex items-center justify-center shadow-sm group-hover:border-[#EB4A26]/30 transition-colors shrink-0">
          <Icon icon={icon} width="18" className="text-[#EB4A26]" />
        </div>
        <h3 className="text-lg tracking-tight font-medium text-zinc-900">{title}</h3>
      </div>
      <p className="text-sm text-zinc-500 mb-5 font-normal relative z-10">{children}</p>
    </>
  )
}

/* A circular SVG progress ring for the health score. */
function HealthGauge({ score = 74 }: { score?: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c * (1 - score / 100)
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#ECECE9" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#EB4A26"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tracking-tight text-zinc-900">{score}</span>
        <span className="text-[11px] text-zinc-400 -mt-0.5">of 100</span>
      </div>
    </div>
  )
}

export default function Features() {
  const playDing = usePlayDing()

  return (
    <section id="features" className="w-full max-w-6xl mx-auto px-6 pb-28 mt-12 relative z-10">
      {/* header */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-white text-[11px] font-medium text-zinc-500 mb-5 shadow-sm">
          <Icon icon="solar:widget-2-linear" width="13" className="text-[#EB4A26]" />
          One conversation, your whole business
        </div>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-zinc-900 to-zinc-600 mb-4 leading-tight">
          Everything your shop needs.
          <br className="hidden sm:block" /> Nothing it doesn't.
        </h2>
        <p className="text-zinc-500 text-sm sm:text-base">
          Kredex remembers every bag of rice, every naira owed, and every payday — so you
          can run the whole thing just by talking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ---- Inventory Brain (large) ---- */}
        <div onMouseEnter={playDing} className={`${TILE} md:col-span-2 p-8`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#EB4A26]/5 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 transition-all duration-500 group-hover:bg-[#EB4A26]/10"></div>
          <TileHead icon="solar:box-linear" title="Inventory Brain">
            Log stock and sales in plain language — Kredex deducts, tracks, and warns you
            before you run out.
          </TileHead>

          <div className="flex-grow grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
            {/* stock list */}
            <div className="sm:col-span-3 bg-[#F3F4EF] rounded-2xl border border-zinc-200 p-3 shadow-inner space-y-2 group-hover:border-zinc-300 transition-colors">
              {[
                { name: 'Rice', qty: '48 bags', w: 'w-3/4', low: false },
                { name: 'Malt', qty: '12 crates', w: 'w-1/5', low: true },
                { name: 'Garri', qty: '60 bags', w: 'w-5/6', low: false },
                { name: 'Sugar', qty: '24 cartons', w: 'w-1/2', low: false },
              ].map((it) => (
                <div
                  key={it.name}
                  className="bg-white rounded-xl border border-zinc-200 px-3 py-2.5 shadow-sm flex items-center gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-zinc-700">{it.name}</span>
                      {it.low ? (
                        <span className="text-[10px] font-medium text-[#EB4A26] bg-[#EB4A26]/10 px-1.5 py-0.5 rounded-full">
                          Low stock
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400">{it.qty}</span>
                      )}
                    </div>
                    <div className="h-1.5 w-full bg-[#F3F4EF] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${it.low ? 'bg-[#EB4A26]' : 'bg-[#EB4A26]/30'} ${it.w}`}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* input caption + auto-update */}
            <div className="sm:col-span-2 flex flex-col gap-3">
              <div className="bg-[#EB4A26] text-white text-[11px] leading-relaxed px-3 py-2.5 rounded-2xl rounded-br-md shadow-sm shadow-[#EB4A26]/20 self-start">
                "Sold 3 crates of malt"
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-3 shadow-sm flex-grow flex flex-col justify-center gap-2">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <Icon icon="solar:check-circle-bold" width="14" className="text-[#EB4A26]" />
                  Malt updated: <span className="text-zinc-900 font-medium">12 left</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <Icon icon="solar:bell-linear" width="14" className="text-[#EB4A26]" />
                  Reorder alert sent
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Business Health Score (tall) ---- */}
        <div onMouseEnter={playDing} className={`${TILE} md:row-span-2 p-8`}>
          <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-[#EB4A26]/5 blur-3xl rounded-full transition-all duration-500 group-hover:bg-[#EB4A26]/10"></div>
          <TileHead icon="solar:heart-pulse-linear" title="Business Health Score">
            A weekly 0–100 read on your shop — debts, stock, payroll, and revenue in one
            number.
          </TileHead>

          <div className="flex-grow flex flex-col items-center justify-center gap-6 relative z-10">
            <HealthGauge score={74} />
            <div className="w-full space-y-3">
              {[
                { label: 'Debt collection', val: '62%', w: 'w-3/5' },
                { label: 'Inventory turnover', val: '81%', w: 'w-4/5' },
                { label: 'Payroll runway', val: '70%', w: 'w-[70%]' },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-500">{b.label}</span>
                    <span className="text-zinc-900 font-medium">{b.val}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#F3F4EF] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-[#EB4A26]/70 ${b.w}`}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full text-[11px] text-zinc-500 bg-[#F3F4EF] border border-zinc-200 rounded-xl px-3 py-2.5">
              <span className="text-[#EB4A26] font-medium">Main concern:</span> ₦32,750 in
              overdue debts.
            </div>
          </div>
        </div>

        {/* ---- Debt Memory ---- */}
        <div onMouseEnter={playDing} className={`${TILE} p-8`}>
          <TileHead icon="solar:wallet-money-linear" title="Debt Memory">
            Per-customer ledgers that never forget who owes what — partial payments and all.
          </TileHead>
          <div className="flex-grow flex flex-col gap-2 relative z-10">
            {[
              { n: 'Emeka O.', a: '₦96,000', s: 'Overdue', tone: 'bg-[#EB4A26]/10 text-[#EB4A26]' },
              { n: 'Mama Bisi', a: '₦90,000', s: 'Due Fri', tone: 'bg-zinc-100 text-zinc-500' },
              { n: 'Chioma A.', a: '₦61,500', s: 'Paid', tone: 'bg-emerald-50 text-emerald-600' },
            ].map((d) => (
              <div
                key={d.n}
                className="flex items-center gap-3 bg-[#F3F4EF]/60 border border-zinc-200/70 rounded-xl px-3 py-2.5 group-hover:border-zinc-300 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#FFDAD1] text-[#EB4A26] text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {d.n.charAt(0)}
                </div>
                <span className="text-xs font-medium text-zinc-700 flex-1">{d.n}</span>
                <span className="text-xs font-semibold text-zinc-900">{d.a}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${d.tone}`}>
                  {d.s}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Payroll Manager ---- */}
        <div onMouseEnter={playDing} className={`${TILE} p-8`}>
          <TileHead icon="solar:users-group-rounded-linear" title="Payroll Manager">
            Register staff and pay cycles. Kredex reminds you before payday — and flags low
            cash.
          </TileHead>
          <div className="flex-grow flex flex-col gap-2 relative z-10">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-zinc-400 font-medium">3 staff</span>
              <span className="text-[#EB4A26] font-medium bg-[#EB4A26]/10 px-2 py-0.5 rounded-full">
                Payday Fri · ₦145,000
              </span>
            </div>
            {[
              { n: 'Tunde', r: 'Sales', a: '₦55,000' },
              { n: 'Ngozi', r: 'Counter', a: '₦50,000' },
              { n: 'Sadiq', r: 'Delivery', a: '₦40,000' },
            ].map((p) => (
              <div
                key={p.n}
                className="flex items-center gap-3 bg-[#F3F4EF]/60 border border-zinc-200/70 rounded-xl px-3 py-2.5 group-hover:border-zinc-300 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {p.n.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-zinc-700 leading-none">{p.n}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{p.r}</div>
                </div>
                <span className="text-xs font-semibold text-zinc-900">{p.a}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Invoice Generation ---- */}
        <div onMouseEnter={playDing} className={`${TILE} p-8`}>
          <TileHead icon="solar:bill-list-linear" title="Invoice Generation">
            Turn a sentence into a branded PDF. Mark it paid by chatting.
          </TileHead>
          <div className="flex-grow flex items-center justify-center relative z-10">
            <div className="w-full bg-white rounded-xl border border-zinc-200 shadow-md p-4 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <KredexMark className="h-5 w-5" />
                  <span className="text-[11px] font-semibold text-zinc-700">INVOICE</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">KRD-007</span>
              </div>
              <div className="text-[10px] text-zinc-400 mb-2">Billed to Emeka O.</div>
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>3 × Bag of rice</span>
                  <span className="text-zinc-700">₦90,000</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>1 × Keg of oil</span>
                  <span className="text-zinc-700">₦6,000</span>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-100 pt-2">
                <span className="text-[11px] text-zinc-400">Total</span>
                <span className="text-sm font-semibold text-zinc-900">₦96,000</span>
              </div>
              <div className="absolute top-8 right-3 rotate-12 border-2 border-emerald-500/70 text-emerald-600 text-[10px] font-bold tracking-wider rounded px-1.5 py-0.5">
                PAID
              </div>
            </div>
          </div>
        </div>

        {/* ---- Receipt Vision (full width) ---- */}
        <div
          onMouseEnter={playDing}
          className={`${TILE} md:col-span-3 p-8 md:p-10 flex-col md:flex-row gap-8 items-center`}
        >
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#EB4A26]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#EB4A26]/10 transition-colors duration-700"></div>

          <div className="flex-1 z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EB4A26]/10 text-[#EB4A26] text-[11px] font-medium mb-4">
              <Icon icon="solar:camera-linear" width="14" />
              Receipt Vision
            </div>
            <h3 className="text-2xl tracking-tight font-medium text-zinc-900 mb-3">
              Snap a supplier receipt. Kredex reads it.
            </h3>
            <p className="text-base text-zinc-500 mb-5 font-normal max-w-lg">
              Photograph a receipt and Kredex extracts every item, quantity, and price — then
              logs it to your stock. No typing. And it understands you in your language.
            </p>
            <div className="flex flex-wrap gap-2">
              {['English', 'Pidgin', 'Yoruba', 'Hausa'].map((l) => (
                <span
                  key={l}
                  className="text-[11px] font-medium text-zinc-600 bg-white border border-zinc-200 px-2.5 py-1 rounded-full shadow-sm"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full flex items-center justify-center gap-4 z-10">
            {/* receipt photo */}
            <div className="w-32 sm:w-36 bg-[#FFFDF8] rounded-lg border border-zinc-200 shadow-md p-3 rotate-[-4deg] group-hover:rotate-[-2deg] transition-transform duration-500 shrink-0">
              <div className="text-[9px] font-mono text-zinc-400 text-center border-b border-dashed border-zinc-300 pb-1.5 mb-1.5">
                ADAEZE STORES
              </div>
              <div className="space-y-1">
                {['Rice  5 ··· 7500', 'Oil   2 ··· 6000', 'Milk 12 ··· 4800', 'Sugar 3 ·· 3600'].map(
                  (line) => (
                    <div key={line} className="text-[9px] font-mono text-zinc-500">
                      {line}
                    </div>
                  ),
                )}
              </div>
              <div className="text-[9px] font-mono text-zinc-700 text-right border-t border-dashed border-zinc-300 pt-1.5 mt-1.5">
                TOTAL 21,900
              </div>
            </div>

            <Icon icon="solar:arrow-right-linear" width="22" className="text-[#EB4A26] shrink-0" />

            {/* parsed result */}
            <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm p-3 max-w-[15rem]">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium mb-2">
                <Icon icon="solar:magic-stick-3-linear" width="13" className="text-[#EB4A26]" />
                Parsed & logged
              </div>
              {[
                ['Rice', '5 bags', '₦7,500'],
                ['Oil', '2 kegs', '₦6,000'],
                ['Milk', '12 tins', '₦4,800'],
              ].map(([n, q, p]) => (
                <div
                  key={n}
                  className="flex items-center justify-between text-[11px] py-1.5 border-b border-zinc-100 last:border-0"
                >
                  <span className="text-zinc-700 font-medium">{n}</span>
                  <span className="text-zinc-400">{q}</span>
                  <span className="text-zinc-900 font-medium">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
