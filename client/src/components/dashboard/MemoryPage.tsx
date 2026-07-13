import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'
import { api } from '../../lib/api'
import type { MemoryItem, MemoryStats, FactItem } from '../../lib/api'
import { useToast } from '../Toast'

const KIND: Record<string, { label: string; color: string; icon: string }> = {
  fact: { label: 'Fact', color: '#EB4A26', icon: 'solar:info-circle-linear' },
  preference: { label: 'Preference', color: '#7C5CFF', icon: 'solar:heart-linear' },
  event: { label: 'Event', color: '#C67A12', icon: 'solar:calendar-linear' },
  chat: { label: 'Note', color: '#6E6A61', icon: 'solar:chat-round-line-linear' },
}

// how each top-level trie category is labelled/iconed in the knowledge tree
const CATEGORY: Record<string, { label: string; icon: string }> = {
  product: { label: 'Products', icon: 'solar:box-linear' },
  customer: { label: 'Customers', icon: 'solar:users-group-rounded-linear' },
  supplier: { label: 'Suppliers', icon: 'solar:delivery-linear' },
  shop: { label: 'Shop', icon: 'solar:shop-linear' },
}

function prettyAttr(attr?: string): string {
  return (attr ?? '').replace(/_/g, ' ')
}
function formatValue(f: FactItem): string {
  const v = typeof f.value === 'number' ? f.value.toLocaleString() : String(f.value)
  return f.unit ? `${v} ${f.unit}` : v
}

/** Group flat facts into category → subject → attributes, mirroring the trie. */
function groupFacts(facts: FactItem[]) {
  const byCat = new Map<string, Map<string, FactItem[]>>()
  for (const f of facts) {
    const cat = f.category ?? 'other'
    const subj = f.subject ?? '—'
    if (!byCat.has(cat)) byCat.set(cat, new Map())
    const subs = byCat.get(cat)!
    if (!subs.has(subj)) subs.set(subj, [])
    subs.get(subj)!.push(f)
  }
  return byCat
}

