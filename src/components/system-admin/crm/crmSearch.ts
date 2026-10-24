'use client'
// ─── CRM type-ahead searches for the Combobox (F7600 org/person search) ───────────────────────────────────────
// Browser-side, through the catch-all proxy /api/admin/[...path] (system-admin-api.ts is server-only).
// Clean Boundary: only system-admin types, translations and crmFetch.

import type { ComboboxItem } from '@/components/system-admin/Combobox'
import type { CrmOrgSearchHit, CrmPerson, PaginatedResponse } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { CRM_ERROR_KEYS, CrmSearchError, crmSearch } from './crmFetch'

/** Minimum input lengths; the backend enforces the same numbers (422 `org_search_too_short` / `person_search_too_short`). */
export const ORG_SEARCH_MIN = 2
export const PERSON_SEARCH_MIN = 3
const SEARCH_LIMIT = 20

export function orgHitToItem(hit: CrmOrgSearchHit): ComboboxItem {
  const legal = hit.legal_name && hit.legal_name !== hit.name ? hit.legal_name : null
  return {
    value: String(hit.id),
    label: hit.name,
    subLabel: [legal, hit.city, hit.category, `#${hit.id}`].filter(Boolean).join(' · '),
  }
}

export function personToItem(person: CrmPerson): ComboboxItem {
  const identifiers = (person.identifiers ?? []).map((identifier) => identifier.value_normalized)
  return {
    value: String(person.id),
    label: person.display_name ?? '—',
    subLabel: [...identifiers, `#${person.id}`].join(' · '),
  }
}

export async function searchCrmOrgs(query: string): Promise<ComboboxItem[]> {
  const q = query.trim()
  if (q.length < ORG_SEARCH_MIN) return []
  const res = await crmSearch<PaginatedResponse<CrmOrgSearchHit>>(`crm/orgs?q=${encodeURIComponent(q)}&limit=${SEARCH_LIMIT}`)
  return res.items.map(orgHitToItem)
}

export async function searchCrmPersons(query: string): Promise<ComboboxItem[]> {
  const q = query.trim()
  if (q.length < PERSON_SEARCH_MIN) return []
  const res = await crmSearch<PaginatedResponse<CrmPerson>>(`crm/persons?q=${encodeURIComponent(q)}&limit=${SEARCH_LIMIT}`)
  return res.items.map(personToItem)
}

/** Readable text for a failed search; never the raw code. */
export function searchErrorText(error: unknown, tr: SysAdminTranslations): string {
  if (error instanceof CrmSearchError) {
    if (error.status === 403) return tr.crm_err_forbidden
    if (error.status === 422 && error.code) {
      const key = (CRM_ERROR_KEYS as Record<string, keyof SysAdminTranslations>)[error.code]
      if (key) return tr[key] as string
    }
  }
  return tr.crm_err_search_failed
}
