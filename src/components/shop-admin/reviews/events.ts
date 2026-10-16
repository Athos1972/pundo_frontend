// Window event fired after the review list marked the reviews as seen (F5930).
// AdminNav listens to it and clears the "new" badge: the portal layout does not re-render on client navigation.
export const SHOP_REVIEWS_SEEN_EVENT = 'shop-admin:reviews-seen'
