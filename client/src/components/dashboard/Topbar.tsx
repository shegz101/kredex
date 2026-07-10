import { Icon } from '@iconify/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import NotificationsBell from './NotificationsBell'

function initialsOf(name = ''): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'K'
}

export default function Topbar({ title }: { title: string }) {
  const navigate = useNavigate()
  const { shop, logout } = useAuth()
  const shopName = shop?.name || 'Your shop'

  return (
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2.5 rounded-full bg-white border border-zinc-200 py-1.5 pl-1.5 pr-4 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#FFDAD1] text-xs font-semibold text-[#EB4A26] dark:bg-[#EB4A26]/15">
            {initialsOf(shopName)}
          </span>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{shopName}</span>
        </div>

        <NotificationsBell />

        <button
          type="button"
          onClick={() => { logout(); navigate('/') }}
          aria-label="Sign out"
          className="flex size-10 items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-600 shadow-sm transition-colors hover:text-[#EB4A26] hover:border-[#EB4A26]/30 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
        >
          <Icon icon="solar:logout-2-linear" width="18" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
