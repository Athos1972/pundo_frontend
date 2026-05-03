import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getItemDomainMappings } from '@/lib/system-admin-api'
import { MappingList } from './MappingList'

const LIMIT = 50

interface PageProps {
  searchParams: Promise<{ page?: string; domain?: string; specialty?: string }>
}

export default async function ItemDomainMappingsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const domain = sp.domain ?? ''
  const specialty = sp.specialty ?? ''

  const data = await getItemDomainMappings({
    domain: domain || undefined,
    specialty: specialty || undefined,
    limit: LIMIT,
    offset: (page - 1) * LIMIT,
  }).catch(() => ({
    items: [] as Awaited<ReturnType<typeof getItemDomainMappings>>['items'],
    total: 0,
    limit: LIMIT,
    offset: 0,
  }))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{tr.idm_title}</h1>
          <Link
            href="/admin/item-domain-mappings/gaps"
            className="text-xs text-slate-600 hover:underline border border-slate-300 rounded px-2 py-0.5"
          >
            {tr.idm_gaps_title} →
          </Link>
        </div>
        <Link
          href="/admin/item-domain-mappings/new"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + {tr.idm_new}
        </Link>
      </div>

      <form method="GET" className="flex gap-2 flex-wrap items-end">
        <input
          name="domain"
          defaultValue={domain}
          placeholder={tr.idm_domain}
          className="flex-1 min-w-32 max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
        <input
          name="specialty"
          defaultValue={specialty}
          placeholder={tr.idm_specialty}
          className="flex-1 min-w-32 max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg"
        >
          ↵
        </button>
        {(domain || specialty) && (
          <a
            href="/admin/item-domain-mappings"
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {tr.clear}
          </a>
        )}
      </form>

      <MappingList
        mappings={data.items}
        total={data.total}
        page={page}
        limit={LIMIT}
        tr={tr}
        domain={domain}
        specialty={specialty}
      />
    </div>
  )
}
