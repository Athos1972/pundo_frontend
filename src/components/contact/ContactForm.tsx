'use client'
// T15 — Contact Form with Turnstile CAPTCHA (F6990 Phase 2)

import { useState, useCallback, useEffect } from 'react'
import { t } from '@/lib/translations'
import { TurnstileWidget } from '@/components/security/TurnstileWidget'
import { useSession } from '@/components/auth/SessionProvider'

interface Props {
  lang: string
}

type Status = 'idle' | 'sending' | 'success' | 'error' | 'captcha_failed'

const CATEGORIES = [
  'contact_cat_missing_shop',
  'contact_cat_missing_product',
  'contact_cat_wrong_info',
  'contact_cat_suggestion',
  'contact_cat_other',
] as const

export function ContactForm({ lang }: Props) {
  const tr = t(lang)
  const session = useSession()
  const isPrefilled =
    session.is_authenticated &&
    !!session.user?.display_name &&
    !!session.user?.email

  const [status, setStatus] = useState<Status>('idle')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [form, setForm] = useState(() => ({
    subject: '',
    category: CATEGORIES[0],
    description: '',
    name: isPrefilled ? (session.user?.display_name ?? '') : '',
    email: isPrefilled ? (session.user?.email ?? '') : '',
  }))

  // Sync name/email when session changes (e.g. user logs in/out on this page).
  // Intentional setState-in-effect: mirrors the SessionProvider pattern (see SessionProvider.tsx).
  useEffect(() => {
    if (isPrefilled && session.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(prev => ({ ...prev, name: session.user!.display_name, email: session.user!.email }))
    } else if (!session.is_authenticated) {
      setForm(prev => ({ ...prev, name: '', email: '' }))
    }
  }, [isPrefilled, session.user?.id, session.is_authenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleToken = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  const handleTurnstileError = useCallback(() => {
    setStatus('captcha_failed')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!turnstileToken) {
      setStatus('captcha_failed')
      return
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstile_token: turnstileToken }),
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
    return (
      <p className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
        {tr.contact_success}
      </p>
    )
  }

  const inputClass =
    'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent'
  const labelClass = 'block text-sm font-medium text-text mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-text-muted leading-relaxed">{tr.contact_intro}</p>

      {isPrefilled && session.user && (
        <p className="text-sm text-text-muted leading-relaxed">
          {tr.contact_identity_notice
            .replace('{display_name}', session.user.display_name)
            .replace('{email}', session.user.email)
            .split(session.user.email)
            .flatMap((part, i, arr) =>
              i < arr.length - 1
                ? [part, <bdi key={i} className="font-medium text-text">{session.user!.email}</bdi>]
                : [part]
            )}
        </p>
      )}

      <div>
        <label className={labelClass}>{tr.contact_subject}</label>
        <input
          type="text"
          required
          minLength={3}
          value={form.subject}
          onChange={e => update('subject', e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>{tr.contact_category}</label>
        <select
          value={form.category}
          onChange={e => update('category', e.target.value)}
          className={inputClass}
        >
          {CATEGORIES.map(key => (
            <option key={key} value={key}>
              {tr[key]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{tr.contact_description}</label>
        <textarea
          required
          minLength={10}
          rows={4}
          value={form.description}
          onChange={e => update('description', e.target.value)}
          className={inputClass}
        />
      </div>

      {!isPrefilled && (
        <>
          <div>
            <label className={labelClass}>{tr.contact_name}</label>
            <input
              type="text"
              required
              minLength={2}
              value={form.name}
              onChange={e => update('name', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{tr.contact_email}</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => update('email', e.target.value)}
              className={inputClass}
            />
          </div>
        </>
      )}

      <TurnstileWidget onToken={handleToken} onError={handleTurnstileError} />

      {status === 'captcha_failed' && (
        <p className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {tr.turnstile_failed}
        </p>
      )}

      {status === 'error' && (
        <p className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {tr.contact_error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending' || !turnstileToken}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
      >
        {status === 'sending' ? tr.contact_sending : tr.contact_send}
      </button>
    </form>
  )
}
