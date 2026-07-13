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
    health: number | null
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
  overdue: Array<{ id: string; name: string; amount: number; note: string; initials: string; phone?: string | null; draft?: string }>
  lowStock: Array<{ id: string; name: string; qty: string }>
}

export interface Reminder {
  _id: string
  text: string
  dueAt: string
  status: 'pending' | 'done' | 'dismissed'
  createdAt: string
}

export interface MemoryItem {
  id: string
  text: string
  kind: 'fact' | 'preference' | 'event' | 'chat'
  importance: number
  accessCount: number
  lastAccessedAt: string
  pinned: boolean
  createdAt: string
}
export interface MemoryStats {
  total: number
  kinds: Record<string, number>
}

/** A structured, overwriteable fact (Tier 1 — the canonical-key trie). */
export interface FactItem {
  id: string
  key: string
  category?: string
  subject?: string
  attribute?: string
  value: string | number
  unit?: string
  label?: string
  updatedAt: string
  changes: number // how many times this fact has been overwritten
}

export interface NotificationItem {
  id: string
  type: 'reminder' | 'low_stock' | 'debt_due'
  title: string
  body: string
  severity: 'danger' | 'warning' | 'info'
  at: string
  href: string
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

export interface InvoiceItem {
  name: string
  quantity: number
  unitPrice: number
}
export interface Invoice {
  _id: string
  number: string
  customerName: string
  items: InvoiceItem[]
  total: number
  status: 'unpaid' | 'paid'
  notes?: string
  dueDate?: string
  createdAt: string
}

export interface ShopSettings {
  name: string
  type: string
  currency: string
  lowStockThreshold: number
  location: string
}

export interface Opportunity {
  title: string
  type: string
  organization: string
  summary: string
  eligibility: string
  amount: string
  deadline: string
  howToApply: string
  locationFit: string
  sourceUrl?: string
}
export interface SettingsData {
  shop: ShopSettings
  user: { name: string; email: string }
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

export interface ChatHistoryMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  intent?: string
  actions?: { name: string; result: unknown }[]
  receipt?: (ParsedReceipt & { committed?: boolean }) | null
}

export interface ChatSessionMeta {
  id: string
  title: string
  lastMessageAt: string
}

export type ChatEvent =
  | { type: 'session'; sessionId: string }
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
  resetPassword: (body: { email: string; password: string }) =>
    request<{ ok: boolean }>('/auth/reset-password', { method: 'POST', body, auth: false }),
  emailAvailable: (email: string) =>
    request<{ valid: boolean; available: boolean }>(`/auth/email-available?email=${encodeURIComponent(email)}`, { auth: false }),
  me: () => request<MeResponse>('/auth/me'),
  dashboard: () => request<DashboardData>('/dashboard'),
  pnl: () => request<PnlData>('/pnl'),
  revenue: (range: string) =>
    request<{ series: number[]; labels: string[]; total: number; range: string }>(`/dashboard/revenue?range=${range}`),
  chatSessions: () => request<{ sessions: ChatSessionMeta[] }>('/chat/sessions'),
  createSession: () => request<ChatSessionMeta>('/chat/sessions', { method: 'POST' }),
  deleteSession: (id: string) => request<{ ok: boolean }>(`/chat/sessions/${id}`, { method: 'DELETE' }),
  chatHistory: (sessionId?: string) =>
    request<{ sessionId: string | null; messages: ChatHistoryMessage[] }>(
      `/chat/history${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`,
    ),
  saveMessage: (role: 'user' | 'assistant', text: string, receipt?: unknown, sessionId?: string) =>
    request<{ ok: boolean; id?: string; sessionId?: string }>('/chat/message', {
      method: 'POST',
      body: { role, text, receipt, sessionId },
    }),
  markReceiptCommitted: (id: string) =>
    request<{ ok: boolean }>(`/chat/message/${id}/receipt-committed`, { method: 'PATCH' }),
  settings: () => request<SettingsData>('/settings'),
  updateShop: (body: Partial<ShopSettings>) => request<{ shop: ShopSettings }>('/settings/shop', { method: 'PATCH', body }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>('/settings/password', { method: 'POST', body }),
  findOpportunities: (body: { categories?: string[]; query?: string }) =>
    request<{ location: string; opportunities: Opportunity[] }>('/opportunities', { method: 'POST', body }),
  reminders: () => request<{ reminders: Reminder[] }>('/reminders'),
  createReminder: (body: { text: string; dueAt: string }) => request<{ reminder: Reminder }>('/reminders', { method: 'POST', body }),
  setReminderStatus: (id: string, status: 'pending' | 'done' | 'dismissed') =>
    request<{ reminder: Reminder }>(`/reminders/${id}`, { method: 'PATCH', body: { status } }),
  invoices: () => request<{ invoices: Invoice[] }>('/invoices'),
  createInvoice: (body: { customerName: string; items: InvoiceItem[]; dueDate?: string | null; notes?: string | null }) =>
    request<{ invoice: Invoice }>('/invoices', { method: 'POST', body }),
  setInvoiceStatus: (id: string, status: 'paid' | 'unpaid') =>
    request<{ invoice: Invoice }>(`/invoices/${id}`, { method: 'PATCH', body: { status } }),
  commitReceipt: (body: { supplier: string | null; items: ReceiptItem[] }) =>
    request<{ ok: boolean; logged: number }>('/receipt/commit', { method: 'POST', body }),
  memory: () => request<{ memories: MemoryItem[]; stats: MemoryStats; facts: FactItem[] }>('/memory'),
  memoryRecall: (q: string) => request<{ recalled: { id: string; text: string; score: number }[] }>(`/memory/recall?q=${encodeURIComponent(q)}`),
  forgetMemory: (id: string) => request<{ ok: true }>(`/memory/${id}/forget`, { method: 'POST' }),
  notifications: () => request<{ notifications: NotificationItem[]; count: number }>('/notifications'),
}

/** Download an invoice PDF (blob fetch so we can send the auth header, then save). */
export async function downloadInvoicePdf(id: string, number: string): Promise<void> {
  const res = await fetch(`/api/invoices/${id}/pdf`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Failed to download the PDF')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${number}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Text-to-speech: get spoken audio (WAV blob) for a reply. */
export async function speakText(text: string): Promise<Blob> {
  const res = await fetch('/api/voice/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error('Could not generate voice')
  return await res.blob()
}

/** Send recorded audio (WAV) and get back the transcription. */
export async function transcribeAudio(wav: Blob): Promise<string> {
  const fd = new FormData()
  fd.append('audio', wav, 'audio.wav')
  const res = await fetch('/api/voice/transcribe', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Transcription failed')
  return (data as { text: string }).text
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
export async function streamChat(
  message: string,
  onEvent: (event: ChatEvent) => void,
  sessionId?: string,
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ message, sessionId }),
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
