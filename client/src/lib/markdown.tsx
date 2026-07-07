import type { ReactNode } from 'react'

/** Inline: turn **bold** into <strong> and *italic* into <em>. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part, i) => {
      const key = `${keyPrefix}${i}`
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key} className="font-semibold">{part.slice(2, -2)}</strong>
      if (/^\*[^*]+\*$/.test(part)) return <em key={key} className="italic">{part.slice(1, -1)}</em>
      return <span key={key}>{part}</span>
    })
}

/** A markdown table row → trimmed cells (drops the outer pipes). */
function cells(line: string): string[] {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
}

/** Is this the `|---|---|` divider under a table header? */
function isDivider(line: string): boolean {
  return /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-')
}

/** Headers that usually hold numbers — right-align those columns. */
const NUMERIC = /quantity|qty|amount|price|cost|sell|total|value|owed|balance|profit|margin|stock/i

function Table({ header, rows, kp }: { header: string[]; rows: string[][]; kp: string }) {
  const alignRight = header.map((h) => NUMERIC.test(h))
  return (
    <div key={kp} className="my-2 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700/70">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-zinc-100/80 dark:bg-zinc-800/70">
            {header.map((h, ci) => (
              <th
                key={ci}
                className={`px-3 py-2 font-semibold text-zinc-600 dark:text-zinc-300 ${alignRight[ci] ? 'text-right' : 'text-left'}`}
              >
                {inline(h, `${kp}h${ci}-`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className={ri % 2 ? 'bg-zinc-50/60 dark:bg-zinc-800/25' : ''}>
              {header.map((_, ci) => (
                <td
                  key={ci}
                  className={`border-t border-zinc-100 px-3 py-1.5 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200 ${
                    alignRight[ci] ? 'text-right tabular-nums' : 'text-left'
                  } ${ci === 0 ? 'font-medium text-zinc-800 dark:text-zinc-100' : ''}`}
                >
                  {inline(r[ci] ?? '', `${kp}r${ri}c${ci}-`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Minimal markdown → React for the assistant's replies: **bold**, *italic*,
 * `#`/`##`/`###` headings, `-`/`*`/`•` bullet lists, GitHub-style tables (rendered
 * as clean, aligned tables — not raw pipes), and blank-line spacing.
 * Dependency-free.
 */
export function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  let key = 0

  const flush = () => {
    if (bullets.length) {
      const items = bullets
      blocks.push(
        <ul key={`ul${key++}`} className="my-1 flex list-disc flex-col gap-1 pl-5 marker:text-zinc-400">
          {items.map((b, i) => (
            <li key={i}>{inline(b, `li${key}-${i}-`)}</li>
          ))}
        </ul>,
      )
      bullets = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()

    // --- table: a header row with pipes followed by a |---| divider ---
    if (line.includes('|') && i + 1 < lines.length && isDivider(lines[i + 1])) {
      flush()
      const header = cells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(cells(lines[i]))
        i++
      }
      i--
      blocks.push(<Table key={`t${key}`} kp={`t${key++}`} header={header} rows={rows} />)
      continue
    }

    // --- bullets ---
    const bl = line.match(/^\s*[-*•]\s+(.*)/)
    if (bl) {
      bullets.push(bl[1])
      continue
    }
    flush()

    // --- headings ---
    const h = line.match(/^(#{1,3})\s+(.*)/)
    if (h) {
      const size = h[1].length === 1 ? 'text-base' : 'text-sm'
      blocks.push(
        <p key={`h${key++}`} className={`${size} mt-1 font-semibold text-zinc-900 dark:text-zinc-100`}>
          {inline(h[2], `h${key}-`)}
        </p>,
      )
      continue
    }

    if (line.trim() === '') {
      blocks.push(<div key={`sp${key++}`} className="h-1.5" />)
      continue
    }
    blocks.push(<p key={`p${key++}`}>{inline(line, `p${key}-`)}</p>)
  }
  flush()

  return <div className="flex flex-col gap-0.5">{blocks}</div>
}
