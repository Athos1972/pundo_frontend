import { redirect } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getMe } from '@/lib/shop-admin-api'
import { AdminShell } from '@/components/shop-admin/AdminShell'

export default async function ShopAdminLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let ownerName = ''
  // redirect() works by throwing; calling it inside the try block would let the catch
  // below swallow it and render the full portal for non-approved owners.
  let redirectTo: string | null = null
  try {
    const me = await getMe(lang)
    // Approved owners get the full shell; pre_signup/pending/rejected stay on their info page
    if (me.status === 'pre_signup') redirectTo = '/shop-admin/onboarding'
    else if (me.status === 'pending') redirectTo = '/shop-admin/pending-approval'
    else if (me.status === 'rejected') redirectTo = '/shop-admin/login'
    else ownerName = me.name
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') redirectTo = '/shop-admin/login'
    // Backend unreachable: allow through with empty name so page can render
  }
  if (redirectTo) redirect(redirectTo)

  return <AdminShell tr={tr} ownerName={ownerName}>{children}</AdminShell>
}
