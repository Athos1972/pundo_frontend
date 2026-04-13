'use client'

import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/translations'

interface Props {
  lang: string
  email: string
  onConfirmed: () => void
  onClose: () => void
}

export function DeleteAccountModal({ lang, email, onConfirmed, onClose }: Props) {
  const tr = t(lang)
  const [phase, setPhase] = useState<'warning' | 'otp'>('warning')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Trap focus — close on backdrop click
  function handleBackdropClick(e: React.MouseEvent) {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  async function handleSendCode() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/customer/customer/auth/account/request-deletion', {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? tr.error_generic)
      }
      setPhase('otp')
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.error_generic)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/customer/customer/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? tr.auth_otp_invalid)
      }
      onConfirmed()
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.error_generic)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        ref={dialogRef}
        className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
      >
        <h2 id="delete-modal-title" className="text-lg font-bold text-text">
          {tr.account_delete_title}
        </h2>

        {phase === 'warning' ? (
          <>
            <p className="text-sm text-text-muted">{tr.account_delete_warning}</p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-sm text-text hover:bg-surface-alt transition-colors"
              >
                {tr.back}
              </button>
              <button
                onClick={handleSendCode}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? '…' : tr.account_delete_send_code}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleConfirm} className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">{tr.auth_otp_sent(email)}</p>
            <p className="text-xs text-text-muted">{tr.account_delete_enter_code}</p>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">{tr.auth_otp_label}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                required
                autoFocus
                className="border border-border rounded-lg px-3 py-2 text-sm bg-bg text-text focus:outline-none focus:ring-2 focus:ring-red-500 tracking-widest"
              />
            </label>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-sm text-text hover:bg-surface-alt transition-colors"
              >
                {tr.back}
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? '…' : tr.account_delete_confirm_btn}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
