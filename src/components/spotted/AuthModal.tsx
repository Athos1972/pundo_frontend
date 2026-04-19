'use client'

import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import type { Translations } from '@/lib/translations'

interface Props {
  lang: string
  tr: Translations
  onSuccess: () => void
  onClose: () => void
}

export function AuthModal({ lang, tr, onSuccess, onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr.spotted_login_required}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl p-6 pb-safe">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text">{tr.spotted_login_required}</h2>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <LoginForm lang={lang} onSuccess={onSuccess} />
        <p className="text-center text-sm text-text-muted mt-4">
          {tr.auth_no_account}{' '}
          <Link href="/auth/signup" className="text-accent font-medium hover:underline" onClick={onClose}>
            {tr.auth_signup}
          </Link>
        </p>
      </div>
    </div>
  )
}
