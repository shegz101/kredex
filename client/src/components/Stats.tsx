const STATS = [
  { value: '1.4B+', label: 'informal businesses worldwide' },
  { value: 'Free', label: 'to get started' },
  { value: '2 min', label: 'to be up and running' },
]

export default function Stats() {
  return (
    <section id="stats" className="w-full max-w-6xl mx-auto px-6 pb-24 relative z-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 rounded-3xl border border-zinc-200 bg-white/60 backdrop-blur-md p-8 sm:p-12 shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/70">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center text-center px-4 py-5 sm:py-0"
          >
            <div className="text-4xl sm:text-5xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-zinc-900 to-zinc-600">
              {s.value}
            </div>
            <div className="text-xs sm:text-sm text-zinc-500 mt-2 max-w-[12rem]">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
