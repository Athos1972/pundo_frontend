'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPost } from './crmFetch'
import type { CrmPerson } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

const ROLES = ['owner', 'advisor', 'server_operator', 'employee', 'service_staff', 'manager', 'contact', 'accountant', 'it']

function roleSummary(tr: SysAdminTranslations, item: CrmPerson['roles'][number]) {
  return tr.crm_person_role_summary
    .replace('{role}', item.role)
    .replace('{orgId}', String(item.org_id))
    .replace('{from}', item.valid_from ?? '—')
    .replace('{to}', item.valid_to ?? '—')
}

export function PersonRoleEditor({ person, tr }: { person: CrmPerson; tr: SysAdminTranslations }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [org, setOrg] = useState(''); const [role, setRole] = useState('contact')
  function add(event: React.FormEvent) { event.preventDefault(); start(async () => { const res = await crmPost(`crm/persons/${person.id}/roles`, { org_id: Number(org), role }, tr); if (res.ok) { setOrg(''); router.refresh() } }) }
  function end(roleId: number) { start(async () => { const res = await crmPost(`crm/persons/${person.id}/roles/${roleId}/end`, { valid_to: new Date().toISOString().slice(0, 10) }, tr); if (res.ok) router.refresh() }) }
  return <section className="rounded-xl border border-gray-200 bg-white p-5"><h2 className="mb-3 text-sm font-semibold">{tr.crm_person_roles}</h2><ul className="mb-4 flex flex-col gap-2 text-sm">{person.roles.map((item) => <li key={item.id} className="flex items-center justify-between"><span>{roleSummary(tr, item)}</span>{!item.valid_to && <button type="button" onClick={() => end(item.id)} className="text-xs text-red-700 underline" disabled={pending}>{tr.crm_person_end_role}</button>}</li>)}</ul><form onSubmit={add} className="flex gap-2"><label className="sr-only" htmlFor="person-org">{tr.crm_col_org}</label><input id="person-org" required inputMode="numeric" value={org} onChange={(e) => setOrg(e.target.value)} placeholder={tr.crm_col_org} className="w-28 rounded border px-2 py-1 text-sm" /><label className="sr-only" htmlFor="person-role">{tr.crm_person_role}</label><select id="person-role" value={role} onChange={(e) => setRole(e.target.value)} className="rounded border px-2 py-1 text-sm">{ROLES.map((entry) => <option key={entry}>{entry}</option>)}</select><button disabled={pending} className="rounded bg-slate-800 px-3 py-1 text-sm text-white">{tr.crm_person_add_role}</button></form></section>
}
