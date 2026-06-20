import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'

function getInitial() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(getInitial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    try {
      localStorage.setItem('kredex-theme', dark ? 'dark' : 'light')
    } catch (e) {
      // ignore storage failures
    }
  }, [dark])

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle dark mode"
      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      <span className="flex items-center gap-3">
        <Icon icon={dark ? 'solar:moon-linear' : 'solar:sun-2-linear'} width="20" aria-hidden="true" />
        {dark ? 'Dark mode' : 'Light mode'}
      </span>
      {/* little track/thumb switch */}
      <span
        className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${
          dark ? 'bg-[#EB4A26]' : 'bg-zinc-200'
        }`}
      >
        <span
          className={`size-4 rounded-full bg-white shadow-sm transition-transform ${
            dark ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}
