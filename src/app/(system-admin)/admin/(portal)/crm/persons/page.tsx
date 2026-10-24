import Link from 'next/link'
import { getCrmPersons } from '@/lib/system-admin-api'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'

interface PageProps { searchParams: Promise<{ q?: string }> }

export default async function CrmPersonsPage({ searchParams }: PageProps) {
  const q = (await searchParams).q?.trim() ?? ''
  const [lang, data] = await Promise.all([getLangServer(), getCrmPersons({ q: q.length >= 3 ? q : undefined })]); const tr = tSysAdmin(lang)
  return <div className="flex flex-col gap-5"><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">{tr.crm_persons_title}</h1><Link href="/admin/crm/persons/new" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white">{tr.crm_person_new}</Link></div><form method="GET" className="flex gap-2"><input name="q" defaultValue={q} minLength={3} placeholder={tr.crm_person_search_placeholder} className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm" /><button type="submit" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">{tr.crm_person_search}</button>{q && <Link href="/admin/crm/persons" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">{tr.clear}</Link>}</form><div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-start"><th className="p-3 text-start">#</th><th className="p-3 text-start">{tr.crm_col_name}</th><th className="p-3 text-start">{tr.crm_person_identifiers}</th></tr></thead><tbody>{data.items.map((person) => <tr key={person.id} className="border-t"><td className="p-3">{person.id}</td><td className="p-3"><Link className="font-medium hover:underline" href={`/admin/crm/persons/${person.id}`}>{person.display_name ?? '—'}</Link></td><td className="p-3 text-xs">{person.identifiers.map((i) => i.value_normalized).join(', ')}</td></tr>)}</tbody></table></div></div>
}
