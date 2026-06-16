'use client'
// ─── CRM Client-Side Fetch Util (F7600) ───────────────────────────────────────
// Encapsulates POST to /api/admin/crm/... and maps HTTP status codes to Toast messages.
// Clean Boundary: no imports from customer-facing code.

import { showToast } from '@/components/system-admin/Toast'
import type { CrmErrorDetail } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

export interface CrmFetchResult<T> {
  ok: boolean
  data?: T
  status?: number
}

/**
 * Parse a 422 response detail and return a user-friendly toast message.
 * Handles both string detail ("illegal_transition") and object detail ({detail: "suppressed", ...}).
 */
function parse422Message(detail: CrmErrorDetail, tr: SysAdminTranslations): string {
  if (typeof detail === 'string') {
    if (detail === 'suppressed') return tr.crm_err_suppressed
    if (detail === 'illegal_transition') return tr.crm_err_illegal_transition
    if (detail === 'shop_id_required') return tr.crm_err_shop_id_required
    if (detail === 'no_email_channel') return tr.crm_err_no_email
    return tr.crm_err_generic
  }
  // Object detail
  const d = detail.detail
  if (d === 'suppressed') return tr.crm_err_suppressed
  if (d === 'illegal_transition') return tr.crm_err_illegal_transition
  if (d === 'shop_id_required') return tr.crm_err_shop_id_required
  if (d === 'no_email_channel') return tr.crm_err_no_email
  return tr.crm_err_generic
}

/**
 * POST to /api/admin/crm/<path> and handle all standard CRM error codes.
 * On 401: redirects to /admin/login (via window.location).
 * On 403/409/422/502: shows appropriate Toast.
 * Returns {ok, data, status}.
 */
export async function crmPost<T>(
  path: string,
  body: unknown,
  tr: SysAdminTranslations,
): Promise<CrmFetchResult<T>> {
  let res: Response
  try {
    res = await fetch(`/api/admin/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    showToast(tr.crm_err_generic, 'error')
    return { ok: false }
  }

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login'
    }
    return { ok: false, status: 401 }
  }

  if (res.status === 403) {
    showToast(tr.crm_err_forbidden, 'error')
    return { ok: false, status: 403 }
  }

  if (res.status === 409) {
    showToast(tr.crm_err_conflict, 'error')
    return { ok: false, status: 409 }
  }

  if (res.status === 422) {
    let detail: CrmErrorDetail = tr.crm_err_generic
    try {
      const json = await res.json() as { detail?: CrmErrorDetail }
      if (json.detail !== undefined) detail = json.detail
    } catch { /* ignore */ }
    showToast(parse422Message(detail, tr), 'error')
    return { ok: false, status: 422 }
  }

  if (res.status === 502) {
    showToast(tr.crm_err_send_failed, 'error')
    return { ok: false, status: 502 }
  }

  if (!res.ok) {
    showToast(tr.crm_err_generic, 'error')
    return { ok: false, status: res.status }
  }

  let data: T | undefined
  try {
    data = await res.json() as T
  } catch { /* 204 or non-JSON */ }

  return { ok: true, data, status: res.status }
}
