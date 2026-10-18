'use client'
// F5970 (AC 25) — banner for the new owner after an owner change: "{n} offers wait for your confirmation".
// Disappears at 0; follows the count when the offer list confirms / archives (window event), because the portal
// layout is not re-rendered on client navigation.
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { OWNERSHIP_REVIEW_CHANGED_EVENT, requestOpenReviewTab, type OwnershipReviewChangedDetail } from './ownership-review-events'

interface Props {
  count: number
  tr: ShopAdminTranslations
}

export function UnverifiedOffersBanner({ count, tr }: Props) {
  const [n, setN] = useState(count)

  // the server value wins again after a real reload / re-render of the layout
  const [seenServerCount, setSeenServerCount] = useState(count)
  if (seenServerCount !== count) {
    setSeenServerCount(count)
    setN(count)
  }

  useEffect(() => {
    const onChange = (e: Event) => setN((e as CustomEvent<OwnershipReviewChangedDetail>).detail.remaining)
    window.addEventListener(OWNERSHIP_REVIEW_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(OWNERSHIP_REVIEW_CHANGED_EVENT, onChange)
  }, [])

  if (n <= 0) return null

  return (
    <div
      className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
      role="status"
      data-testid="unverified-offers-banner"
    >
      <p>{tr.offer_review_banner.replace('{n}', String(n))}</p>
      <Link
        href="/shop-admin/offers?review=1"
        onClick={requestOpenReviewTab}
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-center font-semibold text-white hover:bg-amber-700"
      >
        {tr.offer_review_banner_link}
      </Link>
    </div>
  )
}
