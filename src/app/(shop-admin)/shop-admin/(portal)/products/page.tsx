import { redirect } from 'next/navigation'

// Products management has been merged into /shop-admin/offers (Unified Item & Offer Model).
// This redirect ensures existing bookmarks and links still work.
export default function ProductsPage() {
  redirect('/shop-admin/offers')
}
