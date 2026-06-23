import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'
import { api, parseReceipt, streamChat, transcribeAudio, speakText } from '../../lib/api'
import type { ChatEvent, ParsedReceipt } from '../../lib/api'
import { useAuth } from '../../auth/AuthContext'
import { useMoney } from '../../lib/useMoney'
import { renderMarkdown } from '../../lib/markdown'
import { blobToWav } from '../../lib/audio'
import { useToast } from '../Toast'

interface Action {
  name: string
  result: unknown
}
interface Receipt extends ParsedReceipt {
  committed?: boolean
}
interface Msg {
  id: string
  role: 'user' | 'kredex'
  text: string
  intent?: string
  actions: Action[]
  pending: boolean
  image?: string
  receipt?: Receipt
}

const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  log_stock: { label: 'Stock logged', icon: 'solar:box-linear' },
  record_sale: { label: 'Sale recorded', icon: 'solar:cart-large-2-linear' },
  record_credit_sale: { label: 'Credit sale', icon: 'solar:wallet-money-linear' },
  record_payment: { label: 'Payment recorded', icon: 'solar:hand-money-linear' },
  query_debts: { label: 'Debts', icon: 'solar:bill-list-linear' },
  query_stock: { label: 'Stock check', icon: 'solar:box-minimalistic-linear' },
  daily_summary: { label: "Today's summary", icon: 'solar:chart-2-linear' },
}

const SUGGESTIONS = [
  'I bought 20 bags of rice from Alhaji at ₦3,500 each',
  'Iya Tunde carry 5 bags of rice, she go pay Saturday',
  'Who dey owe me money?',
  'How my shop be today?',
]

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase().trim()
}

const MONEY_KEYS = /owe|owes|owed|total|paid|amount|outstanding|balance|revenue/i

function flattenResult(result: unknown): { k: string; v: string }[] {
  if (!result || typeof result !== 'object') return []
  const rows: { k: string; v: string }[] = []
  for (const [k, val] of Object.entries(result as Record<string, unknown>)) {
    if (k === 'ok' || k === 'transactionId' || val == null) continue
    if (Array.isArray(val)) {
      if (val.length) rows.push({ k, v: `${val.length} item${val.length === 1 ? '' : 's'}` })
    } else if (typeof val === 'object') {
      rows.push({ k, v: Object.values(val as Record<string, unknown>).filter((x) => x != null).join(' · ') })
    } else if (typeof val === 'number' && MONEY_KEYS.test(k)) {
      rows.push({ k, v: '₦' + val.toLocaleString() })
    } else {
      rows.push({ k, v: String(val) })
    }
  }
  return rows.slice(0, 4)
}

