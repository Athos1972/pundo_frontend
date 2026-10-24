import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCrmPerson, getAdminMe } from '@/lib/system-admin-api'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { PersonRoleEditor } from '@/components/system-admin/crm/PersonRoleEditor'
import { PersonEditForm } from '@/components/system-admin/crm/PersonEditForm'

export default async function CrmPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; let person
  try { person = await getCrmPerson(Number(id)) } catch { notFound() }
  const tr = tSysAdmin(await getLangServer())
  const me = await getAdminMe()
  const canWrite = me.role === 'superadmin' || me.permissions == null || me.permissions.includes('crm:contacts:write')
  return <div className="flex max-w-3xl flex-col gap-5"><Link href="/admin/crm/persons" className="text-sm text-gray-500 hover:underline">{tr.crm_persons_title}</Link><h1 className="text-xl font-semibold">{person.display_name ?? '—'}</h1><section className="rounded-xl border border-gray-200 bg-white p-5"><h2 className="mb-2 text-sm font-semibold">{tr.crm_person_identifiers}</h2><ul className="text-sm">{person.identifiers.map((identifier) => <li key={identifier.id}>{identifier.kind}: {identifier.value_normalized}</li>)}</ul></section>{person.address && <section className="rounded-xl border border-gray-200 bg-white p-5"><h2 className="mb-2 text-sm font-semibold">{tr.address}</h2><p className="text-sm">{[person.address.address_line1, person.address.postal_code, person.address.city, person.address.country_code].filter(Boolean).join(', ')}</p></section>}<section className="rounded-xl border border-gray-200 bg-white p-5"><h2 className="mb-2 text-sm font-semibold">{tr.crm_title}</h2><ul className="text-sm">{(person.contacts ?? []).map((contact) => <li key={contact.id}><Link className="underline" href={`/admin/crm/contacts/${contact.id}`}>{contact.display_name ?? `#${contact.id}`}</Link> · {tr.crm_col_org} #{contact.org_id}</li>)}</ul></section><PersonEditForm person={person} tr={tr} /><PersonRoleEditor person={person} tr={tr} canWrite={canWrite} /></div>
}
