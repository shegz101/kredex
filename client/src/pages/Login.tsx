import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react'
import AuthLayout, { fieldClass, labelClass, submitClass } from '../components/AuthLayout'
import { useAuth } from '../auth/AuthContext'

interface LoginForm {
  email: string
  password: string
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const dest = (location.state as { from?: string } | null)?.from || '/dashboard'

  const [form, setForm] = useState<LoginForm>({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof LoginForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(form)
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your shop"
      subtitle="Pick up exactly where you left off."
      footer={
        <>
          New to Kredex?{' '}
          <Link to="/register" className="font-semibold text-[#EB4A26] hover:underline">
            Create your shop
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

        <div>
          <label className={labelClass} htmlFor="email">Email address</label>
          <input id="email" type="email" required autoComplete="email"
            className={fieldClass} placeholder="you@shop.com" value={form.email} onChange={set('email')} />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password"
              className={fieldClass} placeholder="••••••••" value={form.password} onChange={set('password')} />
            <button type="button" onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              aria-label={show ? 'Hide password' : 'Show password'}>
              <Icon icon={show ? 'solar:eye-closed-linear' : 'solar:eye-linear'} width="18" />
            </button>
          </div>
        </div>

        <button type="submit" disabled={busy} className={`${submitClass} mt-2`}>
          {busy ? 'Signing in…' : 'Sign in'}
          {!busy && <Icon icon="solar:arrow-right-linear" width="18" />}
        </button>
      </form>
    </AuthLayout>
  )
}
