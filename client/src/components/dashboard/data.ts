// Mock data for the Kredex operator dashboard, used as a fallback before the
// live /api/dashboard data is wired into these components.

export type Range = '24h' | '7d' | '30d'

export const shop = {
  name: 'Mama Ada Provisions',
  location: 'Lagos, NG',
  initials: 'MA',
}

export const stats = {
  owed: { value: '₦247,500', sub: '4 customers', label: 'Total owed to you' },
  revenue: { value: '₦1.28M', sub: '8% vs last month', up: true, label: 'Revenue this month' },
  health: { value: '74', outOf: '/100', sub: 'Good', label: 'Business health' },
}

export const revenueSeries: Record<Range, number[]> = {
  '24h': [1200, 1800, 1500, 2600, 2100, 3400, 3000, 4200, 3800, 5200, 4600, 6100,
    5400, 4800, 5900, 6800, 6200, 7400, 6900, 8100, 7600, 8800, 8200, 9300],
  '7d': [38000, 42500, 36000, 51000, 47500, 58000, 62500],
  '30d': [31000, 34500, 33000, 38000, 36500, 41000, 39500, 37000, 43000, 45500,
    42000, 47000, 44500, 49000, 46500, 52000, 48500, 51000, 55500, 53000, 49500,
    57000, 54500, 59000, 56500, 61000, 58500, 63000, 60500, 66000],
}

export const revenueXLabels: Record<Range, string[]> = {
  '24h': ['00:00', '06:00', '12:00', '18:00', '23:00'],
  '7d': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  '30d': ['1', '6', '11', '16', '21', '26', '30'],
}

export interface ActivityItem {
  id: number | string
  type: string
  title: string
  meta: string
  status: string
  tone: string
  time: string
}

export const activity: ActivityItem[] = [
  { id: 1, type: 'sale', title: '2 bags of rice → Mama Bisi', meta: 'Inventory · stock 48 left', status: 'Credit', tone: 'orange', time: '09:41' },
  { id: 2, type: 'payment', title: 'Emeka paid ₦20,000', meta: 'Debt · ₦76,000 remaining', status: 'Paid', tone: 'green', time: '08:55' },
  { id: 3, type: 'restock', title: '10 crates of malt added', meta: 'Inventory · from Adaeze Stores', status: 'Stock', tone: 'zinc', time: '08:30' },
  { id: 4, type: 'invoice', title: 'Invoice KRD-007 sent to Emeka', meta: 'Invoices · ₦96,000', status: 'Sent', tone: 'zinc', time: 'Yesterday' },
  { id: 5, type: 'sale', title: '5 cartons of sugar (cash)', meta: 'Inventory · ₦18,000', status: 'Cash', tone: 'green', time: 'Yesterday' },
]

export interface OverdueItem {
  id: string
  name: string
  amount: string
  note: string
  initials: string
}

export const overdue: OverdueItem[] = [
  { id: 'd1', name: 'Emeka Okafor', amount: '₦96,000', note: '6 days overdue', initials: 'EO' },
  { id: 'd2', name: 'Mama Bisi', amount: '₦90,000', note: 'Due tomorrow', initials: 'MB' },
]

export interface LowStockItem {
  id: string
  name: string
  qty: string
}

export const lowStock: LowStockItem[] = [
  { id: 's1', name: 'Malt', qty: '12 crates' },
  { id: 's2', name: 'Sugar', qty: '8 cartons' },
]
