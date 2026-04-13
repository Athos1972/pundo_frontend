'use client'

import { useState } from 'react'
import { t } from '@/lib/translations'
import { useSetSession } from '@/components/auth/SessionProvider'
import type { AuthUser } from '@/types/customer'

interface Props {
  user: AuthUser
  lang: string
  onUserChange: (updated: Partial<AuthUser>) => void
}

function PasswordToggle({
  show,
  onToggle,
}: {
  show: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
      tabIndex={-1}
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  )
}

export function SecurityTab({ user, lang, onUserChange }: Props) {
  const tr = t(lang)
  const setSession = useSetSession()

  // Email change state
  const [newEmail, setNewEmail] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailPhase, setEmailPhase] = useState<'form' | 'otp'>('form')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState(false)

  // Password change state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const hasPassword = user.has_password ?? user.provider === 'email'

  // ── Email change ───────────────────────────────────────────────────────────

  async function handleEmailRequest(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setEmailLoading(true)
    try {
      const res = await fetch('/api/customer/customer/auth/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_email: newEmail }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const detail = data?.detail
        const msg = Array.isArray(detail) ? detail[0]?.message : (detail ?? tr.error_generic)
        throw new Error(msg)
      }
      setEmailPhase('otp')
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : tr.error_generic)
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleEmailConfirm(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setEmailLoading(true)
    try {
      const res = await fetch('/api/customer/customer/auth/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_email: newEmail, otp: emailOtp }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? tr.auth_otp_invalid)
      }
      const updated = await res.json()
      onUserChange({ email: updated.email })
      setSession({ user: { ...user, email: updated.email }, is_authenticated: true })
      setEmailSuccess(true)
      setNewEmail('')
      setEmailOtp('')
      setEmailPhase('form')
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : tr.error_generic)
    } finally {
      setEmailLoading(false)
    }
  }

  // ── Password change ────────────────────────────────────────────────────────

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)
    if (newPw !== confirmPw) {
      setPwError(tr.account_password_mismatch)
      return
    }
    if (newPw.length < 8) {
      setPwError(tr.auth_password_min)
      return
    }
    setPwLoading(true)
    try {
      const body: Record<string, string> = { new_password: newPw }
      if (hasPassword) body.current_password = currentPw
      const res = await fetch('/api/customer/customer/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const detail = data?.detail
        const msg = Array.isArray(detail) ? detail[0]?.message : (detail ?? tr.error_generic)
        throw new Error(msg)
      }
      onUserChange({ has_password: true })
      setPwSuccess(true)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (e) {
      setPwError(e instanceof Error ? e.message : tr.error_generic)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Email change */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text">{tr.account_email_change}</h3>
        <p className="text-xs text-text-muted">{tr.auth_email}: <span className="font-medium text-text">{user.email}</span></p>

        {emailSuccess && (
          <p className="text-sm text-green-600">{tr.account_email_updated}</p>
        )}

        {emailPhase === 'form' ? (
          <form onSubmit={handleEmailRequest} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">{tr.account_email_new}</span>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setEmailError(''); setEmailSuccess(false) }}
                required
                className="border border-border rounded-lg px-3 py-2 text-sm bg-bg text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            <div>
              <button
                type="submit"
                disabled={emailLoading || !newEmail}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {emailLoading ? tr.account_saving : tr.account_email_send_code}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleEmailConfirm} className="flex flex-col gap-3">
            <p className="text-sm text-text-muted">{tr.auth_otp_sent(newEmail)}</p>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">{tr.auth_otp_label}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={emailOtp}
                onChange={(e) => { setEmailOtp(e.target.value.replace(/\D/g, '')); setEmailError('') }}
                required
                className="border border-border rounded-lg px-3 py-2 text-sm bg-bg text-text focus:outline-none focus:ring-2 focus:ring-accent tracking-widest"
              />
            </label>
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={emailLoading || emailOtp.length !== 6}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {emailLoading ? tr.account_saving : tr.account_email_confirm}
              </button>
              <button
                type="button"
                onClick={() => { setEmailPhase('form'); setEmailOtp(''); setEmailError('') }}
                className="px-4 py-2 rounded-lg border border-border text-sm text-text hover:bg-surface-alt transition-colors"
              >
                {tr.back}
              </button>
            </div>
          </form>
        )}
      </section>

      <hr className="border-border" />

      {/* Password change */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text">
          {hasPassword ? tr.account_password_change : tr.account_password_set}
        </h3>

        {pwSuccess && (
          <p className="text-sm text-green-600">{tr.account_password_updated}</p>
        )}

        <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
          {hasPassword && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">{tr.account_password_current}</span>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPw}
                  onChange={(e) => { setCurrentPw(e.target.value); setPwError(''); setPwSuccess(false) }}
                  required
                  className="w-full border border-border rounded-lg px-3 py-2 pe-10 text-sm bg-bg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <PasswordToggle show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
              </div>
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">{tr.auth_password_new}</span>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setPwError(''); setPwSuccess(false) }}
                required
                minLength={8}
                className="w-full border border-border rounded-lg px-3 py-2 pe-10 text-sm bg-bg text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <PasswordToggle show={showNew} onToggle={() => setShowNew((v) => !v)} />
            </div>
            <span className="text-xs text-text-muted">{tr.auth_password_min}</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">{tr.account_password_confirm}</span>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => { setConfirmPw(e.target.value); setPwError(''); setPwSuccess(false) }}
                required
                className="w-full border border-border rounded-lg px-3 py-2 pe-10 text-sm bg-bg text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
            </div>
          </label>

          {pwError && <p className="text-xs text-red-500">{pwError}</p>}

          <div>
            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {pwLoading ? tr.account_saving : (hasPassword ? tr.account_password_change : tr.account_password_set)}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
