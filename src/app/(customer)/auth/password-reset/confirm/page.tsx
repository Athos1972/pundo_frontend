'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getLangFromCookie } from '@/lib/lang'
import { t } from '@/lib/translations'

export default function PasswordResetConfirmPage() {
  const lang = getLangFromCookie()
  const tr = t(lang)
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') ?? ''

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError(tr.auth_password_min)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/customer/customer/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      })

      if (!res.ok) {
        setError(tr.auth_otp_invalid)
        return
      }

      router.push('/auth/login')
    } catch {
      setError(tr.error_generic)
    } finally {
      setLoading(false)
    }
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
            <label htmlFor="otp" className="block text-sm font-medium text-text mb-1">
              {tr.auth_otp_label}
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="000000"
            />
          </div>

          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-text mb-1">
              {tr.auth_password_new}
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {loading ? '...' : tr.auth_password_reset_title}
          </button>
        </form>
      </div>
    </main>
  )
}
