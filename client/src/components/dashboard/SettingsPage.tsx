import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'
import DashboardLayout from './DashboardLayout'
import { api } from '../../lib/api'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../Toast'

const CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'ZAR']
const field = 'w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-[#EB4A26] focus:ring-2 focus:ring-[#EB4A26]/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
const label = 'mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300'

export default function SettingsPage() {
  const toast = useToast()
  const { refresh } = useAuth()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')

  // shop form
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [location, setLocation] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [lowStock, setLowStock] = useState('5')
  const [savingShop, setSavingShop] = useState(false)

  // password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => {
    api
      .settings()
      .then((s) => {
        setName(s.shop.name)
        setType(s.shop.type)
        setLocation(s.shop.location || '')
        setCurrency(s.shop.currency)
        setLowStock(String(s.shop.lowStockThreshold))
        setEmail(s.user.email)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function saveShop(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSavingShop(true)
    try {
      await api.updateShop({ name: name.trim(), type: type.trim(), location: location.trim(), currency, lowStockThreshold: Number(lowStock) || 0 })
      await refresh()
      toast.success('Your shop details are updated.', 'Saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSavingShop(false)
    }
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (newPassword !== confirm) return toast.error('The new passwords do not match.')
    setSavingPw(true)
    try {
      await api.changePassword({ currentPassword, newPassword })
      toast.success('Your password has been changed.', 'Done')
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change password')
    } finally {
      setSavingPw(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Settings">
        <div className="h-64 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Settings">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* shop profile */}
        <section className="rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#EB4A26]/10 text-[#EB4A26]">
              <Icon icon="solar:shop-2-linear" width="18" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Shop profile</h2>
          </div>

          <form onSubmit={saveShop} className="mt-5 flex flex-col gap-4">
            <div>
              <label className={label} htmlFor="shopName">Shop name</label>
              <input id="shopName" className={field} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="shopType">What you sell</label>
              <input id="shopType" className={field} value={type} onChange={(e) => setType(e.target.value)} placeholder="Provision store, boutique…" />
            </div>
            <div>
              <label className={label} htmlFor="location">Location</label>
              <input id="location" className={field} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Yaba, Lagos, Nigeria" />
              <p className="mt-1 text-xs text-zinc-400">Used by the Opportunities scout to find loans, grants & programs near you.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="currency">Currency</label>
                <select id="currency" className={field} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="lowStock">Low-stock alert at</label>
                <input id="lowStock" type="number" min={0} className={field} value={lowStock} onChange={(e) => setLowStock(e.target.value)} />
              </div>
            </div>
            <p className="-mt-1 text-xs text-zinc-400">
              Default reorder level for items that don't have their own. (Set per-item in chat: "warn me when rice is below 10".)
            </p>
            <button type="submit" disabled={savingShop} className="mt-1 flex items-center justify-center gap-2 self-start rounded-xl bg-[#EB4A26] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#EB4A26]/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60">
              {savingShop ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        {/* security */}
        <section className="rounded-3xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#EB4A26]/10 text-[#EB4A26]">
              <Icon icon="solar:lock-password-linear" width="18" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Security</h2>
          </div>

          <div className="mt-5 rounded-xl bg-[#F3F4EF]/70 px-4 py-3 text-sm dark:bg-zinc-800/50">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Signed in as</span>
            <p className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-100">{email}</p>
          </div>

          <form onSubmit={savePassword} className="mt-4 flex flex-col gap-4">
            <div>
              <label className={label} htmlFor="cur">Current password</label>
              <input id="cur" type="password" className={field} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="new">New password</label>
                <input id="new" type="password" className={field} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={6} />
              </div>
              <div>
                <label className={label} htmlFor="conf">Confirm</label>
                <input id="conf" type="password" className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={6} />
              </div>
            </div>
            <button type="submit" disabled={savingPw} className="mt-1 flex items-center justify-center gap-2 self-start rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60 dark:bg-white dark:text-zinc-900">
              {savingPw ? 'Updating…' : 'Change password'}
            </button>
          </form>
        </section>
      </div>
    </DashboardLayout>
  )
}
