import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import AuthLayout, { fieldClass, labelClass, submitClass } from '../components/AuthLayout'
import { useAuth } from '../auth/AuthContext'

interface RegisterForm {
  name: string
  email: string
  password: string
  shopName: string
  shopType: string
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<RegisterForm>({ name: '', email: '', password: '', shopName: '', shopType: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof RegisterForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(form)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Get early access"
      title="Create your shop"
      subtitle="Two minutes. No training. Just a conversation."
      footer={
        <>
          Already have a shop?{' '}
          <Link to="/login" className="font-semibold text-[#EB4A26] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-[#EB4A26]/10 px-4 py-3 text-sm text-[#EB4A26]">
            <Icon icon="solar:danger-triangle-linear" width="18" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="name">Your name</label>
            <input id="name" required className={fieldClass} placeholder="Mama Ada" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className={labelClass} htmlFor="shopName">Shop name</label>
            <input id="shopName" required className={fieldClass} placeholder="Mama Ada Provisions" value={form.shopName} onChange={set('shopName')} />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="shopType">What do you sell?</label>
          <input id="shopType" className={fieldClass} placeholder="Provision store, boutique, pharmacy…" value={form.shopType} onChange={set('shopType')} />
        </div>

        <div>
          <label className={labelClass} htmlFor="email">Email address</label>
          <input id="email" type="email" required autoComplete="email" className={fieldClass} placeholder="you@shop.com" value={form.email} onChange={set('email')} />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} required minLength={6} autoComplete="new-password"
              className={fieldClass} placeholder="At least 6 characters" value={form.password} onChange={set('password')} />
            <button type="button" onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              aria-label={show ? 'Hide password' : 'Show password'}>
              <Icon icon={show ? 'solar:eye-closed-linear' : 'solar:eye-linear'} width="18" />
            </button>
          </div>
        </div>

        <button type="submit" disabled={busy} className={`${submitClass} mt-2`}>
          {busy ? 'Creating your shop…' : 'Create shop'}
          {!busy && <Icon icon="solar:arrow-right-linear" width="18" />}
        </button>
      </form>
    </AuthLayout>
  )
}
