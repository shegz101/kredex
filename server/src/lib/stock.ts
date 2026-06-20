/**
 * One source of truth for "is this item low?" so the dashboard, autopilot, and
 * chat agent never disagree.
 *
 * An item is low when its quantity falls to/below its threshold, where the
 * threshold is the item's own `lowStockAt` (if set) or the shop's default.
 */
export const DEFAULT_LOW_STOCK = 5;

interface StockLike {
  quantity: number;
  lowStockAt?: number | null;
}

export function lowThreshold(item: StockLike, shopDefault: number = DEFAULT_LOW_STOCK): number {
  return item.lowStockAt && item.lowStockAt > 0 ? item.lowStockAt : shopDefault;
}

export function isLow(item: StockLike, shopDefault: number = DEFAULT_LOW_STOCK): boolean {
  return item.quantity <= lowThreshold(item, shopDefault);
}
