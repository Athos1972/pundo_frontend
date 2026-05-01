'use client'

import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface OnboardingDraftBannerProps {
  tr: ShopAdminTranslations
  ageMs: number
  onResume: () => void
  onDiscard: () => void
}

function formatAge(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 1) return '< 1h'
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function OnboardingDraftBanner({ tr, ageMs, onResume, onDiscard }: OnboardingDraftBannerProps) {
  return (
    <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-800">
        {tr.onboarding_draft_title}{' '}
        <span className="text-gray-500 font-normal">({formatAge(ageMs)})</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onResume}
          className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark transition-colors"
        >
          {tr.onboarding_draft_resume}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="flex-1 py-2 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {tr.onboarding_draft_new}
        </button>
      </div>
    </div>
  )
}
