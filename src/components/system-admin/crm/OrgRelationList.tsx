'use client'
// ─── Contact persons of an organisation (F7600 CRM-Backbone, org cut, T16; replaces ContactPersonLink) ─────────────
// Content of the section "Contact persons" of the organisation page (the page renders the section and its heading):
// one RelationCard per relation (person link, roles or "Role missing", period, note, relation channels, personal
// channels marked "Personal", preferred channel) and the form "Add contact person" (person search by name → relation
// with a role set 0..n). Ended relations stay visible as history.
// Clean Boundary: only system-admin components, types and translations.

import { useCallback, useState, useTransition } from 'react'
import { Combobox } from '@/components/system-admin/Combobox'
import { crmPost } from './crmFetch'
import { crmPath } from './crmPaths'
import { PERSON_SEARCH_MIN, searchCrmPersons, searchErrorText } from './crmSearch'
import { RelationCard, RoleChoice, sortRelations } from './PersonRelationEditor'
import type { CrmOrgDetail, CrmRelationCreateRequest, CrmRelationOut } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

export interface OrgRelationListProps {
  org: CrmOrgDetail
  /** Called after every successful change (the page re-reads the organisation, e.g. `router.refresh()`). */
  onChanged: () => void
  tr: SysAdminTranslations
  /** `crm:contacts:write`; without it the list is read-only. */
  canWrite: boolean
  /** `crm:lifecycle:write`: legal tier of the relation channels. */
  canSetTier?: boolean
}

export function OrgRelationList({ org, onChanged, tr, canWrite, canSetTier = false }: OrgRelationListProps) {
  const [pending, start] = useTransition()
  const [person, setPerson] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [note, setNote] = useState('')
  const loadPersons = useCallback((query: string) => searchCrmPersons(query), [])
  const errorText = useCallback((error: unknown) => searchErrorText(error, tr), [tr])
  const relations = sortRelations(org.relations)
  const activeCount = org.relations.filter((relation) => relation.active).length

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!person) return
    const body: CrmRelationCreateRequest = { person_id: Number(person), org_id: org.id, roles, ...(note.trim() ? { note: note.trim() } : {}) }
    start(async () => {
      const result = await crmPost<CrmRelationOut>(crmPath('relationCreate'), body, tr)
      if (result.ok) { setPerson(''); setRoles([]); setNote(''); onChanged() }
    })
  }

  return (
    <div className="flex flex-col" data-testid="crm-org-relations">
      {relations.length > 0 && (
        <p className="mb-2 text-xs text-gray-500">{tr.crm_relation_active_count.replace('{n}', String(activeCount))}</p>
      )}
      {relations.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">{tr.crm_relation_no_contacts}</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-3">
          {relations.map((relation) => (
            <RelationCard key={relation.id} relation={relation} context="org" orgChannels={org.channels} canWrite={canWrite} canSetTier={canSetTier} tr={tr} onChanged={onChanged} />
          ))}
        </ul>
      )}
      {canWrite && (
        <form onSubmit={add} className="flex flex-col gap-2 border-t border-gray-100 pt-3">
          <h3 className="text-xs font-semibold text-gray-700">{tr.crm_relation_add_person}</h3>
          <div className="flex w-80 flex-col gap-1 text-xs text-gray-600">
            <span>{tr.crm_person_field}</span>
            <Combobox
              id="crm-person-search"
              items={[]}
              value={person}
              onChange={setPerson}
              loadItems={loadPersons}
              placeholder={tr.crm_person_search_placeholder}
              searchLabel={tr.crm_person_field}
              noResultsLabel={tr.no_results}
              minQueryLength={PERSON_SEARCH_MIN}
              minQueryLabel={tr.crm_search_min_chars.replace('{n}', String(PERSON_SEARCH_MIN))}
              loadingLabel={tr.crm_search_loading}
              errorLabel={errorText}
            />
          </div>
          <RoleChoice idPrefix={`org-${org.id}-relation-role`} value={roles} onChange={setRoles} tr={tr} />
          <label className="flex flex-col gap-1 text-xs text-gray-600" htmlFor={`org-${org.id}-relation-note`}>
            {tr.crm_relation_note}
            <input id={`org-${org.id}-relation-note`} maxLength={2000} className="rounded border border-gray-300 px-2 py-1.5 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div>
            <button type="submit" disabled={pending || !person} className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50">{tr.crm_relation_add_person}</button>
          </div>
        </form>
      )}
    </div>
  )
}
