'use client'
// ─── CRM type-ahead searches for the Combobox (F7600 org/person search) ───────────────────────────────────────
// Browser-side, through the catch-all proxy /api/admin/[...path] (system-admin-api.ts is server-only).
// Clean Boundary: only system-admin types, translations and crmFetch.

import type { ComboboxItem } from '@/components/system-admin/Combobox'
import type { CrmOrgSearchHit, CrmPerson, PaginatedResponse } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { CRM_ERROR_KEYS, CrmSearchError, crmSearch } from './crmFetch'
import { crmPath } from './crmPaths'

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

/** Channel values shown in the sublabel of a person hit (personal channels first, then those of the relations). */
const PERSON_SUBLABEL_CHANNELS = 3

/** Sublabel of a person: channel values tell people with the same name apart; the number is the last resort. */
export function personToItem(person: CrmPerson): ComboboxItem {
  const channels = [...(person.channels ?? []), ...(person.relations ?? []).flatMap((relation) => relation.channels ?? [])]
  const values = [...new Set(channels.map((channel) => channel.value_normalized))].slice(0, PERSON_SUBLABEL_CHANNELS)
  return {
    value: String(person.id),
    label: person.display_name ?? '—',
    subLabel: [...values, `#${person.id}`].join(' · '),
  }
}

/**
 * Organisation type-ahead (`GET /admin/crm/orgs/search`). `parentCandidatesOnly` offers only organisations without a head
 * office of their own (for "belongs to"); `excludeId` leaves out the organisation being edited.
 */
export async function searchCrmOrgs(
  query: string,
  options: { parentCandidatesOnly?: boolean; excludeId?: number } = {},
): Promise<ComboboxItem[]> {
  const q = query.trim()
  if (q.length < ORG_SEARCH_MIN) return []
  const res = await crmSearch<PaginatedResponse<CrmOrgSearchHit>>(crmPath('orgSearch', {
    q,
    limit: SEARCH_LIMIT,
    parent_candidates_only: options.parentCandidatesOnly ? true : undefined,
    exclude_id: options.excludeId,
  }))
  return res.items.map(orgHitToItem)
}

export async function searchCrmPersons(query: string): Promise<ComboboxItem[]> {
  const q = query.trim()
  if (q.length < PERSON_SEARCH_MIN) return []
  const res = await crmSearch<PaginatedResponse<CrmPerson>>(crmPath('personList', { q, limit: SEARCH_LIMIT }))
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
