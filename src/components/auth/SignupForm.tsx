'use client'
// T16 — SignupForm with Turnstile CAPTCHA (F6990 Phase 2)

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { t } from '@/lib/translations'
import { GoogleOAuthButton } from './GoogleOAuthButton'
import { TurnstileWidget } from '@/components/security/TurnstileWidget'

interface Props {
  lang: string
}

export function SignupForm({ lang }: Props) {
  const tr = t(lang)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const handleToken = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(tr.auth_password_min)
      return
    }

    if (!turnstileToken) {
      setError(tr.turnstile_required)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/customer/customer/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ email, password, display_name: displayName, turnstile_token: turnstileToken }),
      })

      const data = await res.json() as {
        detail?: string | Array<{ field?: string; message?: string }>
        error?: string
      }

      if (!res.ok) {
        // Turnstile failed at frontend proxy level
        if (data?.error === 'captcha_failed') {
          setError(tr.turnstile_failed)
          return
        }

        // Parse backend error — disposable email or duplicate
        if (Array.isArray(data.detail)) {
          const emailErr = data.detail.find((d) => d.field === 'email')
          if (emailErr?.message?.includes('disposable') || emailErr?.message?.toLowerCase().includes('temporary')) {
            setError(tr.auth_disposable_email)
          } else {
            setError(emailErr?.message ?? tr.error_generic)
          }
        } else if (typeof data.detail === 'string') {
          if (data.detail === 'Already registered') {
            setError(tr.auth_have_account)
          } else {
            setError(data.detail)
          }
        } else {
          setError(tr.error_generic)
        }
        return
      }

      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&purpose=signup`)
    } catch {
      setError(tr.error_generic)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-text mb-1">
          {tr.auth_display_name}
        </label>
        <input
          id="display_name"
          type="text"
          autoComplete="nickname"
          required
          maxLength={100}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
          {tr.auth_email}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
          {tr.auth_password}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <p className="text-xs text-text-muted mt-1">{tr.auth_password_min}</p>
      </div>

      <TurnstileWidget onToken={handleToken} />

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
        {loading ? '...' : tr.auth_signup}
      </button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-muted">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <GoogleOAuthButton tr={tr} />

      <p className="text-center text-sm text-text-muted">
        {tr.auth_have_account}{' '}
        <Link href="/auth/login" className="text-accent font-medium hover:underline">
          {tr.auth_login}
        </Link>
      </p>
    </form>
  )
}
