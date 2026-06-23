import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'
import { api } from '../../lib/api'
import type { Opportunity } from '../../lib/api'
import { useToast } from '../Toast'
import ScoutRadar from './ScoutRadar'

const FILTERS: { key: string; label: string; icon: string }[] = [
  { key: 'loan', label: 'Loans', icon: 'solar:hand-money-linear' },
  { key: 'grant', label: 'Grants', icon: 'solar:gift-linear' },
  { key: 'program', label: 'Programs', icon: 'solar:square-academic-cap-linear' },
  { key: 'event', label: 'Events', icon: 'solar:calendar-linear' },
  { key: 'competition', label: 'Competitions', icon: 'solar:cup-star-linear' },
]

const TYPE_STYLE: Record<string, string> = {
  loan: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  grant: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  program: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  event: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  competition: 'bg-[#EB4A26]/10 text-[#EB4A26]',
}

export default function OpportunitiesPage() {
  const toast = useToast()
  const [location, setLocation] = useState<string | null>(null)
  const [loadingLoc, setLoadingLoc] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Opportunity[]>([])
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .settings()
      .then((s) => setLocation(s.shop.location || null))
      .catch(() => setLocation(null))
      .finally(() => setLoadingLoc(false))
  }, [])

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  async function search() {
    setBusy(true)
    setSearched(true)
    try {
      const r = await api.findOpportunities({ categories: selected, query: query.trim() || undefined })
      setResults(r.opportunities)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not fetch opportunities')
      setResults([])
    } finally {
      setBusy(false)
    }
  }

  if (loadingLoc) {
    return (
      <DashboardLayout title="Opportunities">
        <div className="h-40 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
      </DashboardLayout>
    )
  }

  if (!location) {
    return (
      <DashboardLayout title="Opportunities">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-20 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#EB4A26]/10 text-[#EB4A26]">
            <Icon icon="solar:map-point-linear" width="28" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Set your location first</h2>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">Kredex finds loans, grants and programs near you — add your town/city in Settings.</p>
          </div>
          <Link to="/dashboard/settings" className="rounded-full bg-[#EB4A26] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5">
            Go to Settings
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Opportunities">
      {/* scout header */}
      <section className="rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#EB4A26]/10 text-[#EB4A26]">
            <Icon icon="solar:rocket-2-linear" width="24" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Funding & growth, found for you</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Kredex scouts loans, grants, empowerment programs and events near <span className="font-medium text-zinc-700 dark:text-zinc-300">{location}</span>.
            </p>
          </div>
        </div>

        {/* filters */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelected([])}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${selected.length === 0 ? 'bg-[#EB4A26] text-white' : 'border border-zinc-200 text-zinc-600 hover:border-[#EB4A26]/40 dark:border-zinc-700 dark:text-zinc-300'}`}
          >
            All
          </button>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => toggle(f.key)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                selected.includes(f.key) ? 'bg-[#EB4A26] text-white' : 'border border-zinc-200 text-zinc-600 hover:border-[#EB4A26]/40 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Icon icon={f.icon} width="15" />
              {f.label}
            </button>
          ))}
        </div>

        {/* query + search */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !busy && void search()}
            placeholder="Optional focus — e.g. women-led, agriculture, youth, tech…"
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#EB4A26] focus:ring-2 focus:ring-[#EB4A26]/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={() => void search()}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#EB4A26] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#EB4A26]/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon icon={busy ? 'solar:refresh-linear' : 'solar:magnifer-linear'} width="17" className={busy ? 'animate-spin' : ''} />
            {busy ? 'Scouting…' : 'Find opportunities'}
          </button>
        </div>
      </section>

      {/* results */}
      {busy ? (
        <ScoutRadar location={location} />
      ) : !searched ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <Icon icon="solar:rocket-2-linear" width="30" className="text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500">Pick filters (or All) and hit <span className="font-medium">Find opportunities</span>.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
          Nothing found — try different filters or a broader focus.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <Icon icon="solar:info-circle-linear" width="15" />
            AI-suggested — always verify details and deadlines with the official source before applying.
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {results.map((o, i) => (
              <article key={i} className="flex flex-col rounded-3xl bg-white border border-zinc-200 p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${TYPE_STYLE[o.type] ?? TYPE_STYLE.program}`}>{o.type}</span>
                  {o.amount && <span className="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-200">{o.amount}</span>}
                </div>
                <h3 className="mt-3 text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{o.title}</h3>
                {o.organization && <p className="text-xs font-medium text-[#EB4A26]">{o.organization}</p>}
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{o.summary}</p>

                <div className="mt-4 flex flex-col gap-1.5 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
                  {o.eligibility && <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Who:</span> {o.eligibility}</p>}
                  {o.deadline && <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Deadline:</span> {o.deadline}</p>}
                  {o.howToApply && <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Apply:</span> {o.howToApply}</p>}
                </div>
                {o.sourceUrl && (
                  <a
                    href={o.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 self-start rounded-full bg-[#EB4A26]/10 px-3 py-1.5 text-xs font-semibold text-[#EB4A26] transition-colors hover:bg-[#EB4A26]/20"
                  >
                    Visit source
                    <Icon icon="solar:arrow-right-up-linear" width="13" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
