import { redirect } from 'next/navigation'

// Product editing has been merged into /shop-admin/offers (Unified Item & Offer Model).
export default function EditProductPage() {
  redirect('/shop-admin/offers')
}
