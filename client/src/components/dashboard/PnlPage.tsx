import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'
import { api } from '../../lib/api'
import type { PnlData } from '../../lib/api'
import { naira } from '../../lib/format'

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

function Row({ label, value, sign, strong, tone }: { label: string; value: string; sign?: string; strong?: boolean; tone?: 'green' | 'red' }) {
  const valueColor = tone === 'green' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'red' ? 'text-[#EB4A26]' : 'text-zinc-900 dark:text-zinc-100'
  return (
    <div className={`flex items-center justify-between py-3 ${strong ? 'border-t border-zinc-200 dark:border-zinc-700' : ''}`}>
      <span className={`flex items-center gap-2 ${strong ? 'text-base font-semibold text-zinc-900 dark:text-zinc-100' : 'text-sm text-zinc-500'}`}>
        {sign && <span className="w-3 font-mono text-zinc-400">{sign}</span>}
        {label}
      </span>
      <span className={`font-mono ${strong ? 'text-lg font-bold' : 'text-sm font-medium'} ${valueColor}`}>{value}</span>
    </div>
  )
}

export default function PnlPage() {
  const [data, setData] = useState<PnlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api
      .pnl()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load P&L'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return (
    <DashboardLayout title="Are you making money?">
      {loading && (
        <div className="flex flex-col gap-6">
          <div className="h-48 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
          <div className="h-64 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl bg-white border border-zinc-200 py-20 text-center dark:bg-zinc-900 dark:border-zinc-800">
          <Icon icon="solar:cloud-cross-linear" width="30" className="text-[#EB4A26]" />
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      )}

      {!loading && data && data.revenue === 0 && data.expenses === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-20 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <Icon icon="solar:chart-2-linear" width="32" className="text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500">No sales recorded for {data.period} yet.</p>
          <p className="text-xs text-zinc-400">Log a few sales in Chat, then come back to see your profit.</p>
        </div>
      ) : null}

      {!loading && data && (data.revenue > 0 || data.expenses > 0) && (
        <>
          {/* verdict */}
          <section
            className={`relative overflow-hidden rounded-3xl p-7 text-white shadow-sm ${
              data.makingMoney ? 'bg-emerald-600' : 'bg-zinc-900'
            }`}
          >
            <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
            <span className="font-mono text-xs uppercase tracking-widest text-white/70">{data.period} · Net profit</span>
            <div className="mt-2 flex flex-wrap items-end gap-4">
              <span className="font-mono text-5xl font-bold tracking-tight">{naira(data.netProfit)}</span>
              <span className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${data.makingMoney ? 'bg-white/20' : 'bg-[#EB4A26]'}`}>
                <Icon icon={data.makingMoney ? 'solar:check-circle-bold' : 'solar:danger-triangle-bold'} width="16" />
                {data.makingMoney ? 'Yes — you’re making money' : 'Not in profit yet'}
              </span>
            </div>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/90">{data.narrative}</p>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            {/* breakdown */}
            <section className="rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">The breakdown</h2>
              <div className="mt-2 flex flex-col">
                <Row label="Revenue (sales)" value={naira(data.revenue)} />
                <Row label="Cost of goods sold" sign="−" value={naira(data.costOfGoods)} />
                <Row label={`Gross profit · ${pct(data.grossMargin)} margin`} value={naira(data.grossProfit)} strong tone={data.grossProfit >= 0 ? 'green' : 'red'} />
                <Row label="Running expenses" sign="−" value={naira(data.expenses)} />
                <Row label={`Net profit · ${pct(data.netMargin)} margin`} value={naira(data.netProfit)} strong tone={data.netProfit >= 0 ? 'green' : 'red'} />
              </div>
            </section>

            {/* per-item */}
            <section className="rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">What's actually earning</h2>
              {data.items.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">No items sold this month.</p>
              ) : (
                <div className="mt-3 flex flex-col">
                  <div className="flex items-center gap-3 border-b border-zinc-100 pb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400 dark:border-zinc-800">
                    <span className="flex-1">Item</span>
                    <span className="w-14 text-right">Sold</span>
                    <span className="w-24 text-right">Profit</span>
                    <span className="w-16 text-right">Margin</span>
                  </div>
                  {data.items.map((it, i) => {
                    const marginTone = it.margin >= 0.2 ? 'text-emerald-600 dark:text-emerald-400' : it.margin > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[#EB4A26]'
                    return (
                      <div key={it.name} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="flex flex-1 items-center gap-2 truncate font-medium text-zinc-800 dark:text-zinc-100">
                          {i === 0 && <Icon icon="solar:star-bold" width="14" className="text-amber-500" />}
                          {it.name}
                        </span>
                        <span className="w-14 text-right font-mono text-xs text-zinc-400">{it.unitsSold}</span>
                        <span className="w-24 text-right font-mono text-zinc-700 dark:text-zinc-200">{naira(it.profit)}</span>
                        <span className={`w-16 text-right font-mono font-semibold ${marginTone}`}>{pct(it.margin)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
