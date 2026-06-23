import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import AuthLayout, { fieldClass, labelClass, submitClass } from '../components/AuthLayout'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'

interface ResetForm {
  email: string
  password: string
  confirm: string
}

export default function ForgotPassword() {
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState<ResetForm>({ email: '', password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  const set = (k: keyof ResetForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await api.resetPassword({ email: form.email, password: form.password })
      toast.success('Your password has been changed. Sign in with it now.', 'Password reset')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="Enter your email and a new password to get back into your shop."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-[#EB4A26] hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="email">Email address</label>
          <input id="email" type="email" required autoComplete="email"
            className={fieldClass} placeholder="you@shop.com" value={form.email} onChange={set('email')} />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">New password</label>
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

        <div>
          <label className={labelClass} htmlFor="confirm">Confirm new password</label>
          <input id="confirm" type={show ? 'text' : 'password'} required minLength={6} autoComplete="new-password"
            className={fieldClass} placeholder="Re-type the password" value={form.confirm} onChange={set('confirm')} />
        </div>

        <button type="submit" disabled={busy} className={`${submitClass} mt-2`}>
          {busy ? 'Resetting…' : 'Reset password'}
          {!busy && <Icon icon="solar:arrow-right-linear" width="18" />}
        </button>
      </form>
    </AuthLayout>
  )
}
