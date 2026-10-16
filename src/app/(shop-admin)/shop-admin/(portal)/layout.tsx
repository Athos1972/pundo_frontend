import { redirect } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getMe, getShopReviewSummary } from '@/lib/shop-admin-api'
import { AdminShell } from '@/components/shop-admin/AdminShell'

/** Unseen reviews for the nav badge; any failure just means "no badge" (never breaks the page). */
async function loadNewReviewCount(lang: string): Promise<number> {
  try {
    return (await getShopReviewSummary(lang))?.new_count ?? 0
  } catch {
    return 0
  }
}

export default async function ShopAdminLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let ownerName = ''
  let reviewsNewCount = 0
  // redirect() works by throwing; calling it inside the try block would let the catch
  // below swallow it and render the full portal for non-approved owners.
  let redirectTo: string | null = null
  try {
    const me = await getMe(lang)
    // Approved owners get the full shell; pre_signup/pending/rejected stay on their info page
    if (me.status === 'pre_signup') redirectTo = '/shop-admin/onboarding'
    else if (me.status === 'pending') redirectTo = '/shop-admin/pending-approval'
    else if (me.status === 'rejected') redirectTo = '/shop-admin/login'
    else {
      ownerName = me.name
      reviewsNewCount = await loadNewReviewCount(lang)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') redirectTo = '/shop-admin/login'
    // Backend unreachable: allow through with empty name so page can render
  }
  if (redirectTo) redirect(redirectTo)

  return <AdminShell tr={tr} ownerName={ownerName} reviewsNewCount={reviewsNewCount}>{children}</AdminShell>
}
