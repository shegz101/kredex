import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { api } from '../../lib/api'
import type { Approval } from '../../lib/api'

const KIND_META: Record<Approval['kind'], { label: string; icon: string }> = {
  reminder: { label: 'Reminders', icon: 'solar:bell-bing-linear' },
  overdue_debt: { label: 'Debt reminders', icon: 'solar:wallet-money-linear' },
  low_stock: { label: 'Low stock alerts', icon: 'solar:box-linear' },
  eod_summary: { label: 'Daily summaries', icon: 'solar:chart-2-linear' },
}
const ORDER: Approval['kind'][] = ['reminder', 'overdue_debt', 'low_stock', 'eod_summary']

function timeAgo(iso?: string): string {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function NotificationsDrawer({
  open,
  onClose,
  onUnreadChange,
}: {
  open: boolean
  onClose: () => void
  onUnreadChange: (n: number) => void
}) {
  const navigate = useNavigate()
  const [items, setItems] = useState<Approval[]>([]) // unread only
  const [removing, setRemoving] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setRemoving(new Set())
    api
      .notifications()
      .then((r) => {
        setItems(r.items.filter((i) => !i.readAt)) // the bell is an UNREAD inbox
        onUnreadChange(r.unread)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, onUnreadChange])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /** Slide an item out, then drop it from the list. */
  function clearOut(ids: string[]) {
    setRemoving((prev) => new Set([...prev, ...ids]))
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => !ids.includes(i._id)))
      setRemoving((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    }, 280)
  }

  async function markOne(id: string) {
    clearOut([id])
    try {
      const r = await api.markRead(id)
      onUnreadChange(r.unread)
    } catch {
      /* ignore */
    }
  }

  async function markAll() {
    clearOut(items.map((i) => i._id))
    try {
      const r = await api.markAllRead()
      onUnreadChange(r.unread)
    } catch {
      /* ignore */
    }
  }

  function openItem(a: Approval) {
    void markOne(a._id)
    onClose()
    navigate('/dashboard/autopilot')
  }

  const visible = items.length - removing.size
  const grouped = ORDER.map((kind) => ({ kind, list: items.filter((i) => i.kind === kind) })).filter((g) => g.list.length)

  return (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#F3F4EF] shadow-2xl transition-transform duration-300 ease-out dark:bg-zinc-950 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Notifications</h2>
            {visible > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EB4A26] px-1.5 text-[11px] font-semibold text-white">
                {visible}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={markAll}
              disabled={visible === 0}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-[#EB4A26] transition-colors hover:bg-[#EB4A26]/10 disabled:text-zinc-400 disabled:hover:bg-transparent"
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Icon icon="solar:close-circle-linear" width="20" />
            </button>
          </div>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
              ))}
            </div>
          ) : visible === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Icon icon="solar:check-circle-bold" width="32" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">You're all caught up</p>
              <p className="max-w-[15rem] text-xs text-zinc-400">
                New alerts from Kredex land here. Your full history lives on the Autopilot page.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.map(({ kind, list }) => {
                const meta = KIND_META[kind]
                return (
                  <section key={kind}>
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <Icon icon={meta.icon} width="14" className="text-[#EB4A26]" />
                      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">{meta.label}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {list.map((a) => {
                        const isRemoving = removing.has(a._id)
                        return (
                          <div
                            key={a._id}
                            onClick={() => openItem(a)}
                            className={`group flex cursor-pointer items-start gap-3 rounded-2xl border border-[#EB4A26]/30 bg-white p-3.5 shadow-sm transition-all duration-300 ease-out dark:bg-zinc-900 ${
                              isRemoving ? 'translate-x-10 opacity-0' : 'translate-x-0 opacity-100'
                            }`}
                          >
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#EB4A26]" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{a.title}</p>
                                <span className="shrink-0 font-mono text-[10px] text-zinc-400">{timeAgo(a.createdAt)}</span>
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{a.body}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void markOne(a._id)
                              }}
                              aria-label="Mark as read"
                              title="Mark as read"
                              className="flex size-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-[#EB4A26]/10 hover:text-[#EB4A26]"
                            >
                              <Icon icon="solar:check-read-linear" width="16" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
