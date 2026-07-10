import { Icon } from '@iconify/react'
import { NavLink } from 'react-router-dom'
import KredexMark from '../KredexMark'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../../auth/AuthContext'

function initialsOf(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'K'
}

const navItems = [
  { label: 'Dashboard', icon: 'solar:widget-2-linear', to: '/dashboard', end: true },
  { label: 'Chat', icon: 'solar:chat-round-line-linear', to: '/dashboard/chat' },
  { label: 'Memory', icon: 'solar:cpu-bolt-linear', to: '/dashboard/memory' },
  { label: 'Reminders', icon: 'solar:bell-bing-linear', to: '/dashboard/reminders' },
  { label: 'Profit', icon: 'solar:chart-2-linear', to: '/dashboard/pnl' },
  { label: 'Opportunities', icon: 'solar:rocket-2-linear', to: '/dashboard/opportunities' },
  { label: 'Invoices', icon: 'solar:bill-list-linear', to: '/dashboard/invoices' },
  { label: 'Settings', icon: 'solar:settings-linear', to: '/dashboard/settings' },
]

export default function Sidebar() {
  const { shop } = useAuth()
  const shopName = shop?.name || 'Your shop'

  return (
    <aside className="hidden md:flex w-[248px] shrink-0 flex-col rounded-3xl bg-white border border-zinc-200 p-4 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
      {/* Logo */}
      <NavLink to="/" className="flex items-center gap-2 px-2 py-1.5 group">
        <KredexMark className="h-8 w-8 transition-transform group-hover:scale-105" />
        <span className="font-medium text-base tracking-tight text-zinc-800 dark:text-zinc-100">Kredex</span>
      </NavLink>

      {/* Nav */}
      <nav className="mt-4 flex flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#EB4A26]/10 text-[#EB4A26]'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`
            }
          >
            <Icon icon={item.icon} width="20" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Theme toggle + shop identity */}
      <div className="mt-auto flex flex-col gap-1.5 pt-3">
        <ThemeToggle />
        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <NavLink
          to="/dashboard/settings"
          className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFDAD1] text-sm font-semibold text-[#EB4A26] dark:bg-[#EB4A26]/15">
            {initialsOf(shopName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{shopName}</span>
            <span className="block truncate text-xs text-zinc-400 dark:text-zinc-500">{shop?.location || shop?.type || ''}</span>
          </span>
        </NavLink>
      </div>
    </aside>
  )
}
