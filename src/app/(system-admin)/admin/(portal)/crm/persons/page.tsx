import Link from 'next/link'
import { getCrmPersons } from '@/lib/system-admin-api'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'

interface PageProps { searchParams: Promise<{ q?: string }> }

/** Person list (F7600 org cut, T16): name and number of active relations; the search stays a name search (≥ 3). */
export default async function CrmPersonsPage({ searchParams }: PageProps) {
  const q = (await searchParams).q?.trim() ?? ''
  const [lang, data] = await Promise.all([getLangServer(), getCrmPersons({ q: q.length >= 3 ? q : undefined })])
  const tr = tSysAdmin(lang)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{tr.crm_persons_title}</h1>
        <Link href="/admin/crm/persons/new" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white">{tr.crm_person_new}</Link>
      </div>
      <form method="GET" className="flex gap-2">
        <input name="q" defaultValue={q} minLength={3} placeholder={tr.crm_person_search_placeholder} aria-label={tr.crm_person_search} className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">{tr.crm_person_search}</button>
        {q && <Link href="/admin/crm/persons" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">{tr.clear}</Link>}
      </form>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-start">
              <th className="p-3 text-start">#</th>
              <th className="p-3 text-start">{tr.crm_col_name}</th>
              <th className="p-3 text-start">{tr.crm_person_col_relations}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr className="border-t"><td colSpan={3} className="p-3 text-gray-500">{tr.no_results}</td></tr>
            )}
            {data.items.map((person) => (
              <tr key={person.id} className="border-t">
                <td className="p-3">{person.id}</td>
                <td className="p-3">
                  <Link className="font-medium hover:underline" href={`/admin/crm/persons/${person.id}`}>{person.display_name ?? '—'}</Link>
                  {person.optout && <span className="ms-2 rounded bg-rose-50 px-1.5 text-xs text-rose-700">{tr.crm_person_optout_badge}</span>}
                </td>
                <td className="p-3">{person.relations.filter((relation) => relation.active).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
