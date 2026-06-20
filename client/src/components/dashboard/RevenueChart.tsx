import { nairaCompact } from '../../lib/format'

const W = 800
const H = 240
const PAD = { t: 16, r: 12, b: 28, l: 48 }

function compactNaira(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}k`
  return `₦${n}`
}

function buildGeometry(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const n = values.length
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v: number) => PAD.t + (1 - (v - min) / range) * innerH
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(n - 1).toFixed(1)} ${(H - PAD.b).toFixed(1)} L ${x(0).toFixed(1)} ${(H - PAD.b).toFixed(1)} Z`
  return { line, area, x, y, min, max }
}

interface RevenueChartProps {
  series: number[]
  labels: string[]
  total: number
}

export default function RevenueChart({ series, labels, total }: RevenueChartProps) {
  const values = series.length ? series : [0, 0]
  const { line, area, x, min, max } = buildGeometry(values)
  const gridVals = [max, (max + min) / 2, min]
  const yFor = (v: number) => PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b)
  const hasData = values.some((v) => v > 0)

  return (
    <section className="rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Revenue over time</h2>
          <p className="font-mono text-xs text-zinc-400">Last 7 days · NGN</p>
        </div>
        <p className="font-mono text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {nairaCompact(total)}
        </p>
      </div>

      <div className="relative mt-6">
        {!hasData && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="rounded-full bg-[#F3F4EF] px-4 py-1.5 text-xs font-medium text-zinc-400 dark:bg-zinc-800">
              No sales yet this week
            </span>
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[240px]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EB4A26" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#EB4A26" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridVals.map((v, i) => (
            <g key={i}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={yFor(v)}
                y2={yFor(v)}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                className="stroke-[#ECECE9] dark:stroke-zinc-800"
              />
              <text x={PAD.l - 8} y={yFor(v) + 3} textAnchor="end" className="fill-zinc-400 dark:fill-zinc-500" fontSize="11" fontFamily="ui-monospace, monospace">
                {compactNaira(Math.round(v))}
              </text>
            </g>
          ))}

          <path d={area} fill="url(#revFill)" />
          <path
            d={line}
            fill="none"
            stroke="#EB4A26"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {labels.map((lab, i) => {
            const px = PAD.l + (i / Math.max(1, labels.length - 1)) * (W - PAD.l - PAD.r)
            return (
              <text key={lab + i} x={px} y={H - 8} textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500" fontSize="11" fontFamily="ui-monospace, monospace">
                {lab}
              </text>
            )
          })}

          <circle cx={x(values.length - 1)} cy={yFor(values[values.length - 1])} r="4" fill="#EB4A26" className="stroke-white dark:stroke-zinc-900" strokeWidth="2" />
        </svg>
      </div>
    </section>
  )
}
