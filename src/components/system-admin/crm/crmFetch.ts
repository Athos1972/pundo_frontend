'use client'
// ─── CRM Client-Side Fetch Util (F7600) ───────────────────────────────────────
// Encapsulates POST/PATCH/DELETE to /api/admin/crm/... and maps HTTP status codes to Toast messages.
// Clean Boundary: no imports from customer-facing code.

import { showToast } from '@/components/system-admin/Toast'
import type { CrmErrorDetail, CrmErrorExtras } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { tierLabel } from '@/components/system-admin/crm/crmLabels'

export interface CrmFetchResult<T> {
  ok: boolean
  data?: T
  status?: number
  /** Machine-readable `detail` code of a failed 404/409/422/423/429/502 answer (e.g. `channel_exists_same_person`). */
  code?: string
  /** Extra fields next to the code (`channel_id`, `person_id`, `tier`, `current_version`, …). */
  extras?: CrmErrorExtras
}

export interface CrmRequestOptions {
  /**
   * Error codes the caller handles itself (a dialog instead of a toast), e.g. `channel_exists_same_person` or
   * `last_channel`. For these no toast is shown; `code` and `extras` are still returned.
   */
  silent?: readonly string[]
}

/**
 * Backend `detail` codes of 409 and 422 answers → translation key (B8950-016 T18). One table instead of two if-chains;
 * the drift guard `tests/unit/guards/error-code-drift.test.ts` compares it with `docs/error_codes.json` of the backend: a new
 * 409/422 code there without an entry here fails the gate (it would otherwise show the generic message), and an entry
 * the backend no longer raises fails it too. 404/423/429/502 are handled by status (`CRM_STATUS_KEYS`).
 * A 409 with an unknown code falls back to `crm_err_conflict`.
 */
export const CRM_ERROR_KEYS = {
  // lead and outreach
  suppressed: 'crm_err_suppressed',
  illegal_transition: 'crm_err_illegal_transition',
  outreach_not_allowed_state: 'crm_err_outreach_state',
  shop_id_required: 'crm_err_shop_id_required',
  no_email_channel: 'crm_err_no_email',
  outreach_recipient_invalid: 'crm_err_outreach_recipient_invalid',
  outreach_tier_approval_required: 'crm_err_tier_approval_required',
  outreach_approval_not_required: 'crm_err_approval_not_required',
  outreach_approval_reason_required: 'crm_err_approval_reason_required',
  occurred_at_in_future: 'crm_err_future',
  version_conflict: 'crm_err_conflict',
  // organisations
  org_name_required: 'crm_err_org_name_required',
  org_search_too_short: 'crm_err_org_search_too_short',
  org_parent_self: 'crm_err_org_parent_self',
  org_parent_has_parent: 'crm_err_org_parent_has_parent',
  org_parent_has_children: 'crm_err_org_parent_has_children',
  // channels
  last_channel: 'crm_err_last_channel',
  duplicate_channel: 'crm_err_duplicate_channel',
  invalid_channel_kind: 'crm_err_invalid_channel_kind',
  invalid_channel_value: 'crm_err_invalid_channel_value',
  channel_owned_by_org: 'crm_err_channel_owned_by_org',
  channel_owned_by_other_org: 'crm_err_channel_owned_by_other_org',
  channel_owned_by_other_person: 'crm_err_channel_owned_by_other_person',
  channel_exists_same_person: 'crm_err_channel_exists_same_person',
  channel_owner_invalid: 'crm_err_channel_owner_invalid',
  // relations
  relation_active_exists: 'crm_err_relation_active_exists',
  relation_dates_invalid: 'crm_err_relation_dates_invalid',
  relation_role_exists: 'crm_err_relation_role_exists',
  relation_not_in_org: 'crm_err_relation_not_in_org',
  relation_preferred_channel_invalid: 'crm_err_relation_preferred_channel_invalid',
  invalid_person_role: 'crm_err_invalid_person_role',
  // persons
  person_search_too_short: 'crm_err_person_search_too_short',
  person_display_name_derived: 'crm_err_person_display_name_derived',
  person_birth_date_invalid: 'crm_err_person_birth_date_invalid',
  person_salutation_invalid: 'crm_err_person_salutation_invalid',
  person_channel_exists: 'crm_err_person_channel_exists',
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

/** `{detail: "code"}` or `{detail: {detail: "code", …extras}}` → code and extras; a validation list or a text has no code. */
function readCode(detail: CrmErrorDetail | undefined): { code?: string; extras?: CrmErrorExtras } {
  if (typeof detail === 'string') return { code: detail }
  if (detail && typeof detail === 'object' && typeof detail.detail === 'string') {
    const { detail: code, ...extras } = detail
    return { code, extras }
  }
  return {}
}

async function readError(res: Response): Promise<{ code?: string; extras?: CrmErrorExtras }> {
  try {
    const json = await res.json() as { detail?: CrmErrorDetail }
    return readCode(json.detail)
  } catch {
    return {}
  }
}

/**
 * Replace `{name}` with the extra of that name. `{tier}` (send gate) is shown with its translated word ("Red" /
 * "Κόκκινη"); an unknown tier value stays raw, so a new backend value remains visible.
 */
function fill(text: string, extras: CrmErrorExtras | undefined, tr: SysAdminTranslations): string {
  if (!extras) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = (extras as Record<string, unknown>)[name]
    if (name === 'tier' && typeof value === 'string') return tierLabel(tr, value)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : match
  })
}

