import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

/*
 * Fixed app shell: the sidebar stays put (full height), only the main column
 * scrolls. Light Kredex theme with dark-mode support.
 */
export default function DashboardLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-screen gap-6 overflow-hidden bg-[#F3F4EF] p-4 font-sans text-zinc-900 antialiased lg:p-6 dark:bg-zinc-950 dark:text-zinc-100">
      <Sidebar />
      <div className="no-scrollbar flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto pb-2">
        <Topbar title={title} />
        {children}
      </div>
    </div>
  )
}
