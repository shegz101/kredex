import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'
import { api } from '../../lib/api'
import type { Approval, RestockItem } from '../../lib/api'
import { useToast } from '../Toast'

/** wa.me deep link — free WhatsApp message, normalising local NG numbers. */
function waLink(phone: string, text: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.startsWith('0')) p = '234' + p.slice(1)
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`
}

/** Compact "2h ago" / "3d ago" relative time for the timeline. */
function timeAgo(iso?: string): string {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const KIND: Record<Approval['kind'], { label: string; icon: string; approve: string }> = {
  reminder: { label: 'Reminder', icon: 'solar:bell-bing-linear', approve: 'Mark done' },
  overdue_debt: { label: 'Overdue debt', icon: 'solar:wallet-money-linear', approve: 'Approve & send' },
  low_stock: { label: 'Low stock', icon: 'solar:box-linear', approve: 'Add to restock' },
  eod_summary: { label: 'End of day', icon: 'solar:chart-2-linear', approve: 'Got it' },
}

/** Timeline node styling per lifecycle state. */
const STATE: Record<Approval['status'], { dot: string; ring: string; verb: string }> = {
  pending: { dot: 'bg-amber-400', ring: 'ring-amber-400/30', verb: 'Awaiting your approval' },
  approved: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/20', verb: 'Approved' },
  dismissed: { dot: 'bg-zinc-300 dark:bg-zinc-600', ring: 'ring-zinc-400/10', verb: 'Skipped' },
}

export default function AutopilotPage() {
  const [pending, setPending] = useState<Approval[]>([])
  const [timeline, setTimeline] = useState<Approval[]>([])
  const [restock, setRestock] = useState<RestockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [restockingId, setRestockingId] = useState<string | null>(null)
  const toast = useToast()

  async function load() {
    try {
      const [appr, tl, rs] = await Promise.all([api.approvals(), api.timeline(), api.restockList()])
      setPending(appr.pending)
      setTimeline(tl.items)
      setRestock(rs.items)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function runScan() {
    setScanning(true)
    try {
      const r = await api.scan()
      await load()
      toast.info(r.created ? `Raised ${r.created} new item${r.created === 1 ? '' : 's'}.` : 'Nothing new — all clear.', 'Scan complete')
    } finally {
      setScanning(false)
    }
  }

  async function approve(a: Approval) {
    setActingId(a._id)
    try {
      // overdue-debt alerts → open WhatsApp (or copy) so the reminder actually goes out
      if (a.kind === 'overdue_debt' && a.draft) {
        const phone = a.payload?.phone as string | undefined | null
        if (phone) {
          window.open(waLink(phone, a.draft), '_blank')
          toast.success('Opening WhatsApp with the reminder.', 'Reminder ready')
        } else {
          navigator.clipboard?.writeText(a.draft).catch(() => {})
          toast.info('No phone saved — reminder copied. Tell Kredex their number to send on WhatsApp.', 'Copied')
        }
      }
      if (a.kind === 'low_stock') toast.success('Added to your restock list.', 'Done')
      await api.approveApproval(a._id)
      await load()
    } finally {
      setActingId(null)
    }
  }

  async function dismiss(id: string) {
    setActingId(id)
    try {
      await api.dismissApproval(id)
      await load()
    } finally {
      setActingId(null)
    }
  }

  async function markRestocked(item: RestockItem) {
    setRestockingId(item.id)
    try {
      await api.markRestocked(item.id)
      await load()
      toast.success(`${item.name} cleared from your restock list.`, 'Restocked')
    } finally {
      setRestockingId(null)
    }
  }

  return (
    <DashboardLayout title="Autopilot">
      {/* intro */}
      <section className="flex flex-col gap-4 rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#EB4A26]/10 text-[#EB4A26]">
            <Icon icon="solar:bolt-circle-linear" width="24" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Kredex is watching your shop
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              It scans for overdue debts, low stock, and your day's numbers — then waits for your yes. Nothing happens without you.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={runScan}
          disabled={scanning}
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60 dark:bg-white dark:text-zinc-900"
        >
          <Icon icon="solar:refresh-linear" width="16" className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scanning…' : 'Run scan now'}
        </button>
      </section>

      {/* pending */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Needs your approval</h3>
          {pending.length > 0 && (
            <span className="rounded-full bg-[#EB4A26]/10 px-2 py-0.5 text-[11px] font-semibold text-[#EB4A26]">
              {pending.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-40 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <Icon icon="solar:check-circle-bold" width="34" className="text-emerald-500" />
            <p className="text-sm text-zinc-500">All caught up. Autopilot will raise the next thing here.</p>
            <p className="text-xs text-zinc-400">Tip: log a credit sale with a past due date, then hit "Run scan now".</p>
          </div>
        ) : (
          pending.map((a) => {
            const k = KIND[a.kind]
            const busy = actingId === a._id
            return (
              <article key={a._id} className="rounded-3xl bg-white border border-zinc-200 p-5 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EB4A26]/10 text-[#EB4A26]">
                    <Icon icon={k.icon} width="20" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">{k.label}</span>
                    <h4 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{a.title}</h4>
                    <p className="mt-0.5 text-sm text-zinc-500">{a.body}</p>
                    {a.context && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-[#EB4A26]/90">
                        <Icon icon="solar:lightbulb-bolt-linear" width="14" className="mt-0.5 shrink-0" />
                        <span><span className="font-medium">Kredex remembered:</span> {a.context}</span>
                      </p>
                    )}
                    {a.draft && (
                      <div className="mt-3 rounded-2xl border border-zinc-200 bg-[#F3F4EF]/70 p-3 text-sm italic text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                        "{a.draft}"
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 sm:pl-13">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => approve(a)}
                    className="flex items-center gap-2 rounded-full bg-[#EB4A26] px-5 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {busy ? <Icon icon="solar:refresh-linear" width="15" className="animate-spin" /> : <Icon icon="solar:check-circle-bold" width="15" />}
                    {k.approve}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => dismiss(a._id)}
                    className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                  >
                    Skip
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>

      {/* restock list */}
      {restock.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Restock list</h3>
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {restock.length}
            </span>
          </div>
          <div className="flex flex-col rounded-3xl bg-white border border-zinc-200 p-2 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            {restock.map((item, i) => {
              const unit = item.unit ? ` ${item.unit}` : ''
              const busy = restockingId === item.id
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-3 ${i !== restock.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400">
                    <Icon icon="solar:box-linear" width="18" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{item.name}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {item.quantity}
                      {unit} left
                      {item.restockQty != null && <> · reorder ~{item.restockQty}{unit}</>}
                      {item.supplier && <> · from {item.supplier}</>}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => markRestocked(item)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {busy ? (
                      <Icon icon="solar:refresh-linear" width="13" className="animate-spin" />
                    ) : (
                      <Icon icon="solar:check-read-linear" width="13" />
                    )}
                    Restocked
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* activity timeline */}
      {timeline.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="px-1 text-sm font-semibold uppercase tracking-wider text-zinc-500">Activity timeline</h3>
          <div className="rounded-3xl bg-white border border-zinc-200 p-5 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            <ol className="relative flex flex-col">
              {timeline.map((a, i) => {
                const k = KIND[a.kind]
                const st = STATE[a.status]
                const last = i === timeline.length - 1
                return (
                  <li key={a._id} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* connector line */}
                    {!last && <span className="absolute left-[7px] top-5 h-full w-px bg-zinc-200 dark:bg-zinc-700" />}
                    {/* node */}
                    <span className={`relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full ring-4 ${st.dot} ${st.ring} ${a.status === 'pending' ? 'animate-pulse' : ''}`} />
                    <div className="min-w-0 flex-1 -mt-0.5">
                      <div className="flex items-center gap-2">
                        <Icon icon={k.icon} width="14" className="shrink-0 text-zinc-400" />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">{k.label}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-zinc-300 dark:text-zinc-600">{timeAgo(a.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-100">{a.title}</p>
                      {a.context && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-[#EB4A26]/80">
                          <Icon icon="solar:lightbulb-bolt-linear" width="12" className="mt-0.5 shrink-0" />
                          <span className="truncate">{a.context}</span>
                        </p>
                      )}
                      <p className={`mt-1 text-xs ${a.status === 'pending' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'}`}>
                        {a.status === 'pending' ? (
                          st.verb
                        ) : (
                          <>
                            {st.verb}
                            {a.result ? ` · ${a.result}` : ''}
                            {a.resolvedAt ? ` · ${timeAgo(a.resolvedAt)}` : ''}
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>
      )}
    </DashboardLayout>
  )
}
