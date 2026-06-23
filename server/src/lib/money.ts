const SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GHS: "₵",
  KES: "KSh ",
  ZAR: "R ",
};

export function symbolFor(code = "NGN"): string {
  return SYMBOLS[code] ?? `${code} `;
}

/** Format an amount with the shop's currency symbol, e.g. fmtMoney(4250, "USD") -> "$4,250". */
export function fmtMoney(n: number, code = "NGN"): string {
  return symbolFor(code) + Math.round(n).toLocaleString();
}
