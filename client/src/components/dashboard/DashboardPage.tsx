import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'
import StatCards from './StatCards'
import RevenueChart from './RevenueChart'
import RecentActivity from './RecentActivity'
import NeedsAttention from './NeedsAttention'
import LowStock from './LowStock'
import { useDashboard } from '../../hooks/useDashboard'

function Skeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[200px] animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        ))}
      </div>
      <div className="h-[320px] animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="h-[300px] animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        <div className="h-[300px] animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, loading, error } = useDashboard()

  return (
    <DashboardLayout title="Dashboard">
      {loading && <Skeleton />}

      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl bg-white border border-zinc-200 py-20 text-center dark:bg-zinc-900 dark:border-zinc-800">
          <Icon icon="solar:cloud-cross-linear" width="30" className="text-[#EB4A26]" />
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      )}

      {!loading && data && (
        <>
          <StatCards stats={data.stats} />
          <RevenueChart />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <RecentActivity activity={data.activity} />
            <div className="flex flex-col gap-6">
              <NeedsAttention overdue={data.overdue} />
              <LowStock lowStock={data.lowStock} />
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
