// ─── CRM permission helper (F7600) ────────────────────────────────────────────────────────────────────────────────────
// Pure module (Server and Client Components). Mirrors the backend rule: superadmins and editors with `permissions = null`
// (grandfathering) have every CRM permission; otherwise the permission must be listed. The backend answers 403 anyway;
// this only decides which controls the UI offers (AC 29).

import type { SysAdminUser } from '@/types/system-admin'

export type CrmPermission =
  | 'crm:contacts:write'      // master data, channels, relations, manual documentation, review
  | 'crm:lifecycle:write'     // lead actions, legal tier of the organisation and of a channel
  | 'crm:suppress_override'   // suppress / reject as private
  | 'crm:send'                // outreach preview and send
  | 'crm:send_approve'        // approve a send despite the legal tier (send gate)

export function crmCan(me: Pick<SysAdminUser, 'role' | 'permissions'>, permission: CrmPermission): boolean {
  return me.role === 'superadmin' || me.permissions == null || me.permissions.includes(permission)
}
