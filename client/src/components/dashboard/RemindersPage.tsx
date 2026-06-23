import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'
import { api } from '../../lib/api'
import type { Reminder } from '../../lib/api'
import { useToast } from '../Toast'

function dueText(iso: string): { text: string; overdue: boolean } {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return { text: `${-diff} day${-diff === 1 ? '' : 's'} overdue`, overdue: true }
  if (diff === 0) return { text: 'due today', overdue: true }
  if (diff === 1) return { text: 'due tomorrow', overdue: false }
  return { text: `in ${diff} days`, overdue: false }
}
const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function RemindersPage() {
  const toast = useToast()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const r = await api.reminders()
      setReminders(r.reminders)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!text.trim()) return toast.error('What should we remind you about?')
    if (!dueAt) return toast.error('Pick a date & time')
    setBusy(true)
    try {
      await api.createReminder({ text: text.trim(), dueAt })
      toast.success('Kredex will nudge you when it’s due.', 'Reminder set')
      setText('')
      setDueAt('')
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not set reminder')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(r: Reminder, status: 'done' | 'dismissed') {
    setReminders((prev) => prev.map((x) => (x._id === r._id ? { ...x, status } : x)))
    try {
      await api.setReminderStatus(r._id, status)
    } catch {
      void load()
    }
  }

  const pending = reminders.filter((r) => r.status === 'pending')
  const done = reminders.filter((r) => r.status === 'done')

  return (
    <DashboardLayout title="Reminders">
      {/* add */}
      <section className="rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#EB4A26]/10 text-[#EB4A26]">
            <Icon icon="solar:bell-bing-linear" width="18" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Set a reminder</h2>
            <p className="text-sm text-zinc-500">Kredex's autopilot nudges you when it's due. (You can also just tell Kredex in chat: "remind me to call Alhaji Friday".)</p>
          </div>
        </div>
        <form onSubmit={add} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Remind me to…</label>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Call Alhaji Musa to supply rice" className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#EB4A26] focus:ring-2 focus:ring-[#EB4A26]/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">When</label>
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#EB4A26] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          </div>
          <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-[#EB4A26] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#EB4A26]/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60">
            <Icon icon="solar:add-circle-linear" width="17" /> Set
          </button>
        </form>
      </section>

      {/* upcoming / overdue */}
      {loading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <Icon icon="solar:bell-off-linear" width="30" className="text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500">No reminders set. Add one above.</p>
        </div>
      ) : (
        <section className="flex flex-col gap-2.5">
          {pending.map((r) => {
            const d = dueText(r.dueAt)
            return (
              <div key={r._id} className="flex items-center gap-3 rounded-2xl bg-white border border-zinc-200 p-4 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${d.overdue ? 'bg-[#EB4A26]/10 text-[#EB4A26]' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                  <Icon icon="solar:bell-bing-linear" width="18" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{r.text}</p>
                  <p className="text-xs text-zinc-400">
                    {fmt(r.dueAt)} · <span className={d.overdue ? 'font-medium text-[#EB4A26]' : ''}>{d.text}</span>
                  </p>
                </div>
                <button type="button" onClick={() => setStatus(r, 'done')} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400">
                  Done
                </button>
                <button type="button" onClick={() => setStatus(r, 'dismissed')} aria-label="Dismiss" className="text-zinc-400 transition-colors hover:text-[#EB4A26]">
                  <Icon icon="solar:close-circle-linear" width="18" />
                </button>
              </div>
            )
          })}
        </section>
      )}

      {/* done */}
      {done.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-sm font-semibold uppercase tracking-wider text-zinc-500">Done</h3>
          <div className="flex flex-col rounded-3xl bg-white border border-zinc-200 p-2 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            {done.map((r, i) => (
              <div key={r._id} className={`flex items-center gap-3 px-3 py-3 ${i !== done.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}>
                <Icon icon="solar:check-circle-bold" width="18" className="text-emerald-500" />
                <span className="flex-1 truncate text-sm text-zinc-500 line-through">{r.text}</span>
                <span className="font-mono text-[11px] text-zinc-300 dark:text-zinc-600">{fmt(r.dueAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  )
}
