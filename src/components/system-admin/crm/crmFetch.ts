'use client'
// ─── CRM Client-Side Fetch Util (F7600) ───────────────────────────────────────
// Encapsulates POST/PATCH/DELETE to /api/admin/crm/... and maps HTTP status codes to Toast messages.
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
    if (detail === 'last_channel') return tr.crm_err_last_channel
    if (detail === 'duplicate_channel') return tr.crm_err_duplicate_channel
    return tr.crm_err_generic
  }
  // Object detail
  const d = detail.detail
  if (d === 'suppressed') return tr.crm_err_suppressed
  if (d === 'illegal_transition') return tr.crm_err_illegal_transition
  if (d === 'shop_id_required') return tr.crm_err_shop_id_required
  if (d === 'no_email_channel') return tr.crm_err_no_email
  if (d === 'last_channel') return tr.crm_err_last_channel
  if (d === 'duplicate_channel') return tr.crm_err_duplicate_channel
  return tr.crm_err_generic
}

/**
 * Generic CRM request to /api/admin/crm/<path>.
 * Handles all standard CRM error codes:
 *   401 → redirect to /admin/login
 *   403/409/422/502 → Toast
 *   404 → crm_err_not_found Toast
 *   200/201 → ok with data
 */
export async function crmRequest<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  tr: SysAdminTranslations,
): Promise<CrmFetchResult<T>> {
  let res: Response
  try {
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (body !== undefined && method !== 'DELETE') {
      init.body = JSON.stringify(body)
    }
    res = await fetch(`/api/admin/${path}`, init)
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

  if (res.status === 404) {
    showToast(tr.crm_err_not_found, 'error')
    return { ok: false, status: 404 }
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

/**
 * POST to /api/admin/crm/<path>.
 * Kept for backwards-compatibility — delegates to crmRequest('POST', ...).
 */
export async function crmPost<T>(
  path: string,
  body: unknown,
  tr: SysAdminTranslations,
): Promise<CrmFetchResult<T>> {
  return crmRequest<T>('POST', path, body, tr)
}

/**
 * PATCH to /api/admin/crm/<path>.
 */
export async function crmPatch<T>(
  path: string,
  body: unknown,
  tr: SysAdminTranslations,
): Promise<CrmFetchResult<T>> {
  return crmRequest<T>('PATCH', path, body, tr)
}

/**
 * DELETE to /api/admin/crm/<path>.
 */
export async function crmDelete<T>(
  path: string,
  tr: SysAdminTranslations,
): Promise<CrmFetchResult<T>> {
  return crmRequest<T>('DELETE', path, undefined, tr)
}
