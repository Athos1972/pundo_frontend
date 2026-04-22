'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getLangFromCookie } from '@/lib/lang'
import { t } from '@/lib/translations'

export default function PasswordResetPage() {
  const lang = getLangFromCookie()
  const tr = t(lang)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/customer/customer/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ email }),
      })
      // Always show success to avoid email enumeration
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-sm text-center">
          <p className="text-text mb-4">{tr.auth_password_reset_sent}</p>
          <button
            onClick={() => router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&purpose=password_reset`)}
            className="text-accent hover:underline text-sm"
          >
            {tr.auth_otp_label} →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <h1
          className="text-2xl font-extrabold text-text mb-6 font-heading"
        >
          {tr.auth_password_reset_title}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
              {tr.auth_email}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {loading ? '...' : tr.auth_password_reset_title}
          </button>

          <Link href="/auth/login" className="text-center text-sm text-accent hover:underline">
            {tr.auth_login}
          </Link>
        </form>
      </div>
    </main>
  )
}
