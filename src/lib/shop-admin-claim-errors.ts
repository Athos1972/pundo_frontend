// ─── Shop-Admin — Claim (F5970): backend error code -> i18n message ───────────
// Pure helper (no React, no next/headers): usable by every claim component and testable on its own.
// Clean Boundary: imports only shop-admin code.

import type { ShopAdminClaimTranslations } from '@/lib/i18n/shop-admin-claim'
import { ClaimApiError } from '@/lib/shop-admin-claim-client'

type ClaimKey = Extract<keyof ShopAdminClaimTranslations, `claim_err_${string}`>

/** Backend `detail.code` (and the client-side pseudo codes) -> translation key. Every code of the API is listed. */
export const CLAIM_ERROR_KEYS: Record<string, ClaimKey> = {
  captcha_failed: 'claim_err_captcha',
  claim_shop_not_found: 'claim_err_shop_not_found',
  claim_owner_confirmation_required: 'claim_err_owner_confirm',
  claim_invalid_request: 'claim_err_invalid',
  claim_message_too_long: 'claim_err_message_long',
  claim_password_invalid: 'claim_err_password',
  claim_account_required: 'claim_err_account_required',
  claim_name_required: 'claim_err_name_required',
  invalid_credentials: 'claim_err_credentials',
  claim_account_has_shop: 'claim_err_has_shop',
  claim_account_not_eligible: 'claim_err_not_eligible',
  claim_proof_method_unavailable: 'claim_err_method_unavailable',
  claim_callback_ack_required: 'claim_err_callback_ack',
  claim_documents_required: 'claim_err_documents_required',
  claim_too_many_documents: 'claim_err_too_many',
  claim_document_invalid_type: 'claim_err_doc_type',
  claim_document_too_large: 'claim_err_doc_size',
  claim_upload_unavailable: 'claim_err_upload_unavailable',
  claim_open_limit: 'claim_err_open_limit',
  claim_cooldown: 'claim_err_cooldown',
  claim_not_found: 'claim_err_not_found',
  claim_not_open: 'claim_err_not_open',
  claim_code_missing: 'claim_err_code_missing',
  claim_code_locked: 'claim_err_code_locked',
  claim_code_expired: 'claim_err_code_expired',
  claim_code_invalid: 'claim_err_code_invalid',
  claim_code_rate_limited: 'claim_err_code_rate',
  claim_shop_code_rate_limited: 'claim_err_shop_code_rate',
  rate_limited: 'claim_err_rate_limited',
  network: 'claim_err_network',
}

function formatTime(iso: unknown, lang: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: unknown, lang: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Translated message for a failed claim API call (placeholders filled from the error's `extra`). */
export function claimErrorMessage(err: unknown, tr: ShopAdminClaimTranslations, lang: string): string {
  if (!(err instanceof ClaimApiError)) return tr.claim_err_generic
  const key = CLAIM_ERROR_KEYS[err.code] ?? (err.status === 429 ? 'claim_err_rate_limited' : 'claim_err_generic')
  const x = err.extra
  return tr[key]
    .replace('{shop}', String(x.shop_name ?? ''))
    .replace('{max}', String(x.max_files ?? ''))
    .replace('{filename}', String(x.filename ?? ''))
    .replace('{n}', String(x.attempts_left ?? ''))
    .replace('{date}', formatDate(x.until, lang))
    .replace('{time}', formatTime(x.next_resend_at, lang))
}
