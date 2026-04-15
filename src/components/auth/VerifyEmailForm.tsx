'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/translations'

interface Props {
  lang: string
  email: string
  purpose: 'signup' | 'password_reset'
}

export function VerifyEmailForm({ lang, email, purpose }: Props) {
  const tr = t(lang)
  const router = useRouter()
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/customer/customer/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ email, otp, purpose }),
      })

      if (!res.ok) {
        setError(tr.auth_otp_invalid)
        return
      }

      if (purpose === 'signup') {
        // Nach erfolgreichem Signup-Verify hat das Backend den Auth-Cookie
        // bereits gesetzt (siehe customer_auth.verify_otp). Wir navigieren
        // direkt auf die Startseite und rufen router.refresh() auf, damit
        // das Server-Layout `getCustomerSession()` neu ausfuehrt und der
        // SessionProvider den eingeloggten User im UI sieht — sonst bleibt
        // der Header-Button auf "Sign in" bis zum naechsten Full-Reload.
        router.push('/')
        router.refresh()
      } else {
        router.push(`/auth/password-reset/confirm?email=${encodeURIComponent(email)}`)
      }
    } catch {
      setError(tr.error_generic)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResent(false)
    setError('')
    try {
      await fetch('/api/customer/customer/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ email, purpose }),
      })
      setResent(true)
    } catch {
      // silently ignore
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-text-muted">{tr.auth_otp_sent(email)}</p>

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

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {resent && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {tr.auth_otp_resent}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || otp.length !== 6}
        className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-60"
      >
        {loading ? '...' : tr.auth_verify_email}
      </button>

      <button
        type="button"
        onClick={handleResend}
        className="text-sm text-accent hover:underline"
      >
        {tr.auth_otp_resend}
      </button>
    </form>
  )
}
