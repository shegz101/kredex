import KredexMark from './KredexMark'

export default function Footer() {
  return (
    <footer className="w-full border-t border-zinc-200 mt-auto bg-[#F3F4EF]/80 backdrop-blur-md relative z-10">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <KredexMark className="h-5 w-5" />
          <span className="text-xs text-zinc-500 font-medium">
            © 2026 Kredex. Built for the world's entrepreneurs.
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs font-medium text-zinc-500">
          <a href="#" className="hover:text-zinc-900 transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-zinc-900 transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-zinc-900 transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
