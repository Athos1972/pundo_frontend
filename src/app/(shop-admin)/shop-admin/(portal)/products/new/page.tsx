import { redirect } from 'next/navigation'

// Redirects to the new unified offer creation flow.
export default function NewProductPage() {
  redirect('/shop-admin/offers/new')
}
