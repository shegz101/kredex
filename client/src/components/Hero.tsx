import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import dashboardDark from '../assets/kredex-dashboard-dark.png'

export default function Hero() {
  return (
    <header className="flex flex-col text-center w-full max-w-5xl z-10 mr-auto ml-auto pt-20 pr-6 pb-16 pl-6 relative items-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#EB4A26]/20 bg-[#EB4A26]/5 mb-8 text-xs font-medium text-[#EB4A26]">
        <span className="w-2 h-2 rounded-full bg-[#EB4A26] animate-pulse"></span>
        Now in early access
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-zinc-900 to-zinc-600 mb-6 leading-[1.05] max-w-3xl">
        Your business, fully remembered.
      </h1>

      <p className="text-base sm:text-lg text-zinc-500 max-w-xl mx-auto font-normal leading-relaxed mb-10">
        Track inventory, manage debts, run payroll, and send invoices — just by talking
        to Kredex. In English, Pidgin, Yoruba, or Hausa.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
        <Link
          to="/register"
          className="sm:w-auto hover:bg-[#EB4A26]/90 shadow-[#EB4A26]/20 transition-all hover:-translate-y-0.5 flex gap-2 group text-sm font-medium text-white bg-[#EB4A26] w-full rounded-full pt-3 pr-6 pb-3 pl-6 shadow-lg items-center justify-center"
        >
          Get started
          <Icon
            icon="solar:arrow-right-linear"
            width="18"
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
        <a
          href="#features"
          className="sm:w-auto flex items-center gap-2 bg-white border border-zinc-200/80 px-6 py-3 rounded-full shadow-sm hover:shadow-md hover:border-zinc-300 transition-all hover:-translate-y-0.5 group text-sm font-medium text-zinc-700 w-full justify-center"
        >
          <Icon
            icon="solar:play-circle-linear"
            width="18"
            className="text-[#EB4A26] group-hover:scale-110 transition-transform"
          />
          See how it works
        </a>
      </div>

      {/* Product preview — the real (dark) Kredex dashboard, framed as a floating window. */}
      <div className="w-full relative rounded-2xl p-2 bg-white/60 border border-zinc-200/70 shadow-[0_30px_80px_-20px_rgba(10,11,12,0.28)] backdrop-blur-md">
        <img
          src={dashboardDark}
          alt="The Kredex dashboard — total owed, revenue, business health, and overdue reminders"
          className="w-full h-auto rounded-xl border border-zinc-900/10 relative z-0"
        />
      </div>
    </header>
  )
}
