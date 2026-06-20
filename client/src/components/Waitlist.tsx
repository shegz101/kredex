import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'

export default function Waitlist() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
  }

  return (
    <section id="waitlist" className="w-full max-w-6xl mx-auto px-6 pb-28 relative z-10">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-10 sm:p-16 text-center shadow-sm">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[60%] h-[60%] bg-[#EB4A26]/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#EB4A26]/20 bg-[#EB4A26]/5 text-[11px] font-medium text-[#EB4A26] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EB4A26] animate-pulse"></span>
            Early access
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-zinc-900 to-zinc-600 mb-4">
            Be the first to know your business.
          </h2>
          <p className="text-zinc-500 text-sm sm:text-base mb-8 max-w-md">
            Join the waitlist and we'll reach out when Kredex opens in your market.
          </p>

          {submitted ? (
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#EB4A26]/5 border border-[#EB4A26]/20 text-sm font-medium text-[#EB4A26]">
              <Icon icon="solar:check-circle-bold" width="18" />
              You're on the list! We'll be in touch soon.
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="w-full flex flex-col sm:flex-row items-center gap-3 max-w-md"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="w-full flex-1 px-4 py-3 rounded-full bg-[#F3F4EF] border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#EB4A26]/40 focus:ring-2 focus:ring-[#EB4A26]/10 transition-all"
              />
              <button
                type="submit"
                className="w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2 text-sm font-medium text-white bg-[#EB4A26] hover:bg-[#EB4A26]/90 transition-all hover:-translate-y-0.5 px-6 py-3 rounded-full shadow-lg shadow-[#EB4A26]/20 group"
              >
                Join waitlist
                <Icon
                  icon="solar:arrow-right-linear"
                  width="16"
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </button>
            </form>
          )}
          <p className="text-[11px] text-zinc-400 mt-4">Free to start. No card required.</p>
        </div>
      </div>
    </section>
  )
}
