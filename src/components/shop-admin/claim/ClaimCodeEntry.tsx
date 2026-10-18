'use client'
// F5970 — 6-digit code entry (shop-email code or the callback code the admin tells by phone).
// Shows attempts left, a live validity countdown, the daily resend budget and the time until the next resend.
// Only imports from src/components/ui/ and shop-admin code (Clean Boundary).

import { useEffect, useState } from 'react'
import type { ClaimStatusCode } from '@/types/shop-admin'
import type { ShopAdminClaimTranslations } from '@/lib/i18n/shop-admin-claim'

/** "mm:ss" below one hour, else "h:mm". */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}` : `${two(m)}:${two(s)}`
}

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

interface Props {
  tr: ShopAdminClaimTranslations
  /** `null` = nothing requested yet (shop-email method before the first send). */
  code: ClaimStatusCode | null
  purpose: 'shop_email' | 'callback'
  busy: boolean
  error: string | null
  onSend: () => void
  onVerify: (code: string) => void
}

export function ClaimCodeEntry({ tr, code, purpose, busy, error, onSend, onVerify }: Props) {
  const now = useNow()
  const [value, setValue] = useState('')

  const expiresAt = code?.expires_at ? new Date(code.expires_at).getTime() : null
  const active = expiresAt !== null && expiresAt > now
  const expired = expiresAt !== null && expiresAt <= now
  const attemptsLeft = code?.attempts_left ?? 5
  const locked = code !== null && attemptsLeft <= 0
  const resendsLeft = code?.resends_left_24h ?? 3
  const nextResendAt = code?.next_resend_at ? new Date(code.next_resend_at).getTime() : null
  const canSend = purpose === 'shop_email' && resendsLeft > 0
  const canEnter = active && !locked

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (value.length === 6 && canEnter) onVerify(value)
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4" aria-label={tr.claim_code_title} data-testid="claim-code-entry">
      <h3 className="text-sm font-semibold text-gray-900">{tr.claim_code_title}</h3>

      {purpose === 'callback' ? (
        <p className="text-sm text-gray-600">{tr.claim_code_callback_hint}</p>
      ) : (
        active && <p className="text-sm text-gray-600">{tr.claim_code_sent_hint}</p>
      )}

      {canEnter && (
        <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
          <label htmlFor="claim-code" className="text-sm font-medium text-gray-700">{tr.claim_code_label}</label>
          <input
            id="claim-code"
            name="code"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            dir="ltr"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-xl tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-accent"
            aria-describedby="claim-code-meta"
          />
          <p id="claim-code-meta" className="flex flex-wrap gap-x-3 text-xs text-gray-500">
            <span>{tr.claim_code_attempts.replace('{n}', String(attemptsLeft))}</span>
            <span data-testid="claim-code-countdown">{tr.claim_code_expires_in.replace('{time}', formatRemaining((expiresAt as number) - now))}</span>
          </p>
          <button
            type="submit"
            disabled={busy || value.length !== 6}
            className="rounded-xl bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? '…' : tr.claim_code_verify}
          </button>
        </form>
      )}

      {locked && <p className="text-sm text-red-600" role="alert">{tr.claim_code_locked}</p>}
      {expired && !locked && purpose === 'shop_email' && <p className="text-sm text-amber-700">{tr.claim_code_expired_hint}</p>}

      {purpose === 'shop_email' && (
        <div className="flex flex-col gap-1.5">
          {canSend ? (
            <button
              type="button"
              onClick={onSend}
              disabled={busy}
              className={`w-fit rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 ${
                active && !locked ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-accent text-white hover:bg-accent-dark'
              }`}
            >
              {active || expired || locked ? tr.claim_code_resend : tr.claim_code_send}
            </button>
          ) : (
            <p className="text-sm text-gray-600">{tr.claim_code_none_left}</p>
          )}
          <p className="text-xs text-gray-500">
            {tr.claim_code_resends_left.replace('{n}', String(resendsLeft))}
            {!canSend && nextResendAt !== null && nextResendAt > now && (
              <> · {tr.claim_code_next_resend.replace('{time}', formatRemaining(nextResendAt - now))}</>
            )}
          </p>
        </div>
      )}

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  )
}
