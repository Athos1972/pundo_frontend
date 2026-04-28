'use client'
// T14 — Coming-Soon Email Signup Form with Turnstile CAPTCHA (F6990 Phase 2)

import { useState, useCallback } from 'react'
import { TurnstileWidget } from '@/components/security/TurnstileWidget'
import { getLangFromCookie } from '@/lib/lang'
import { t } from '@/lib/translations'

interface EmailFormTr {
  placeholder: string
  submit: string
  success: string
  error: string
}

export function EmailSignupForm({ tr }: { tr: EmailFormTr }) {
  const lang = getLangFromCookie()
  const secTr = t(lang)

  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'captcha_failed'>('idle')

  const handleToken = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!turnstileToken) {
      setStatus('captcha_failed')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/coming-soon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstile_token: turnstileToken }),
      })

      if (res.ok) {
        setStatus('success')
        return
      }

      const data = await res.json().catch(() => ({}))
      if (data?.error === 'captcha_failed') {
        setStatus('captcha_failed')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return <p className="cs-success">{tr.success}</p>
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="cs-form">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={tr.placeholder}
          required
          className="cs-input"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="cs-btn"
        >
          {status === 'loading' ? '…' : tr.submit}
        </button>
      </form>

      <TurnstileWidget onToken={handleToken} className="mt-3" />

      {status === 'error' && (
        <p className="cs-error">{tr.error}</p>
      )}
      {status === 'captcha_failed' && (
        <p className="cs-error">{secTr.turnstile_failed}</p>
      )}
    </div>
  )
}
