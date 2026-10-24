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
 * Backend 422 `detail` codes → translation key (B8950-016 T18). One table instead of two if-chains; the drift guard
 * `tests/unit/guards/error-code-drift.test.ts` compares it with `docs/error_codes.json` of the backend: a new 422 code there
 * without an entry here fails the gate (it would otherwise show the generic message).
 */
export const CRM_ERROR_KEYS = {
  suppressed: 'crm_err_suppressed',
  illegal_transition: 'crm_err_illegal_transition',
  outreach_not_allowed_state: 'crm_err_outreach_state',
  shop_id_required: 'crm_err_shop_id_required',
  no_email_channel: 'crm_err_no_email',
  last_channel: 'crm_err_last_channel',
  duplicate_channel: 'crm_err_duplicate_channel',
  org_name_required: 'crm_err_org_name_required',
  occurred_at_in_future: 'crm_err_future',
  invalid_identifier_kind: 'crm_err_generic',
  invalid_person_role: 'crm_err_generic',
  invalid_role_dates: 'crm_err_generic',
  person_identifier_required: 'crm_err_person_identifier_required',
  person_search_too_short: 'crm_err_person_search_too_short',
} as const satisfies Record<string, keyof SysAdminTranslations>

/** Statuses handled by status alone (the `detail` code does not change the message). */
export const CRM_STATUS_KEYS = {
  403: 'crm_err_forbidden',
  404: 'crm_err_not_found',
  409: 'crm_err_conflict',
  423: 'crm_err_paused',
  429: 'crm_err_cap',
  502: 'crm_err_send_failed',
} as const satisfies Record<number, keyof SysAdminTranslations>

/**
 * Parse a 422 response detail and return a user-friendly toast message.
 * Handles both string detail ("illegal_transition") and object detail ({detail: "suppressed", ...}).
 */
function parse422Message(detail: CrmErrorDetail, tr: SysAdminTranslations): string {
  const code = typeof detail === 'string' ? detail : detail.detail
  const key = (CRM_ERROR_KEYS as Record<string, keyof SysAdminTranslations>)[code]
  return key ? (tr[key] as string) : tr.crm_err_generic
}

/**
 * Generic CRM request to /api/admin/crm/<path>.
 * Handles all standard CRM error codes:
 *   401 → redirect to /admin/login
 *   403/409/422/423/429/502 → Toast
 *   404 → crm_err_not_found Toast
 *   200/201 → ok with data
 */
export async function crmRequest<T>(
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
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
      // Utility ausserhalb von React (kein useRouter); Hard-Navigation verwirft
      // zudem den Client-State der abgelaufenen Session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/admin/login'
    }
    return { ok: false, status: 401 }
  }

  if (res.status === 403) {
    showToast(tr[CRM_STATUS_KEYS[403]], 'error')
    return { ok: false, status: 403 }
  }

  if (res.status === 404) {
    showToast(tr[CRM_STATUS_KEYS[404]], 'error')
    return { ok: false, status: 404 }
  }

  if (res.status === 409) {
    showToast(tr[CRM_STATUS_KEYS[409]], 'error')
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

  if (res.status === 423) {
    showToast(tr[CRM_STATUS_KEYS[423]], 'error')
    return { ok: false, status: 423 }
  }

  if (res.status === 429) {
    showToast(tr[CRM_STATUS_KEYS[429]], 'error')
    return { ok: false, status: 429 }
  }

  if (res.status === 502) {
    showToast(tr[CRM_STATUS_KEYS[502]], 'error')
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

/**
 * PUT to /api/admin/crm/<path>.
 */
export async function crmPut<T>(
  path: string,
  body: unknown,
  tr: SysAdminTranslations,
): Promise<CrmFetchResult<T>> {
  return crmRequest<T>('PUT', path, body, tr)
}
