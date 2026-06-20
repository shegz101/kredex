import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import KredexMark from './KredexMark'

const POINTS = [
  { icon: 'solar:box-linear', text: 'Track stock by just talking — in Pidgin or English' },
  { icon: 'solar:wallet-money-linear', text: 'Never lose a debt — every kobo, remembered' },
  { icon: 'solar:chart-2-linear', text: 'Know your real profit, every single day' },
]

interface AuthLayoutProps {
  eyebrow?: string
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/** Split auth shell: brand story on the left, the form on the right. */
export default function AuthLayout({ eyebrow, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#F3F4EF] text-zinc-900 lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-zinc-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute -left-20 top-1/3 size-96 rounded-full bg-[#EB4A26]/25 blur-[120px]" />

        <Link to="/" className="relative flex items-center gap-2">
          <KredexMark className="h-8 w-8" />
          <span className="text-lg font-medium tracking-tight text-white">Kredex</span>
        </Link>

        <div className="relative">
          <h2 className="max-w-md text-4xl font-semibold leading-[1.1] tracking-tight text-white">
            Your business, fully remembered.
          </h2>
          <p className="mt-4 max-w-sm text-zinc-400">
            The AI that runs your books through plain conversation — and only acts when you say yes.
          </p>
          <ul className="mt-10 flex flex-col gap-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#EB4A26]/15 text-[#EB4A26]">
                  <Icon icon={p.icon} width="18" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-xs uppercase tracking-widest text-zinc-600">
          Your business runs itself
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <KredexMark className="h-8 w-8" />
            <span className="text-lg font-medium tracking-tight">Kredex</span>
          </Link>

          {eyebrow && (
            <span className="font-mono text-xs uppercase tracking-widest text-[#EB4A26]">{eyebrow}</span>
          )}
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 text-center text-sm text-zinc-500">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

/* shared field + button styles */
export const fieldClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-[#EB4A26] focus:ring-2 focus:ring-[#EB4A26]/15'
export const labelClass = 'mb-1.5 block text-sm font-medium text-zinc-700'
export const submitClass =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-[#EB4A26] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#EB4A26]/20 transition-all hover:bg-[#EB4A26]/90 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0'
