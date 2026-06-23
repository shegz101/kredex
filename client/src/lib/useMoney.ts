import { useAuth } from '../auth/AuthContext'

const SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GHS: '₵',
  KES: 'KSh ',
  ZAR: 'R ',
}

export function symbolFor(code?: string | null): string {
  if (!code) return '₦'
  return SYMBOLS[code] ?? `${code} `
}

/** Currency-aware money formatters based on the signed-in shop's currency. */
export function useMoney() {
  const { shop } = useAuth()
  const code = shop?.currency || 'NGN'
  const symbol = symbolFor(code)

  const money = (n: number) => symbol + Math.round(n).toLocaleString()

  const moneyCompact = (n: number) => {
    if (n >= 1_000_000) {
      const m = n / 1_000_000
      return symbol + (m >= 10 ? Math.round(m).toString() : m.toFixed(2).replace(/\.?0+$/, '')) + 'M'
    }
    if (n >= 1_000) return symbol + Math.round(n / 1_000) + 'k'
    return symbol + Math.round(n)
  }

  return { money, moneyCompact, symbol, code }
}