function timeAgo(iso?: string): string {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [facts, setFacts] = useState<FactItem[]>([])
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [recalling, setRecalling] = useState(false)
  const [recalled, setRecalled] = useState<{ id: string; text: string; score: number }[] | null>(null)
  const [forgetting, setForgetting] = useState<string | null>(null)
  const toast = useToast()

  async function load() {
    try {
      const r = await api.memory()
      setMemories(r.memories)
      setFacts(r.facts)
      setStats(r.stats)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  async function testRecall() {
    if (!q.trim()) return
    setRecalling(true)
    try {
      const r = await api.memoryRecall(q.trim())
      setRecalled(r.recalled)
      await load() // recall reinforces — refresh to show importance/usage change
    } finally {
      setRecalling(false)
    }
  }

  async function forget(m: MemoryItem) {
    setForgetting(m.id)
    try {
      await api.forgetMemory(m.id)
      setMemories((prev) => prev.filter((x) => x.id !== m.id))
      toast.info('Forgotten.', 'Memory removed')
    } finally {
      setForgetting(null)
    }
  }

  const recalledIds = new Set((recalled ?? []).map((r) => r.id))
  const grouped = groupFacts(facts)

  return (
    <DashboardLayout title="Memory">
      {/* intro */}
      <section className="flex flex-col gap-4 rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#7C5CFF]/10 text-[#7C5CFF]">
            <Icon icon="solar:cpu-bolt-linear" width="24" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              What Kredex remembers about your shop
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Two kinds of memory, shared across every chat: <span className="font-medium text-zinc-700 dark:text-zinc-300">structured facts</span> —
              prices, terms, contacts — looked up and overwritten instantly by key; and <span className="font-medium text-zinc-700 dark:text-zinc-300">narrative memories</span> —
              habits and preferences recalled by meaning. Tell Kredex once, in any chat; it remembers everywhere.
            </p>
          </div>
        </div>
        {stats && (
          <div className="flex shrink-0 items-center gap-4 rounded-2xl bg-zinc-50 px-5 py-3 dark:bg-zinc-800/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-400">memories</div>
            </div>
            <div className="flex flex-col gap-1">
              {Object.entries(stats.kinds).map(([k, n]) => (
                <span key={k} className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="size-2 rounded-full" style={{ background: KIND[k]?.color ?? '#999' }} />
                  {n} {KIND[k]?.label.toLowerCase() ?? k}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* structured knowledge — the canonical-key trie, grouped */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Structured knowledge</h3>
          <span className="rounded-full bg-[#EB4A26]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#EB4A26]">Trie · exact recall</span>
        </div>
        {loading ? (
          <div className="h-32 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        ) : facts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <Icon icon="solar:database-linear" width="30" className="text-zinc-400" />
            <p className="max-w-md text-sm text-zinc-500">
              No structured facts yet. Say things like <span className="italic">"I sell a bag of rice for ₦32,000"</span> or
              <span className="italic"> "Tunde pays on Fridays"</span> in Chat — they'll be stored here by key and updated in place.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {[...grouped.entries()].map(([cat, subjects]) => {
              const meta = CATEGORY[cat] ?? { label: cat, icon: 'solar:tag-linear' }
              return (
                <div key={cat} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-[#EB4A26]/10 text-[#EB4A26]">
                      <Icon icon={meta.icon} width="17" />
                    </span>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{meta.label}</h4>
                    <span className="ml-auto text-[11px] text-zinc-400">{subjects.size} {subjects.size === 1 ? 'entry' : 'entries'}</span>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {[...subjects.entries()].map(([subj, attrs]) => (
                      <div key={subj} className="rounded-2xl bg-[#F3F4EF]/70 p-3 dark:bg-zinc-800/50">
                        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold capitalize text-zinc-700 dark:text-zinc-200">
                          <Icon icon="solar:hashtag-linear" width="12" className="text-zinc-400" />
                          {subj}
                        </div>
                        <div className="flex flex-col divide-y divide-zinc-200/70 dark:divide-zinc-700/50">
                          {attrs.map((f) => (
                            <div key={f.id} className="flex items-center gap-2 py-1.5">
                              <span className="text-xs capitalize text-zinc-500">{prettyAttr(f.attribute)}</span>
                              <span className="ml-auto font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatValue(f)}</span>
                              {f.changes > 0 && (
                                <span
                                  className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                                  title={`Overwritten ${f.changes} time${f.changes === 1 ? '' : 's'} across your chats`}
                                >
                                  <Icon icon="solar:refresh-linear" width="10" /> {f.changes}×
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* recall tester */}
      <section className="rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Test the recall</h3>
        <p className="mt-1 text-xs text-zinc-400">Ask something the way the agent would — see which memories it retrieves and how strongly.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && testRecall()}
            placeholder="e.g. how does Tunde pay?  ·  when do I close?  ·  who gives me credit?"
            className="flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-5 py-2.5 text-sm text-zinc-800 outline-none focus:border-[#7C5CFF] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={testRecall}
            disabled={recalling || !q.trim()}
            className="flex shrink-0 items-center gap-2 rounded-full bg-[#7C5CFF] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon icon={recalling ? 'solar:refresh-linear' : 'solar:magnifer-linear'} width="16" className={recalling ? 'animate-spin' : ''} />
            Recall
          </button>
        </div>
        {recalled && (
          <div className="mt-4 flex flex-col gap-2">
            {recalled.length === 0 ? (
              <p className="text-sm text-zinc-500">Nothing relevant crossed the threshold — the agent would answer without injected memory.</p>
            ) : (
              recalled.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-[#7C5CFF]/20 bg-[#7C5CFF]/5 px-4 py-2.5">
                  <span className="font-mono text-xs font-semibold text-[#7C5CFF]">{r.score.toFixed(3)}</span>
                  <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: `${Math.min(100, r.score * 120)}%` }} />
                  </div>
                  <span className="text-sm text-zinc-700 dark:text-zinc-200">{r.text}</span>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* memory list */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Narrative memories</h3>
          <span className="rounded-full bg-[#7C5CFF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7C5CFF]">Embeddings · semantic recall</span>
        </div>
        {loading ? (
          <div className="h-40 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <Icon icon="solar:cpu-bolt-linear" width="34" className="text-zinc-400" />
            <p className="text-sm text-zinc-500">No memories yet. Tell Kredex things in Chat — habits, preferences, standing instructions — and they'll appear here.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {memories.map((m) => {
              const k = KIND[m.kind] ?? KIND.fact
              const highlighted = recalledIds.has(m.id)
              return (
                <article
                  key={m.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition-colors dark:bg-zinc-900 ${highlighted ? 'border-[#7C5CFF] ring-1 ring-[#7C5CFF]/30' : 'border-zinc-200 dark:border-zinc-800'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${k.color}1a`, color: k.color }}>
                      <Icon icon={k.icon} width="12" /> {k.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => forget(m)}
                      disabled={forgetting === m.id}
                      className="text-zinc-300 transition-colors hover:text-red-500 disabled:opacity-50 dark:text-zinc-600"
                      title="Forget this"
                    >
                      <Icon icon="solar:trash-bin-minimalistic-linear" width="16" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-100">{m.text}</p>
                  <div className="mt-3 flex items-center gap-3">
                    {/* importance bar */}
                    <div className="flex items-center gap-1.5" title={`importance ${m.importance}/10`}>
                      <Icon icon="solar:star-linear" width="13" className="text-amber-400" />
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, m.importance * 10)}%` }} />
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-400">recalled {m.accessCount}×</span>
                    <span className="ml-auto text-[11px] text-zinc-300 dark:text-zinc-600">used {timeAgo(m.lastAccessedAt)}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </DashboardLayout>
  )
}
