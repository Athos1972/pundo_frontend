'use client'

import { useState } from 'react'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { startGoogleOAuth } from '@/lib/onboarding/onboardingApi'

type OAuthProvider = 'google' | 'facebook' | 'apple'

interface ShopOwnerOAuthButtonProps {
  provider: OAuthProvider
  tr: ShopAdminTranslations
  onUnavailable?: () => void
}

const PROVIDER_ICONS: Record<OAuthProvider, React.ReactNode> = {
  google: (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
    </svg>
  ),
  facebook: <span className="text-[#1877F2] font-bold text-base">f</span>,
  apple: <span className="text-base">🍎</span>,
}

export function ShopOwnerOAuthButton({ provider, tr, onUnavailable }: ShopOwnerOAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setLoading(true)
    try {
      await startGoogleOAuth(provider)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'OAUTH_UNAVAILABLE') {
        setUnavailable(true)
        onUnavailable?.()
      } else {
        setError(tr.onboarding_google_error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || unavailable}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        title={unavailable ? tr.onboarding_google_unavailable : undefined}
      >
        {PROVIDER_ICONS[provider]}
        {loading ? '…' : tr.onboarding_google_btn}
      </button>
      {unavailable && (
        <p className="text-xs text-gray-400 text-center">{tr.onboarding_google_unavailable}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}
