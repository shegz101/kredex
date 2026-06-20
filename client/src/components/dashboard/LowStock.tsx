import { Icon } from '@iconify/react'
import type { DashboardData } from '../../lib/api'

export default function LowStock({ lowStock }: { lowStock: DashboardData['lowStock'] }) {
  return (
    <section className="flex flex-col rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Low stock</h2>
        <Icon icon="solar:box-minimalistic-linear" width="18" className="text-zinc-300 dark:text-zinc-600" />
      </div>

      {lowStock.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">Everything's well stocked.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2">
            {lowStock.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-[#F3F4EF]/60 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/40"
              >
                <span className="flex size-2 shrink-0 rounded-full bg-[#EB4A26]" />
                <span className="flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">{s.name}</span>
                <span className="font-mono text-xs text-zinc-400">{s.qty}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-[#EB4A26]/30 hover:text-[#EB4A26] dark:border-zinc-700 dark:text-zinc-300"
          >
            Reorder from suppliers
          </button>
        </>
      )}
    </section>
  )
}
