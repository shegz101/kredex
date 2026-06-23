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

/**
 * Minimal markdown → React for the assistant's replies: handles **bold**,
 * `-`/`*`/`•` bullet lists, and blank-line spacing. Keeps us dependency-free.
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
        <ul key={`ul${key++}`} className="my-1 flex list-disc flex-col gap-1 pl-5">
          {items.map((b, i) => (
            <li key={i}>{inline(b, `li${key}-${i}-`)}</li>
          ))}
        </ul>,
      )
      bullets = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const m = line.match(/^\s*[-*•]\s+(.*)/)
    if (m) {
      bullets.push(m[1])
      continue
    }
    flush()
    if (line.trim() === '') {
      blocks.push(<div key={`sp${key++}`} className="h-1.5" />)
      continue
    }
    blocks.push(<p key={`p${key++}`}>{inline(line, `p${key}-`)}</p>)
  }
  flush()

  return <div className="flex flex-col gap-0.5">{blocks}</div>
}
