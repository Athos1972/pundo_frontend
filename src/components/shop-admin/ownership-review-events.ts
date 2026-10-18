// Window event fired when the number of offers waiting for the new owner's confirmation changed (F5970).
// UnverifiedOffersBanner listens to it: the portal layout does not re-render on client navigation (same pattern as
// the reviews badge, F5930).
export const OWNERSHIP_REVIEW_CHANGED_EVENT = 'shop-admin:ownership-review-changed'

export interface OwnershipReviewChangedDetail {
  /** Offers still waiting for confirmation. */
  remaining: number
}

export function announceOwnershipReviewCount(remaining: number): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OwnershipReviewChangedDetail>(OWNERSHIP_REVIEW_CHANGED_EVENT, { detail: { remaining } }))
}

// Fired by the banner link: opens the "To review" tab of an already mounted offer list (the link target
// /shop-admin/offers?review=1 is the same route, so the list is not re-mounted and `initialTab` alone is not enough).
export const OPEN_REVIEW_TAB_EVENT = 'shop-admin:open-review-tab'

export function requestOpenReviewTab(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_REVIEW_TAB_EVENT))
}
