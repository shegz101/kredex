import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'
import { api } from '../../lib/api'
import type { Approval } from '../../lib/api'
import { useToast } from '../Toast'

/** wa.me deep link — free WhatsApp message, normalising local NG numbers. */
function waLink(phone: string, text: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.startsWith('0')) p = '234' + p.slice(1)
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`
}

const KIND: Record<Approval['kind'], { label: string; icon: string; approve: string }> = {
  reminder: { label: 'Reminder', icon: 'solar:bell-bing-linear', approve: 'Mark done' },
  overdue_debt: { label: 'Overdue debt', icon: 'solar:wallet-money-linear', approve: 'Approve & send' },
  low_stock: { label: 'Low stock', icon: 'solar:box-linear', approve: 'Add to restock' },
  eod_summary: { label: 'End of day', icon: 'solar:chart-2-linear', approve: 'Got it' },
}

export default function AutopilotPage() {
  const [pending, setPending] = useState<Approval[]>([])
  const [recent, setRecent] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const toast = useToast()

  async function load() {
    try {
      const r = await api.approvals()
      setPending(r.pending)
      setRecent(r.recent)
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
      await api.scan()
      await load()
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

      {/* recent */}
      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="px-1 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recently handled</h3>
          <div className="flex flex-col rounded-3xl bg-white border border-zinc-200 p-2 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            {recent.map((a, i) => (
              <div
                key={a._id}
                className={`flex items-center gap-3 px-3 py-3 ${i !== recent.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
              >
                <Icon
                  icon={a.status === 'approved' ? 'solar:check-circle-bold' : 'solar:close-circle-linear'}
                  width="18"
                  className={a.status === 'approved' ? 'text-emerald-500' : 'text-zinc-400'}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">{a.title}</p>
                  <p className="truncate text-xs text-zinc-400">{a.result}</p>
                </div>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-zinc-300 dark:text-zinc-600">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  )
}
