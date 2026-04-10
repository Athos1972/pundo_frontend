import { redirect } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getAdminMe } from '@/lib/system-admin-api'
import { SysAdminShell } from '@/components/system-admin/AdminShell'

export default async function SystemAdminPortalLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  let adminEmail = ''
  try {
    const me = await getAdminMe()
    adminEmail = me.email
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') redirect('/admin/login')
    // Backend unreachable: allow through so the page can render its own error state
  }

  return <SysAdminShell tr={tr} adminEmail={adminEmail}>{children}</SysAdminShell>
}
