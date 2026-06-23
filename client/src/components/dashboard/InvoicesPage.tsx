import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'
import { api, downloadInvoicePdf } from '../../lib/api'
import type { Invoice, InvoiceItem } from '../../lib/api'
import { useMoney } from '../../lib/useMoney'
import { useToast } from '../Toast'
import InvoicePreview from './InvoicePreview'

type Row = { name: string; quantity: string; unitPrice: string }
const emptyRow = (): Row => ({ name: '', quantity: '1', unitPrice: '' })

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function InvoicesPage() {
  const toast = useToast()
  const { money } = useMoney()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [preview, setPreview] = useState<Invoice | null>(null)

  // form
  const [customerName, setCustomerName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<Row[]>([emptyRow()])

  async function load() {
    try {
      const r = await api.invoices()
      setInvoices(r.invoices)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])

  const previewTotal = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0)

  function resetForm() {
    setCustomerName('')
    setDueDate('')
    setNotes('')
    setRows([emptyRow()])
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const items: InvoiceItem[] = rows
      .filter((r) => r.name.trim() && Number(r.quantity) > 0)
      .map((r) => ({ name: r.name.trim(), quantity: Number(r.quantity), unitPrice: Number(r.unitPrice) || 0 }))
    if (!customerName.trim()) return toast.error('Enter a customer name')
    if (items.length === 0) return toast.error('Add at least one item')

    setBusy(true)
    try {
      const r = await api.createInvoice({ customerName: customerName.trim(), items, dueDate: dueDate || null, notes: notes || null })
      toast.success(`${r.invoice.number} created for ${r.invoice.customerName}.`, 'Invoice ready')
      setOpen(false)
      resetForm()
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create invoice')
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus(inv: Invoice) {
    const next = inv.status === 'paid' ? 'unpaid' : 'paid'
    try {
      const r = await api.setInvoiceStatus(inv._id, next)
      setInvoices((prev) => prev.map((i) => (i._id === inv._id ? r.invoice : i)))
    } catch {
      toast.error('Could not update invoice')
    }
  }

  async function download(inv: Invoice) {
    setDownloading(inv._id)
    try {
      await downloadInvoicePdf(inv._id, inv.number)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <DashboardLayout title="Invoices">
      <section className="flex flex-col gap-4 rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Professional invoices, in seconds</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Create one here or just say "invoice Emeka for 3 bags of rice" in Chat. Download as PDF.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#EB4A26] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#EB4A26]/20 transition-transform hover:-translate-y-0.5"
        >
          <Icon icon="solar:add-circle-linear" width="18" /> New invoice
        </button>
      </section>

      {loading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-20 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <Icon icon="solar:bill-list-linear" width="32" className="text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500">No invoices yet. Create your first one.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-400 dark:border-zinc-800">
            <span className="w-20">No.</span>
            <span className="flex-1">Customer</span>
            <span className="w-28 text-right">Total</span>
            <span className="w-24 text-center">Status</span>
            <span className="w-44 text-right">Actions</span>
          </div>
          {invoices.map((inv) => (
            <div
              key={inv._id}
              onClick={() => setPreview(inv)}
              className="flex cursor-pointer items-center gap-3 border-b border-zinc-50 px-5 py-3.5 transition-colors last:border-0 hover:bg-[#F3F4EF]/70 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
            >
              <span className="w-20 font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-200">{inv.number}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{inv.customerName}</p>
                <p className="text-xs text-zinc-400">{inv.items.length} item{inv.items.length === 1 ? '' : 's'} · {fmtDate(inv.createdAt)}</p>
              </div>
              <span className="w-28 text-right font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-100">{money(inv.total)}</span>
              <div className="w-24 text-center">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void toggleStatus(inv) }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    inv.status === 'paid'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : 'bg-[#EB4A26]/10 text-[#EB4A26]'
                  }`}
                  title="Click to toggle paid/unpaid"
                >
                  {inv.status === 'paid' ? 'Paid' : 'Unpaid'}
                </button>
              </div>
              <div className="flex w-44 items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void download(inv) }}
                  disabled={downloading === inv._id}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-[#EB4A26]/40 hover:text-[#EB4A26] disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300"
                >
                  <Icon icon={downloading === inv._id ? 'solar:refresh-linear' : 'solar:download-minimalistic-linear'} width="14" className={downloading === inv._id ? 'animate-spin' : ''} />
                  PDF
                </button>
                <Icon icon="solar:alt-arrow-right-linear" width="16" className="text-zinc-300 dark:text-zinc-600" />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* create modal */}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]" onClick={() => !busy && setOpen(false)} />
          <div className="no-scrollbar relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#F3F4EF] p-6 shadow-2xl dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">New invoice</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                <Icon icon="solar:close-circle-linear" width="22" />
              </button>
            </div>

            <form onSubmit={create} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Customer</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Emeka Okafor"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#EB4A26] focus:ring-2 focus:ring-[#EB4A26]/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Items</label>
                <div className="flex flex-col gap-2">
                  {rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={row.name}
                        onChange={(e) => setRows((p) => p.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))}
                        placeholder="Item"
                        className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#EB4A26] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      <input
                        value={row.quantity}
                        onChange={(e) => setRows((p) => p.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r)))}
                        inputMode="numeric"
                        placeholder="Qty"
                        className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-center text-sm outline-none focus:border-[#EB4A26] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      <input
                        value={row.unitPrice}
                        onChange={(e) => setRows((p) => p.map((r, j) => (j === i ? { ...r, unitPrice: e.target.value } : r)))}
                        inputMode="numeric"
                        placeholder="Price"
                        className="w-24 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-right text-sm outline-none focus:border-[#EB4A26] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => setRows((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : p))}
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:text-[#EB4A26]"
                        aria-label="Remove item"
                      >
                        <Icon icon="solar:trash-bin-trash-linear" width="16" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setRows((p) => [...p, emptyRow()])} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#EB4A26] hover:underline">
                  <Icon icon="solar:add-circle-linear" width="15" /> Add item
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Due date (optional)</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#EB4A26] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="rounded-xl bg-white px-4 py-2.5 text-right dark:bg-zinc-900">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">Total</span>
                    <p className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100">{money(previewTotal)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes (optional)</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thank you for your business" className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#EB4A26] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              </div>

              <button type="submit" disabled={busy} className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#EB4A26] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#EB4A26]/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                {busy ? 'Creating…' : 'Create invoice'}
                {!busy && <Icon icon="solar:arrow-right-linear" width="18" />}
              </button>
            </form>
          </div>
        </div>
      )}

      {preview && (
        <InvoicePreview
          invoice={preview}
          downloading={downloading === preview._id}
          onDownload={() => void download(preview)}
          onClose={() => setPreview(null)}
        />
      )}
    </DashboardLayout>
  )
}
