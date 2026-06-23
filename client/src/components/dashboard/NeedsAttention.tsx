import { useState } from 'react'
import { Icon } from '@iconify/react'
import type { DashboardData } from '../../lib/api'
import { useMoney } from '../../lib/useMoney'
import { useToast } from '../Toast'

type OverdueItem = DashboardData['overdue'][number]

/** wa.me deep link — free, no API. Normalises Nigerian local numbers to intl. */
function waLink(phone: string, text: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.startsWith('0')) p = '234' + p.slice(1)
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`
}

function OverdueRow({ item }: { item: OverdueItem }) {
  const toast = useToast()
  const { money } = useMoney()
  const [sent, setSent] = useState(false)
  const message = item.draft || `Good day ${item.name}, a gentle reminder that ${money(item.amount)} is outstanding. Kindly settle when convenient. Thank you!`

  function sendReminder() {
    if (item.phone) {
      window.open(waLink(item.phone, message), '_blank')
      setSent(true)
      toast.success(`Opening WhatsApp to message ${item.name}.`, 'Reminder ready')
    } else {
      navigator.clipboard?.writeText(message).catch(() => {})
      toast.info(`No phone saved for ${item.name}. Message copied — tell Kredex their number to send on WhatsApp.`, 'Copied')
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-[#F3F4EF]/60 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EB4A26]/10 text-[11px] font-semibold text-[#EB4A26]">
          {item.initials}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{item.name}</span>
          <span className="font-mono text-xs text-zinc-400">
            {money(item.amount)} · {item.note}
          </span>
        </div>
      </div>
      {sent ? (
        <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Icon icon="solar:check-circle-bold" width="16" />
          Reminder opened
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sendReminder}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#EB4A26] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            <Icon icon="solar:chat-round-line-bold" width="15" />
            {item.phone ? 'Send on WhatsApp' : 'Copy reminder'}
          </button>
          <button
            type="button"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Snooze
          </button>
        </div>
      )}
    </div>
  )
}

export default function NeedsAttention({ overdue }: { overdue: DashboardData['overdue'] }) {
  return (
    <section className="flex flex-col rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Needs attention</h2>
        <span className="rounded-full bg-[#EB4A26]/10 px-2 py-0.5 text-[11px] font-semibold text-[#EB4A26]">
          {overdue.length}
        </span>
      </div>
      {overdue.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Icon icon="solar:check-circle-linear" width="26" className="text-emerald-500" />
          <p className="text-sm text-zinc-400">All clear — nobody's overdue.</p>
        </div>
      ) : (
        <div className="no-scrollbar mt-4 flex max-h-[22rem] flex-col gap-3 overflow-y-auto">
          {overdue.map((item) => (
            <OverdueRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