/** Text for a known code; `null` if the code is unknown or missing (the caller falls back by status). */
function codeMessage(code: string | undefined, extras: CrmErrorExtras | undefined, tr: SysAdminTranslations): string | null {
  const key = code ? (CRM_ERROR_KEYS as Record<string, keyof SysAdminTranslations>)[code] : undefined
  return key ? fill(tr[key] as string, extras, tr) : null
}

/**
 * Generic CRM request to /api/admin/crm/<path>.
 * Handles all standard CRM error codes:
 *   401 → redirect to /admin/login
 *   403/404/409/422/423/429/502 → Toast (409/422: text of the known `detail` code, else the status text / generic)
 *   200/201 → ok with data
 * Failed answers return `status`, `code` and `extras`, so the caller can react to a specific code (`options.silent`
 * suppresses the toast for codes the caller shows a dialog for).
 */
export async function crmRequest<T>(
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body: unknown,
  tr: SysAdminTranslations,
  options: CrmRequestOptions = {},
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

  const statusKey = (CRM_STATUS_KEYS as Record<number, keyof SysAdminTranslations>)[res.status]
  if (statusKey || res.status === 422) {
    const { code, extras } = await readError(res)
    if (!(code && options.silent?.includes(code))) {
      // 409 and 422 show the text of a known code; everything else (and an unknown code) the text of the status
      const byCode = res.status === 409 || res.status === 422 ? codeMessage(code, extras, tr) : null
      showToast(byCode ?? (statusKey ? (tr[statusKey] as string) : tr.crm_err_generic), 'error')
    }
    return { ok: false, status: res.status, code, extras }
  }

  if (!res.ok) {
    const { code, extras } = await readError(res)
    showToast(tr.crm_err_generic, 'error')
    return { ok: false, status: res.status, code, extras }
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
  options?: CrmRequestOptions,
): Promise<CrmFetchResult<T>> {
  return crmRequest<T>('POST', path, body, tr, options)
}

/**
 * PATCH to /api/admin/crm/<path>.
 */
export async function crmPatch<T>(
  path: string,
  body: unknown,
  tr: SysAdminTranslations,
  options?: CrmRequestOptions,
): Promise<CrmFetchResult<T>> {
  return crmRequest<T>('PATCH', path, body, tr, options)
}

/**
 * DELETE to /api/admin/crm/<path>.
 */
export async function crmDelete<T>(
  path: string,
  tr: SysAdminTranslations,
  options?: CrmRequestOptions,
): Promise<CrmFetchResult<T>> {
  return crmRequest<T>('DELETE', path, undefined, tr, options)
}

/**
 * PUT to /api/admin/crm/<path>.
 */
export async function crmPut<T>(
  path: string,
  body: unknown,
  tr: SysAdminTranslations,
  options?: CrmRequestOptions,
): Promise<CrmFetchResult<T>> {
  return crmRequest<T>('PUT', path, body, tr, options)
}

/** Failed search (no Toast: one per keystroke would be noise). `status` 0 = network error; `code` = 422 `detail` code if any. */
export class CrmSearchError extends Error {
  constructor(public status: number, public code?: string) {
    super(`crm_search_${status}${code ? `_${code}` : ''}`)
  }
}

/**
 * GET /api/admin/<path> for the type-ahead searches. Errors are thrown as `CrmSearchError` and shown by the Combobox;
 * 401 redirects to the login like `crmRequest`.
 */
export async function crmSearch<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/admin/${path}`)
  } catch {
    throw new CrmSearchError(0)
  }
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/admin/login'
    }
    throw new CrmSearchError(401)
  }
  if (!res.ok) {
    let code: string | undefined
    if (res.status === 422) {
      try {
        const json = await res.json() as { detail?: unknown }
        if (typeof json.detail === 'string') code = json.detail
      } catch { /* not JSON */ }
    }
    throw new CrmSearchError(res.status, code)
  }
  try {
    return await res.json() as T
  } catch {
    throw new CrmSearchError(res.status)
  }
}
