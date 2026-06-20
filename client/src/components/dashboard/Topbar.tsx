import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { api } from '../../lib/api'
import NotificationsDrawer from './NotificationsDrawer'

const iconBtn =
  'relative flex size-10 items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-600 shadow-sm transition-colors hover:text-zinc-900 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:border-zinc-700'

function initialsOf(name = ''): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'K'
}

export default function Topbar({ title }: { title: string }) {
  const navigate = useNavigate()
  const { shop, logout } = useAuth()
  const shopName = shop?.name || 'Your shop'

  const [unread, setUnread] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // load the unread count once for the badge
  useEffect(() => {
    let active = true
    api
      .notifications()
      .then((r) => active && setUnread(r.unread))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

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

        <button type="button" aria-label="Notifications" onClick={() => setDrawerOpen(true)} className={iconBtn}>
          <Icon icon="solar:bell-linear" width="18" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EB4A26] px-1 text-[10px] font-bold text-white ring-2 ring-[#F3F4EF] dark:ring-zinc-950">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => { logout(); navigate('/') }}
          aria-label="Sign out"
          className="flex size-10 items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-600 shadow-sm transition-colors hover:text-[#EB4A26] hover:border-[#EB4A26]/30 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
        >
          <Icon icon="solar:logout-2-linear" width="18" aria-hidden="true" />
        </button>
      </div>

      <NotificationsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onUnreadChange={setUnread} />
    </header>
  )
}
