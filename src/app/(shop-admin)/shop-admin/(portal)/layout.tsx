import { redirect } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getMe } from '@/lib/shop-admin-api'
import { AdminShell } from '@/components/shop-admin/AdminShell'

export default async function ShopAdminLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let ownerName = ''
  try {
    const me = await getMe(lang)
    // Approved owners get the full shell; pending/rejected stay on their info page
    if (me.status === 'pending') redirect('/shop-admin/pending-approval')
    if (me.status === 'rejected') redirect('/shop-admin/login')
    ownerName = me.name
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') redirect('/shop-admin/login')
    // Backend unreachable: allow through with empty name so page can render
  }

  return <AdminShell tr={tr} ownerName={ownerName}>{children}</AdminShell>
}
