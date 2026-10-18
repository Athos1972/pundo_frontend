// F5970 — browser-side calls of the claim admin UI through the same-origin proxy /api/admin/... (no next/headers).
// Only imports from src/components/ui/ and system-admin code (Clean Boundary).

import type { SysAdminTranslations } from '@/lib/system-admin-translations'

export interface AdminCallError {
  ok: false
  status: number
  code: string
  extra: Record<string, unknown>
}
export type AdminCallResult<T> = { ok: true; data: T } | AdminCallError

/** POST/PATCH JSON to /api/admin/<path>; never throws. */
export async function adminCall<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'GET',
  body?: unknown,
): Promise<AdminCallResult<T>> {
  let res: Response
  try {
    res = await fetch(`/api/admin/${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    return { ok: false, status: 0, code: 'network', extra: {} }
  }
  if (res.ok) return { ok: true, data: (await res.json().catch(() => ({}))) as T }
  const payload = (await res.json().catch(() => ({}))) as { detail?: unknown }
  const detail = payload.detail
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const { code, ...extra } = detail as { code?: string } & Record<string, unknown>
    return { ok: false, status: res.status, code: typeof code === 'string' ? code : 'unknown', extra }
  }
  return { ok: false, status: res.status, code: typeof detail === 'string' ? detail : 'unknown', extra: {} }
}

const KEYS: Record<string, keyof SysAdminTranslations> = {
  decision_reason_required: 'claims_err_reason_required',
  claim_not_open: 'claims_err_not_open',
  claim_not_verified: 'claims_err_not_verified',
  applicant_email_unverified: 'claims_err_email_unverified',
  shop_has_owner: 'claims_err_shop_has_owner',
  owner_has_other_shop: 'claims_err_owner_has_other_shop',
  owner_not_assignable: 'claims_err_owner_not_assignable',
  owner_not_found: 'claims_err_owner_not_found',
  shop_not_found: 'claims_err_shop_not_found',
  claim_applicant_missing: 'claims_err_applicant_missing',
  claim_callback_not_applicable: 'claims_err_callback_na',
  owner_already_assigned: 'claims_err_already_owner',
  owner_has_open_claim: 'claims_err_open_claim',
  check_not_pending: 'claims_err_check_not_pending',
  claim_document_unavailable: 'claims_err_doc_unavailable',
}

/** Translated message (en / el) for a refused admin call. */
export function adminClaimErrorMessage(err: AdminCallError, tr: SysAdminTranslations): string {
  const key = KEYS[err.code] ?? 'claims_err_generic'
  return String(tr[key]).replace('{shop}', String(err.extra.shop_name ?? ''))
}
