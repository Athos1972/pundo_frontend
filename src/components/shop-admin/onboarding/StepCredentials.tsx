'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FormField } from '@/components/shop-admin/FormField'
import { ShopOwnerOAuthButton } from './ShopOwnerOAuthButton'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface StepCredentialsProps {
  tr: ShopAdminTranslations
  emailTakenError: boolean
  submitError: string | null
  isPending: boolean
  onSubmit: (email: string, password: string) => void
  onBack: () => void
}

export function StepCredentials({ tr, emailTakenError, submitError, isPending, onSubmit, onBack }: StepCredentialsProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    onSubmit(email, password)
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-gray-900">{tr.onboarding_step6_title}</h2>

      <ShopOwnerOAuthButton provider="google" tr={tr} />

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">oder</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          label={tr.onboarding_email_label}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={emailTakenError ? tr.onboarding_error_email_taken : undefined}
        />
        <FormField
          label={tr.onboarding_password_label}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700" role="alert">
            {submitError}
          </div>
        )}

        {emailTakenError && (
          <p className="text-sm text-center text-gray-500">
            <Link href="/shop-admin/login" className="text-accent hover:underline font-medium">
              {tr.onboarding_login_link}
            </Link>
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tr.onboarding_back}
          </button>
          <button
            type="submit"
            disabled={isPending || !email || !password}
            className="flex-1 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? '…' : tr.onboarding_submit}
          </button>
        </div>
      </form>
    </div>
  )
}
