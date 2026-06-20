// Tiny API client. Talks to the Express backend via the Vite /api proxy.
// The JWT lives in localStorage and is attached to every authed request.

export interface User {
  id: string
  name: string
  email: string
}

export interface Shop {
  id: string
  name: string
  type?: string
  currency?: string
  location?: string
}

export interface AuthResponse {
  token: string
  user: User
  shop: Shop
}

export interface MeResponse {
  user: User
  shop: Shop
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  shopName: string
  shopType?: string
}

export interface DashboardData {
  shop: { name: string; location: string; initials: string; currency: string }
  stats: {
    owedTotal: number
    owedCustomers: number
    revenueThisMonth: number
    revenueDeltaPct: number | null
    health: number
    healthLabel: string
  }
  revenueSeries: number[]
  revenueLabels: string[]
  activity: Array<{
    id: string
    type: string
    title: string
    meta: string
    status: string
    tone: string
    time: string
  }>
  overdue: Array<{ id: string; name: string; amount: number; note: string; initials: string }>
  lowStock: Array<{ id: string; name: string; qty: string }>
}

export interface Approval {
  _id: string
  kind: 'overdue_debt' | 'low_stock' | 'eod_summary'
  title: string
  body: string
  draft?: string
  status: 'pending' | 'approved' | 'dismissed'
  result?: string
  resolvedAt?: string
  createdAt: string
  readAt?: string | null
  payload?: Record<string, unknown>
}

export interface ApprovalsResponse {
  pending: Approval[]
  recent: Approval[]
}

export interface NotificationsResponse {
  items: Approval[]
  unread: number
}

export interface PnlItem {
  name: string
  unitsSold: number
  revenue: number
  cost: number
  profit: number
  margin: number // 0..1
}
export interface PnlData {
  period: string
  currency: string
  makingMoney: boolean
  revenue: number
  costOfGoods: number
  grossProfit: number
  grossMargin: number
  expenses: number
  netProfit: number
  netMargin: number
  items: PnlItem[]
  narrative: string
}

export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
}
export interface ParsedReceipt {
  supplier: string | null
  items: ReceiptItem[]
  total: number | null
}

export type ChatEvent =
  | { type: 'intent'; intent: string }
  | { type: 'action'; name: string; result: unknown }
  | { type: 'token'; value: string }
  | { type: 'done'; reply: string; actions: unknown[] }
  | { type: 'error'; error: string }

const TOKEN_KEY = 'kredex-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
}

async function request<T>(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const t = getToken()
    if (t) headers.Authorization = `Bearer ${t}`
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`)
  return data as T
}

export const api = {
  register: (body: RegisterInput) => request<AuthResponse>('/auth/register', { method: 'POST', body, auth: false }),
  login: (body: LoginInput) => request<AuthResponse>('/auth/login', { method: 'POST', body, auth: false }),
  me: () => request<MeResponse>('/auth/me'),
  dashboard: () => request<DashboardData>('/dashboard'),
  pnl: () => request<PnlData>('/pnl'),
  approvals: () => request<ApprovalsResponse>('/autopilot/approvals'),
  notifications: () => request<NotificationsResponse>('/autopilot/notifications'),
  markRead: (id: string) => request<{ unread: number }>('/autopilot/notifications/read', { method: 'POST', body: { id } }),
  markAllRead: () => request<{ unread: number }>('/autopilot/notifications/read', { method: 'POST' }),
  scan: () => request<{ created: number; pendingCount: number }>('/autopilot/scan', { method: 'POST' }),
  approveApproval: (id: string) => request<{ approval: Approval }>(`/autopilot/approvals/${id}/approve`, { method: 'POST' }),
  dismissApproval: (id: string) => request<{ approval: Approval }>(`/autopilot/approvals/${id}/dismiss`, { method: 'POST' }),
  commitReceipt: (body: { supplier: string | null; items: ReceiptItem[] }) =>
    request<{ ok: boolean; logged: number }>('/receipt/commit', { method: 'POST', body }),
}

/** Upload a receipt image and get back the parsed draft (multipart, so not via `request`). */
export async function parseReceipt(file: File): Promise<ParsedReceipt> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch('/api/receipt', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Receipt parse failed')
  return data as ParsedReceipt
}

/**
 * Stream a chat message over SSE. We use fetch (not EventSource) so we can POST
 * with the Authorization header. Calls onEvent for each parsed event.
 */
export async function streamChat(message: string, onEvent: (event: ChatEvent) => void): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ message }),
  })
  if (!res.ok || !res.body) throw new Error('Chat request failed')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    for (const frame of frames) {
      const line = frame.trim()
      if (!line.startsWith('data:')) continue
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as ChatEvent)
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}
