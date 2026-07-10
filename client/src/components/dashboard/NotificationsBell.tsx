import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { NotificationItem } from '../../lib/api'

const SEEN_KEY = 'kredex:notif-seen'
const POLL_MS = 60_000

const META: Record<NotificationItem['type'], { icon: string }> = {
  reminder: { icon: 'solar:alarm-linear' },
  low_stock: { icon: 'solar:box-linear' },
  debt_due: { icon: 'solar:wallet-money-linear' },
}

const SEV: Record<NotificationItem['severity'], { fg: string; bg: string }> = {
  danger: { fg: '#EB4A26', bg: 'rgba(235,74,38,0.12)' },
  warning: { fg: '#C67A12', bg: 'rgba(198,122,18,0.12)' },
  info: { fg: '#6E6A61', bg: 'rgba(110,106,97,0.12)' },
}

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function dueLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const day = new Date(d); day.setHours(0, 0, 0, 0)
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function NotificationsBell() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen())
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const r = await api.notifications()
      setItems(r.notifications)
    } catch {
      /* stay quiet — a failed poll shouldn't disrupt the UI */
    }
  }

  useEffect(() => {
    void load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [])

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const unread = items.filter((n) => !seen.has(n.id)).length

  function markAllSeen() {
    const next = new Set(seen)
    items.forEach((n) => next.add(n.id))
    setSeen(next)
    localStorage.setItem(SEEN_KEY, JSON.stringify([...next]))
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) markAllSeen()
  }

  function go(n: NotificationItem) {
    setOpen(false)
    navigate(n.href)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative flex size-10 items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-600 shadow-sm transition-colors hover:text-[#EB4A26] hover:border-[#EB4A26]/30 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
      >
        <Icon icon={unread ? 'solar:bell-bing-linear' : 'solar:bell-linear'} width="18" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-[#EB4A26] px-1 text-[10px] font-bold leading-[18px] text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[90vw] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</span>
            <span className="text-xs text-zinc-400">{items.length} active</span>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <Icon icon="solar:bell-off-linear" width="26" className="text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm text-zinc-500">You're all caught up.</p>
                <p className="text-xs text-zinc-400">Due reminders, low stock, and credit due dates show up here.</p>
              </div>
            ) : (
              items.map((n) => {
                const sev = SEV[n.severity]
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => go(n)}
                    className="flex w-full items-start gap-3 border-b border-zinc-50 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: sev.bg, color: sev.fg }}>
                      <Icon icon={META[n.type].icon} width="18" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{n.title}</span>
                        <span className="shrink-0 text-[11px] text-zinc-400">{dueLabel(n.at)}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{n.body}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
