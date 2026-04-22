'use client'

import { useState } from 'react'
import * as RadixPopover from '@radix-ui/react-popover'
import { getShopReviews } from '@/lib/api'
import type { ShopReviewPreview } from '@/types/api'
import { t } from '@/lib/translations'

// Module-level cache to avoid re-fetching on repeated hover
const reviewsCache = new Map<number, ShopReviewPreview[]>()

function StarRow({ stars }: { stars: number }) {
  return (
    <span className="text-amber-500 text-xs" aria-label={`${stars} stars`}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
    </span>
  )
}

interface ReviewsPopoverProps {
  shopId: number
  shopSlug: string
  lang: string
  trigger: React.ReactNode
}

export function ReviewsPopover({ shopId, shopSlug, lang, trigger }: ReviewsPopoverProps) {
  const tr = t(lang)
  const [reviews, setReviews] = useState<ShopReviewPreview[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function handleOpenChange(open: boolean) {
    if (!open) return
    if (reviewsCache.has(shopId)) {
      setReviews(reviewsCache.get(shopId)!)
      return
    }
    setLoading(true)
    setError(false)
    const data = await getShopReviews(shopId, lang, 3)
    if (data.length === 0 && !reviewsCache.has(shopId)) {
      // getShopReviews returns [] on error too; treat as either empty or error
      setReviews([])
    } else {
      reviewsCache.set(shopId, data)
      setReviews(data)
    }
    setLoading(false)
  }

  return (
    <RadixPopover.Root onOpenChange={handleOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side="bottom"
          sideOffset={6}
          align="start"
          className="z-50 w-72 max-w-[90vw] rounded-xl border border-border bg-surface p-3 shadow-lg animate-in fade-in-0 zoom-in-95"
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              {tr.reviews_see_all}
            </p>
            <RadixPopover.Close
              className="text-text-muted hover:text-text rounded-md p-0.5 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </RadixPopover.Close>
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && error && (
            <p className="text-xs text-text-muted py-2">{tr.reviews_popover_error}</p>
          )}

          {!loading && !error && reviews !== null && reviews.length === 0 && (
            <p className="text-xs text-text-muted py-2">{tr.reviews_popover_empty}</p>
          )}

          {!loading && !error && reviews !== null && reviews.length > 0 && (
            <div className="divide-y divide-border">
              {reviews.map(r => (
                <div key={r.id} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-text truncate">{r.user_display_name}</span>
                    <StarRow stars={r.stars} />
                  </div>
                  {r.comment && (
                    <p className="text-xs text-text-muted line-clamp-2">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <RadixPopover.Arrow className="fill-border" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
