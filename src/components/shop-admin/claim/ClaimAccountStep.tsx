'use client'
// F5970 — account of the applicant (name, email, password). The captcha is NOT here: Turnstile tokens are
// single-use and short-lived, so the widget sits on the last step right next to the submit button.
// Only imports from src/components/ui/ and shop-admin code (Clean Boundary).

import { useState } from 'react'
import { FormField } from '@/components/shop-admin/FormField'
import type { ShopAdminClaimTranslations } from '@/lib/i18n/shop-admin-claim'

export interface ClaimAccountValues {
  name: string
  email: string
  password: string
}

interface Props {
  tr: ShopAdminClaimTranslations
  initial: Pick<ClaimAccountValues, 'name' | 'email'>
  error?: string | null
  onNext: (values: ClaimAccountValues) => void
  onBack: () => void
}

const MIN_PASSWORD = 8

export function ClaimAccountStep({ tr, initial, error, onNext, onBack }: Props) {
  const [name, setName] = useState(initial.name)
  const [email, setEmail] = useState(initial.email)
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const passwordOk = password.length >= MIN_PASSWORD
  const nameOk = name.trim().length > 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!nameOk || !emailOk || !passwordOk) return
    onNext({ name: name.trim(), email: email.trim(), password })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" data-testid="claim-account-step">
      <h2 className="text-lg font-bold text-gray-900">{tr.claim_account_title}</h2>
      <FormField
        label={tr.claim_account_name}
        name="name"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={touched && !nameOk ? tr.claim_account_field_required : undefined}
      />
      <FormField
        label={tr.claim_account_email}
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={touched && !emailOk ? tr.claim_err_account_required : undefined}
      />
      <FormField
        label={tr.claim_account_password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={touched && !passwordOk ? tr.claim_err_password : undefined}
      />
      <p className="text-xs text-gray-500">{tr.claim_account_password_hint}</p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {tr.claim_back}
        </button>
        <button type="submit" className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-dark">
          {tr.claim_continue}
        </button>
      </div>
    </form>
  )
}
