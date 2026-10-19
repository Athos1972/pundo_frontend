import { redirect } from 'next/navigation'
import { getAdminMe } from '@/lib/system-admin-api'
import type { SysAdminUser } from '@/types/system-admin'

/**
 * Page-level admin check, stricter than the portal layout (F8960).
 * The layout lets requests through when the backend is unreachable; pages that render static
 * content (help/SOPs) must not. Any failure or malformed answer redirects to the login (fail-closed).
 */
export async function requireAdminSession(): Promise<SysAdminUser> {
  let me: SysAdminUser | null = null
  try {
    me = await getAdminMe()
  } catch {
    me = null
  }
  if (!me || typeof me.email !== 'string' || !me.email) redirect('/admin/login')
  return me
}
