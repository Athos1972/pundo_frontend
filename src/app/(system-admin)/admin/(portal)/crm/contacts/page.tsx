// @seo-allow-default
import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getCrmContacts } from '@/lib/system-admin-api'
import { ContactList } from '@/components/system-admin/crm/ContactList'
import type { CrmContactListItem } from '@/types/system-admin'

const LIMIT = 50

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; lifecycle_state?: string }>
}

export default async function CrmContactsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''
  const lifecycleState = sp.lifecycle_state ?? ''

  const data = await getCrmContacts({
    q: q || undefined,
    lifecycle_state: lifecycleState || undefined,
    limit: LIMIT,
    offset: (page - 1) * LIMIT,
  }).catch(() => ({
    items: [] as CrmContactListItem[],
    total: 0,
    limit: LIMIT,
    offset: 0,
  }))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.crm_title}</h1>
        <Link
          href="/admin/crm/contacts/new"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + {tr.crm_new}
        </Link>
      </div>

      <form method="GET" className="flex gap-2 flex-wrap items-end">
        <input
          name="q"
          defaultValue={q}
          placeholder={tr.crm_search_placeholder}
          className="flex-1 min-w-48 max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg"
        >
          ↵
        </button>
        {(q || lifecycleState) && (
          <Link href="/admin/crm/contacts" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
            {tr.clear}
          </Link>
        )}
      </form>

      <ContactList
        contacts={data.items}
        total={data.total}
        page={page}
        limit={LIMIT}
        q={q}
        lifecycleState={lifecycleState}
        tr={tr}
      />
    </div>
  )
}
