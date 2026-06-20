import { Icon } from '@iconify/react'
import type { DashboardData } from '../../lib/api'
import { naira, nairaCompact } from '../../lib/format'

type Variant = 'orange' | 'dark' | 'white'

const variants: Record<Variant, { card: string; ring: string; label: string; sub: string; btn: string; arrow: string }> = {
  orange: {
    card: 'bg-[#EB4A26] text-white',
    ring: 'border-white/25',
    label: 'text-white/75',
    sub: 'text-white/70',
    btn: 'bg-white',
    arrow: 'text-[#EB4A26]',
  },
  dark: {
    card: 'bg-zinc-900 text-white dark:border dark:border-zinc-800',
    ring: 'border-white/20',
    label: 'text-white/60',
    sub: 'text-white/60',
    btn: 'bg-white',
    arrow: 'text-zinc-900',
  },
  white: {
    card: 'bg-white text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800',
    ring: 'border-zinc-200 dark:border-zinc-700',
    label: 'text-zinc-400',
    sub: 'text-zinc-400',
    btn: 'bg-zinc-900 dark:bg-white',
    arrow: 'text-white dark:text-zinc-900',
  },
}

interface StatCardProps {
  variant: Variant
  icon: string
  label: string
  value: string
  outOf?: string
  sub: string
  up?: boolean
}

function StatCard({ variant, icon, label, value, outOf, sub, up }: StatCardProps) {
  const s = variants[variant]
  return (
    <div className={`flex min-h-[200px] flex-col justify-between rounded-3xl p-6 shadow-sm ${s.card}`}>
      <div className={`flex size-12 items-center justify-center rounded-full border ${s.ring}`}>
        <Icon icon={icon} width="22" aria-hidden="true" />
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className={`text-sm font-medium ${s.label}`}>{label}</p>
          <p className="font-mono text-4xl sm:text-5xl font-bold tracking-tight leading-none">
            {value}
            {outOf && <span className="text-2xl opacity-50">{outOf}</span>}
          </p>
          <p className={`flex items-center gap-1 text-xs ${s.sub}`}>
            {up && <Icon icon="solar:alt-arrow-up-linear" width="13" />}
            {sub}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Open ${label}`}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 ${s.btn}`}
        >
          <Icon icon="solar:arrow-right-up-linear" width="20" className={s.arrow} />
        </button>
      </div>
    </div>
  )
}

export default function StatCards({ stats }: { stats: DashboardData['stats'] }) {
  const delta = stats.revenueDeltaPct
  const revenueSub =
    delta === null ? 'this month' : `${delta >= 0 ? '+' : ''}${delta}% vs last month`

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <StatCard
        variant="orange"
        icon="solar:wallet-money-linear"
        label="Total owed to you"
        value={naira(stats.owedTotal)}
        sub={`${stats.owedCustomers} customer${stats.owedCustomers === 1 ? '' : 's'}`}
      />
      <StatCard
        variant="dark"
        icon="solar:chart-2-linear"
        label="Revenue this month"
        value={nairaCompact(stats.revenueThisMonth)}
        sub={revenueSub}
        up={delta !== null && delta >= 0}
      />
      <StatCard
        variant="white"
        icon="solar:heart-pulse-linear"
        label="Business health"
        value={String(stats.health)}
        outOf="/100"
        sub={stats.healthLabel}
      />
    </div>
  )
}
