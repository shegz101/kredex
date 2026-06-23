import { Icon } from '@iconify/react'
import type { DashboardData } from '../../lib/api'

const typeIcons: Record<string, string> = {
  sale: 'solar:cart-large-2-linear',
  payment: 'solar:hand-money-linear',
  restock: 'solar:box-linear',
  invoice: 'solar:bill-list-linear',
  purchase: 'solar:box-linear',
  expense: 'solar:tag-price-linear',
}

const toneStyles: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  orange: 'bg-[#EB4A26]/10 text-[#EB4A26]',
  zinc: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

export default function RecentActivity({ activity }: { activity: DashboardData['activity'] }) {
  return (
    <section className="relative flex flex-col rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Recent activity</h2>
        <button type="button" className="text-xs font-medium text-zinc-400 hover:text-[#EB4A26] transition-colors">
          View all
        </button>
      </div>

      {activity.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
          <Icon icon="solar:clock-circle-linear" width="28" className="text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-400">No activity yet. Log a sale in Chat to get started.</p>
        </div>
      ) : (
        <div className="no-scrollbar mt-4 flex flex-col overflow-y-auto lg:absolute lg:inset-x-6 lg:bottom-6 lg:top-[4.75rem] lg:mt-0">
          {activity.map((it, i) => (
            <div
              key={it.id}
              className={`flex items-center gap-4 py-3.5 ${i !== activity.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F4EF] border border-zinc-200 text-[#EB4A26] dark:bg-zinc-800 dark:border-zinc-700">
                <Icon icon={typeIcons[it.type] ?? 'solar:cart-large-2-linear'} width="18" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{it.title}</p>
                <p className="truncate text-xs text-zinc-400">{it.meta}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${toneStyles[it.tone] ?? toneStyles.zinc}`}>
                {it.status}
              </span>
              <span className="shrink-0 font-mono text-xs text-zinc-400 w-16 text-right">{it.time}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