function ActionCard({ action }: { action: Action }) {
  const meta = TOOL_LABELS[action.name] ?? { label: action.name, icon: 'solar:bolt-linear' }
  const err = (action.result as { error?: string } | null)?.error
  const rows = err ? [] : flattenResult(action.result)
  return (
    <div className="rounded-xl border border-zinc-200 bg-[#F3F4EF]/70 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-[#EB4A26]/10 text-[#EB4A26]">
          <Icon icon={meta.icon} width="14" />
        </span>
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{meta.label}</span>
      </div>
      {err ? (
        <p className="mt-2 text-xs text-[#EB4A26]">{err}</p>
      ) : (
        rows.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {rows.map((r) => (
              <span key={r.k} className="text-[11px] text-zinc-500 dark:text-zinc-400">
                <span className="text-zinc-400">{humanize(r.k)}:</span>{' '}
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{r.v}</span>
              </span>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function ReceiptCard({ receipt, committing, onLog }: { receipt: Receipt; committing: boolean; onLog: () => void }) {
  const { money } = useMoney()
  const total = receipt.total ?? receipt.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  return (
    <div className="max-w-[90%] self-start rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-dashed border-zinc-200 pb-2.5 dark:border-zinc-700">
        <Icon icon="solar:camera-linear" width="16" className="text-[#EB4A26]" />
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          {receipt.supplier ? `From ${receipt.supplier}` : 'Receipt'}
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-zinc-400">Kredex Vision</span>
      </div>
      <div className="flex flex-col py-1.5">
        {receipt.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-100">{it.name}</span>
            <span className="font-mono text-xs text-zinc-400">
              {it.quantity} × {money(it.unitPrice)}
            </span>
            <span className="w-20 text-right font-mono text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {money(it.quantity * it.unitPrice)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-dashed border-zinc-200 pt-2.5 dark:border-zinc-700">
        <span className="text-xs text-zinc-400">Total</span>
        <span className="font-mono text-base font-semibold text-zinc-900 dark:text-zinc-100">{money(total)}</span>
      </div>
      {receipt.committed ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-emerald-50 py-2 text-sm font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Icon icon="solar:check-circle-bold" width="16" /> Logged to your stock
        </div>
      ) : (
        <button
          type="button"
          onClick={onLog}
          disabled={committing}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#EB4A26] py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {committing ? <Icon icon="solar:refresh-linear" width="15" className="animate-spin" /> : <Icon icon="solar:box-linear" width="15" />}
          {committing ? 'Logging…' : `Log ${receipt.items.length} item${receipt.items.length === 1 ? '' : 's'} to stock`}
        </button>
      )}
    </div>
  )
}

let counter = 0
const nextId = () => `m${++counter}`

export default function ChatPage() {
  const { shop } = useAuth()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [committingId, setCommittingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cameFromVoice = useRef(false)

  // load saved conversation on mount so chats survive navigation/reload
  useEffect(() => {
    let active = true
    api
      .chatHistory()
      .then((r) => {
        if (!active) return
        setMessages(
          r.messages.map((m) => ({
            id: m.id,
            role: m.role === 'user' ? 'user' : 'kredex',
            text: m.text,
            intent: m.intent,
            actions: (m.actions ?? []) as Action[],
            pending: false,
          })),
        )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const patch = (id: string, fn: (m: Msg) => Msg) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)))

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || busy) return
    const speakIt = cameFromVoice.current // talk → Kredex talks back
    cameFromVoice.current = false
    setInput('')
    const botId = nextId()
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: msg, actions: [], pending: false },
      { id: botId, role: 'kredex', text: '', actions: [], pending: true },
    ])
    setBusy(true)
    let finalReply = ''
    try {
      await streamChat(msg, (e: ChatEvent) => {
        if (e.type === 'intent') patch(botId, (m) => ({ ...m, intent: e.intent }))
        else if (e.type === 'action') patch(botId, (m) => ({ ...m, actions: [...m.actions, { name: e.name, result: e.result }] }))
        else if (e.type === 'token') {
          finalReply += e.value
          patch(botId, (m) => ({ ...m, text: m.text + e.value }))
        } else if (e.type === 'done') {
          finalReply = e.reply || finalReply
          patch(botId, (m) => ({ ...m, text: e.reply || m.text, pending: false }))
        } else if (e.type === 'error') {
          finalReply = ''
          patch(botId, (m) => ({ ...m, text: e.error, pending: false }))
        }
      })
    } catch {
      patch(botId, (m) => ({ ...m, text: 'Sorry — something went wrong. Please try again.', pending: false }))
    } finally {
      patch(botId, (m) => ({ ...m, pending: false }))
      setBusy(false)
    }
    if (speakIt && finalReply) void playReply(botId, finalReply)
  }

  async function handleReceipt(file: File) {
    if (busy) return
    const preview = URL.createObjectURL(file)
    const botId = nextId()
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: 'Sent a receipt photo', image: preview, actions: [], pending: false },
      { id: botId, role: 'kredex', text: '', actions: [], pending: true },
    ])
    setBusy(true)
    try {
      const data = await parseReceipt(file)
      void api.saveMessage('user', 'Sent a receipt photo')
      if (data.items.length === 0) {
        patch(botId, (m) => ({ ...m, pending: false, text: "I couldn't read items off that one — try a clearer, flatter photo." }))
        void api.saveMessage('assistant', "I couldn't read items off that receipt.")
      } else {
        patch(botId, (m) => ({
          ...m,
          pending: false,
          text: "I read your receipt 👇 Check it's right, then log it to your stock.",
          receipt: { ...data, committed: false },
        }))
        void api.saveMessage('assistant', `I read your receipt — found ${data.items.length} item(s): ${data.items.map((it) => it.name).join(', ')}.`)
      }
    } catch (e) {
      patch(botId, (m) => ({ ...m, pending: false, text: e instanceof Error ? e.message : 'Failed to read the receipt.' }))
    } finally {
      setBusy(false)
    }
  }

  async function commit(id: string, receipt: Receipt) {
    setCommittingId(id)
    try {
      await api.commitReceipt({ supplier: receipt.supplier, items: receipt.items })
      patch(id, (m) => (m.receipt ? { ...m, receipt: { ...m.receipt, committed: true } } : m))
      void api.saveMessage('assistant', `Logged ${receipt.items.length} item(s) from the receipt to stock.`)
    } finally {
      setCommittingId(null)
    }
  }

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void handleReceipt(file)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        setTranscribing(true)
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
          const wav = await blobToWav(blob)
          const text = await transcribeAudio(wav)
          if (text) {
            setInput((prev) => (prev ? prev + ' ' : '') + text)
            cameFromVoice.current = true // → Kredex will speak its reply back
          } else {
            toast.info("Didn't catch that — try again.")
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Could not transcribe')
        } finally {
          setTranscribing(false)
        }
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
    } catch {
      toast.error('Microphone was blocked. Allow mic access to use voice.')
    }
  }

  function toggleMic() {
    if (recording) recorderRef.current?.stop()
    else void startRecording()
  }

  async function playReply(id: string, text: string) {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    try {
      setSpeakingId(id)
      const blob = await speakText(text)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setSpeakingId(null)
        URL.revokeObjectURL(url)
      }
      await audio.play()
    } catch (err) {
      setSpeakingId(null)
      toast.error(err instanceof Error ? err.message : 'Could not play voice')
    }
  }

  function stopSpeak() {
    audioRef.current?.pause()
    audioRef.current = null
    setSpeakingId(null)
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void send(input)
  }

  return (
    <DashboardLayout title="Chat">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto p-5 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-[#EB4A26]/10 text-[#EB4A26]">
                <Icon icon="solar:chat-round-line-bold" width="32" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Talk to {shop?.name || 'your shop'}
                </h2>
                <p className="mt-1 max-w-md text-sm text-zinc-500">
                  Log sales, stock, and debts in plain English or Pidgin — or snap a supplier receipt. Try one:
                </p>
              </div>
              <div className="flex max-w-xl flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-zinc-200 bg-[#F3F4EF]/70 px-3.5 py-2 text-sm text-zinc-600 transition-colors hover:border-[#EB4A26]/40 hover:text-[#EB4A26] dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-5">
              {messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex flex-col items-end gap-1.5">
                    {m.image && (
                      <img src={m.image} alt="receipt" className="max-h-44 rounded-2xl border border-zinc-200 object-cover dark:border-zinc-700" />
                    )}
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#EB4A26] px-4 py-2.5 text-sm text-white shadow-sm">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex flex-col gap-2">
                    {(m.text || (!m.pending && !m.receipt)) && (
                      <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-zinc-200 bg-[#F3F4EF]/60 px-4 py-2.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100">
                        {m.text ? renderMarkdown(m.text) : '…'}
                      </div>
                    )}
                    {m.text && !m.pending && (
                      <button
                        type="button"
                        onClick={() => (speakingId === m.id ? stopSpeak() : playReply(m.id, m.text))}
                        className="flex items-center gap-1 self-start pl-1 text-[11px] text-zinc-400 transition-colors hover:text-[#EB4A26]"
                        aria-label={speakingId === m.id ? 'Stop' : 'Play reply'}
                      >
                        <Icon icon={speakingId === m.id ? 'solar:stop-circle-bold' : 'solar:volume-loud-linear'} width="13" />
                        {speakingId === m.id ? 'Stop' : 'Play'}
                      </button>
                    )}
                    {m.receipt && (
                      <ReceiptCard
                        receipt={m.receipt}
                        committing={committingId === m.id}
                        onLog={() => void commit(m.id, m.receipt!)}
                      />
                    )}
                    {m.pending && !m.text && (
                      <div className="flex items-center gap-1 self-start rounded-2xl rounded-bl-md border border-zinc-200 bg-[#F3F4EF]/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                        {[0, 1, 2].map((d) => (
                          <span key={d} className="size-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${d * 0.15}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* composer */}
        <form onSubmit={onSubmit} className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPickFile} className="hidden" />
            <button
              type="button"
              onClick={toggleMic}
              disabled={busy || transcribing}
              aria-label={recording ? 'Stop recording' : 'Speak to log'}
              title={recording ? 'Stop' : 'Speak to log'}
              className={`flex size-12 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
                recording
                  ? 'animate-pulse border-[#EB4A26] bg-[#EB4A26] text-white'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:border-[#EB4A26]/40 hover:text-[#EB4A26] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Icon
                icon={transcribing ? 'solar:refresh-linear' : recording ? 'solar:stop-circle-bold' : 'solar:microphone-3-linear'}
                width="20"
                className={transcribing ? 'animate-spin' : ''}
              />
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Scan a receipt"
              title="Scan a receipt"
              className="flex size-12 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-[#EB4A26]/40 hover:text-[#EB4A26] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            >
              <Icon icon="solar:camera-linear" width="20" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? 'Listening… tap ⏹ to stop' : transcribing ? 'Transcribing…' : 'Tell Kredex what happened…'}
              className="flex-1 rounded-full border border-zinc-200 bg-[#F3F4EF]/60 px-5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-[#EB4A26] focus:ring-2 focus:ring-[#EB4A26]/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#EB4A26] text-white shadow-lg shadow-[#EB4A26]/20 transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Icon icon={busy ? 'solar:refresh-linear' : 'solar:arrow-up-linear'} width="20" className={busy ? 'animate-spin' : ''} />
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
