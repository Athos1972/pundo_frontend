'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Translations } from '@/lib/translations'
import { GoogleOAuthButton } from './GoogleOAuthButton'

interface Props {
  tr: Translations
  lang: string
}

export function LoginForm({ tr, lang }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/customer/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ email, password }),
      })

      if (res.status === 403) {
        // Email not verified
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&purpose=signup`)
        return
      }
      if (!res.ok) {
        setError(tr.auth_invalid_credentials)
        return
      }

      router.refresh()
      router.push('/')
    } catch {
      setError(tr.error_generic)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="text-end mt-1">
          <Link href="/auth/password-reset" className="text-xs text-accent hover:underline">
            {tr.auth_password_reset}
          </Link>
        </div>
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
        {loading ? '...' : tr.auth_login}
      </button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-muted">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <GoogleOAuthButton tr={tr} />

      <p className="text-center text-sm text-text-muted">
        {tr.auth_no_account}{' '}
        <Link href="/auth/signup" className="text-accent font-medium hover:underline">
          {tr.auth_signup}
        </Link>
      </p>
    </form>
  )
}
