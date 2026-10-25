// ─── CRM person: name derivation and the small catalogs (F7600 CRM-Backbone, org cut, T16) ─────────────────────────
// Pure module (no 'use client', no server-only import): usable in Client and Server Components and in tests.
// The backend is the only writer of `display_name` (PersonService.derive_display_name); this file mirrors its rule for
// the preview, so the admin sees before saving which name the person will get.

import type { CrmSalutation } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

function clean(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

/**
 * "first last" from the trimmed, non-empty parts; `null` if both are empty. Same rule as the backend
 * (`derive_display_name`): only the last name gives "Georgiou", without a leading space (AC 30).
 */
export function deriveDisplayName(firstName: string | null | undefined, lastName: string | null | undefined): string | null {
  const parts = [clean(firstName), clean(lastName)].filter((part): part is string => part !== null)
  return parts.length ? parts.join(' ') : null
}

/**
 * The free name that saving these name parts would replace (AC 32 replacement notice), or `null`.
 * Only a person whose name is free today (no first and no last name) and has a name loses text; the backend audits
 * exactly this case (`display_name_derived`).
 */
export function nameReplacement(
  current: { display_name: string | null; first_name: string | null; last_name: string | null },
  firstName: string,
  lastName: string,
): { from: string; to: string } | null {
  const wasFree = clean(current.first_name) === null && clean(current.last_name) === null
  const from = clean(current.display_name)
  const to = deriveDisplayName(firstName, lastName)
  if (!wasFree || from === null || to === null || to === from) return null
  return { from, to }
}

/** Salutation catalog (E20 values of the salutation); `null` means "not set" and is a separate, empty choice. */
export const SALUTATIONS = ['mr', 'ms', 'mx', 'dr', 'none'] as const satisfies readonly CrmSalutation[]

const SALUTATION_KEYS = {
  mr: 'crm_salutation_mr',
  ms: 'crm_salutation_ms',
  mx: 'crm_salutation_mx',
  dr: 'crm_salutation_dr',
  none: 'crm_salutation_none',
} as const satisfies Record<CrmSalutation, keyof SysAdminTranslations>

export function salutationLabel(tr: SysAdminTranslations, salutation: string | null): string | null {
  if (!salutation) return null
  const key = (SALUTATION_KEYS as Record<string, keyof SysAdminTranslations>)[salutation]
  return key ? (tr[key] as string) : salutation
}

/** ROLE_CATALOG of the backend (`ingestor/models/crm/person.py`); a relation holds 0..n of them (E22). */
export const ROLE_CATALOG = [
  'owner', 'advisor', 'server_operator', 'employee', 'service_staff', 'manager', 'contact', 'accountant', 'it',
] as const
export type CrmRole = (typeof ROLE_CATALOG)[number]

const ROLE_KEYS = {
  owner: 'crm_role_owner',
  advisor: 'crm_role_advisor',
  server_operator: 'crm_role_server_operator',
  employee: 'crm_role_employee',
  service_staff: 'crm_role_service_staff',
  manager: 'crm_role_manager',
  contact: 'crm_role_contact',
  accountant: 'crm_role_accountant',
  it: 'crm_role_it',
} as const satisfies Record<CrmRole, keyof SysAdminTranslations>

/** Translated role; an unknown code (newer backend) is shown as it is instead of disappearing. */
export function roleLabel(tr: SysAdminTranslations, role: string): string {
  const key = (ROLE_KEYS as Record<string, keyof SysAdminTranslations>)[role]
  return key ? (tr[key] as string) : role
}
