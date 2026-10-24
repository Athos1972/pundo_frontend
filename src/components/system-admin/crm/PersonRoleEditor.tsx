'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Combobox } from '@/components/system-admin/Combobox'
import { crmPost } from './crmFetch'
import { ORG_SEARCH_MIN, searchCrmOrgs, searchErrorText } from './crmSearch'
import type { CrmPerson } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

const ROLES = ['owner', 'advisor', 'server_operator', 'employee', 'service_staff', 'manager', 'contact', 'accountant', 'it']

function orgDisplay(tr: SysAdminTranslations, item: CrmPerson['roles'][number]) {
  if (!item.org_name) return tr.crm_person_org_fallback.replace('{orgId}', String(item.org_id))
  return item.org_city ? `${item.org_name} (${item.org_city})` : item.org_name
}

function roleSummary(tr: SysAdminTranslations, item: CrmPerson['roles'][number]) {
  return tr.crm_person_role_summary
    .replace('{role}', item.role)
    .replace('{org}', orgDisplay(tr, item))
    .replace('{from}', item.valid_from ?? '—')
    .replace('{to}', item.valid_to ?? '—')
}

export function PersonRoleEditor({ person, tr, canWrite = true }: { person: CrmPerson; tr: SysAdminTranslations; canWrite?: boolean }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [org, setOrg] = useState(''); const [role, setRole] = useState('contact')
  const loadOrgs = useCallback((query: string) => searchCrmOrgs(query), [])
  const errorText = useCallback((error: unknown) => searchErrorText(error, tr), [tr])
  function add(event: React.FormEvent) { event.preventDefault(); if (!org) return; start(async () => { const res = await crmPost(`crm/persons/${person.id}/roles`, { org_id: Number(org), role }, tr); if (res.ok) { setOrg(''); router.refresh() } }) }
  function end(roleId: number) { start(async () => { const res = await crmPost(`crm/persons/${person.id}/roles/${roleId}/end`, { valid_to: new Date().toISOString().slice(0, 10) }, tr); if (res.ok) router.refresh() }) }
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold">{tr.crm_person_roles}</h2>
      <ul className="mb-4 flex flex-col gap-2 text-sm">
        {person.roles.map((item) => (
          <li key={item.id} className="flex items-center justify-between">
            <span>{roleSummary(tr, item)}</span>
            {canWrite && !item.valid_to && <button type="button" onClick={() => end(item.id)} className="text-xs text-red-700 underline" disabled={pending}>{tr.crm_person_end_role}</button>}
          </li>
        ))}
      </ul>
      {canWrite && (
        <form onSubmit={add} className="flex items-start gap-2">
          <div className="w-72">
            <Combobox
              id="person-org"
              items={[]}
              value={org}
              onChange={setOrg}
              loadItems={loadOrgs}
              placeholder={tr.crm_org_search_placeholder}
              searchLabel={tr.crm_col_org}
              noResultsLabel={tr.no_results}
              minQueryLength={ORG_SEARCH_MIN}
              minQueryLabel={tr.crm_search_min_chars.replace('{n}', String(ORG_SEARCH_MIN))}
              loadingLabel={tr.crm_search_loading}
              errorLabel={errorText}
            />
          </div>
          <label className="sr-only" htmlFor="person-role">{tr.crm_person_role}</label>
          <select id="person-role" value={role} onChange={(e) => setRole(e.target.value)} className="rounded border px-2 py-2 text-sm">{ROLES.map((entry) => <option key={entry}>{entry}</option>)}</select>
          <button disabled={pending || !org} className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50">{tr.crm_person_add_role}</button>
        </form>
      )}
    </section>
  )
}
