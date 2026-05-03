import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getMappingGaps } from '@/lib/system-admin-api'

export default async function MappingGapsPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  const gaps = await getMappingGaps().catch(() => [] as Awaited<ReturnType<typeof getMappingGaps>>)

  // All entries from the gap report already represent uncovered domains/specialties
  // (auto_assign_item_count === 0). Keep the filter for forward-compat if backend
  // starts sending partially-covered entries too.
  const noAutoAssignGaps = gaps.filter((g) => g.auto_assign_item_count === 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/item-domain-mappings"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {tr.idm_title}
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">{tr.idm_gaps_title}</h1>
        <p className="text-sm text-gray-500 mt-1">{tr.idm_gaps_description}</p>
      </div>

      {noAutoAssignGaps.length === 0 ? (
        <div className="bg-green-50 text-green-700 rounded-xl border border-green-200 px-5 py-4 text-sm">
          {tr.idm_gaps_none}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.idm_gaps_domain}</th>
                <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.idm_gaps_specialty}</th>
                <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.idm_gaps_count}</th>
              </tr>
            </thead>
            <tbody>
              {noAutoAssignGaps.map((gap, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {gap.kind === 'domain' ? (gap.slug ?? `#${gap.domain_id}`) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {gap.kind === 'specialty' ? (gap.slug ?? `#${gap.specialty_id}`) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                      {gap.auto_assign_item_count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
