import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  type: ToastType
  title: string
  message: string
  leaving?: boolean
}

interface ToastApi {
  show: (type: ToastType, message: string, title?: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const THEME: Record<ToastType, { icon: string; accent: string; iconBg: string; ring: string }> = {
  success: { icon: 'solar:check-circle-bold', accent: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/25' },
  error: { icon: 'solar:close-circle-bold', accent: 'text-[#EB4A26]', iconBg: 'bg-[#EB4A26]/10 text-[#EB4A26]', ring: 'ring-[#EB4A26]/25' },
  warning: { icon: 'solar:danger-triangle-bold', accent: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/25' },
  info: { icon: 'solar:info-circle-bold', accent: 'text-zinc-700 dark:text-zinc-200', iconBg: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300', ring: 'ring-zinc-400/25' },
}
const DEFAULT_TITLE: Record<ToastType, string> = { success: 'Success', error: 'Oops', warning: 'Heads up', info: 'Notice' }

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 220)
  }, [])

  const show = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = nextId++
      setToasts((prev) => [...prev, { id, type, message, title: title ?? DEFAULT_TITLE[type] }])
      timers.current[id] = window.setTimeout(() => dismiss(id), type === 'error' ? 5000 : 3800)
    },
    [dismiss],
  )

  const api: ToastApi = {
    show,
    success: (m, t) => show('success', m, t),
    error: (m, t) => show('error', m, t),
    info: (m, t) => show('info', m, t),
    warning: (m, t) => show('warning', m, t),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* center-screen, non-blocking stack */}
      <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 px-4">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(r)
  }, [])
  const th = THEME[toast.type]
  const visible = mounted && !toast.leaving
  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white p-4 shadow-2xl ring-1 ${th.ring} transition-all duration-200 ease-out dark:bg-zinc-900 ${
        visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${th.iconBg}`}>
        <Icon icon={th.icon} width="20" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className={`text-sm font-semibold ${th.accent}`}>{toast.title}</p>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        <Icon icon="solar:close-circle-linear" width="18" />
      </button>
    </div>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
