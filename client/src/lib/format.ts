/** Money + number formatting helpers (NGN). */

export function naira(n: number): string {
  return '₦' + Math.round(n).toLocaleString()
}

export function nairaCompact(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return '₦' + (m >= 10 ? Math.round(m).toString() : m.toFixed(2).replace(/\.?0+$/, '')) + 'M'
  }
  if (n >= 1_000) return '₦' + Math.round(n / 1_000) + 'k'
  return '₦' + Math.round(n)
}
