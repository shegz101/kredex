import { useEffect, useState } from 'react'

/** A radar-style "scanning" loader shown while Kredex searches the web. */
export default function ScoutRadar({ location }: { location: string }) {
  const messages = [
    'Searching the web…',
    'Scanning grants & loans…',
    'Reading official sites…',
    `Matching to ${location}…`,
    'Checking deadlines…',
  ]
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % messages.length), 1600)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-7 rounded-3xl bg-white border border-zinc-200 py-20 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
      <div className="relative size-52">
        {/* concentric guide rings */}
        <div className="absolute inset-0 rounded-full border border-zinc-200 dark:border-zinc-700/70" />
        <div className="absolute inset-[18%] rounded-full border border-zinc-200/70 dark:border-zinc-700/50" />
        <div className="absolute inset-[36%] rounded-full border border-zinc-200/50 dark:border-zinc-700/40" />
        {/* cross hairs */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-zinc-200/60 dark:bg-zinc-700/40" />
        <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-zinc-200/60 dark:bg-zinc-700/40" />

        {/* expanding pings */}
        {[0, 1, 2].map((n) => (
          <span
            key={n}
            className="absolute inset-0 rounded-full bg-[#EB4A26]/10"
            style={{ animation: `ping 2.4s cubic-bezier(0,0,0.2,1) ${n * 0.8}s infinite` }}
          />
        ))}

        {/* sweeping beam */}
        <div
          className="absolute inset-0 rounded-full animate-radar-sweep"
          style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(235,74,38,0.30) 55deg, transparent 70deg)' }}
        />

        {/* a couple of "blips" */}
        <span className="absolute left-[30%] top-[38%] size-1.5 rounded-full bg-[#EB4A26]" style={{ animation: 'ping 2.4s ease-out 0.4s infinite' }} />
        <span className="absolute left-[64%] top-[58%] size-1.5 rounded-full bg-emerald-500" style={{ animation: 'ping 2.4s ease-out 1.3s infinite' }} />

        {/* center */}
        <div className="absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EB4A26] shadow-[0_0_0_6px_rgba(235,74,38,0.18)]" />
      </div>

      <div className="text-center">
        <p className="font-medium text-zinc-800 dark:text-zinc-100">{messages[i]}</p>
        <p className="mt-0.5 text-xs text-zinc-400">Kredex is scouting — this takes a few seconds</p>
      </div>
    </div>
  )
}
