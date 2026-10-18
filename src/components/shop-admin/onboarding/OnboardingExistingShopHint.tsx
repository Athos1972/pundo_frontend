'use client'
// F5970 (AR5, AC 34/35) — "This shop already exists on Pundo": shown inside the onboarding wizard when the website
// or the name + location match existing shops. "This is my shop" leaves the wizard for the claim page (the draft
// stays in localStorage); "No, a different shop" / "None of these" continues unchanged.
// Only imports from src/components/ui/ and shop-admin code (Clean Boundary).

import type { ClaimCandidate } from '@/types/shop-admin'
import type { ShopAdminClaimTranslations } from '@/lib/i18n/shop-admin-claim'

interface Props {
  tr: ShopAdminClaimTranslations
  candidates: ClaimCandidate[]
  onClaim: (slug: string) => void
  onOther: () => void
}

export function OnboardingExistingShopHint({ tr, candidates, onClaim, onOther }: Props) {
  const many = candidates.length > 1
  return (
    <section className="flex flex-col gap-4" data-testid="onboarding-existing-shop-hint" aria-labelledby="existing-shop-title">
      <div>
        <h2 id="existing-shop-title" className="text-xl font-bold text-gray-900">
          {many ? tr.claim_hint_title_many : tr.claim_hint_title_one}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{tr.claim_hint_text}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {candidates.map((c) => (
          <li key={c.slug} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-gray-900 break-words">{c.name}</p>
              {c.city && <p className="text-gray-600">{c.city}</p>}
              {c.website_host && <p className="text-gray-500 break-all" dir="ltr">{c.website_host}</p>}
              {c.is_claimed && <p className="mt-1 text-xs text-amber-700">{tr.claim_hint_claimed}</p>}
            </div>
            <button
              type="button"
              onClick={() => onClaim(c.slug)}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              {tr.claim_hint_mine}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onOther}
        className="rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {many ? tr.claim_hint_other_many : tr.claim_hint_other_one}
      </button>
    </section>
  )
}
