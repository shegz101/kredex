import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import KredexMark from './KredexMark'

export default function Navbar() {
  return (
    <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center relative z-20">
      <a href="#top" className="flex items-center gap-2 cursor-pointer group">
        <KredexMark className="h-7 w-7 drop-shadow-sm transition-transform group-hover:scale-105" />
        <span className="font-medium text-sm tracking-tight text-zinc-700 group-hover:text-zinc-900 transition-colors">
          Kredex
        </span>
      </a>

      <div className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-500 absolute left-1/2 -translate-x-1/2">
        <a href="#features" className="hover:text-zinc-900 transition-colors">
          Features
        </a>
        <a href="#stats" className="hover:text-zinc-900 transition-colors">
          Why Kredex
        </a>
        <a href="#waitlist" className="hover:text-zinc-900 transition-colors">
          Early access
        </a>
      </div>

      <div className="flex items-center gap-4">
        <Link
          to="/login"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors hidden sm:block"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="text-xs font-medium text-white bg-[#EB4A26] hover:bg-[#EB4A26]/90 transition-all hover:-translate-y-0.5 px-4 py-2 rounded-full shadow-sm shadow-[#EB4A26]/20 flex items-center gap-2 group"
        >
          Get started
          <Icon
            icon="solar:arrow-right-linear"
            width="14"
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>
    </nav>
  )
}
