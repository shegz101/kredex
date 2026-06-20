import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'

/* Placeholder for nav items not built yet (Invoices, Settings). */
export default function StubPage({ title, icon, blurb }: { title: string; icon: string; blurb: string }) {
  return (
    <DashboardLayout title={title}>
      <div className="flex flex-1 items-center justify-center rounded-3xl bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex max-w-sm flex-col items-center gap-4 px-6 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#EB4A26]/10 text-[#EB4A26]">
            <Icon icon={icon} width="28" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title} is coming soon</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{blurb}</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
