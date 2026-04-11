import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getShops } from '@/lib/system-admin-api'
import { pickName } from '@/types/system-admin'
import { EntityTable } from '@/components/system-admin/EntityTable'

const LIMIT = 20

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function ShopsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''

  let data = { items: [] as Awaited<ReturnType<typeof getShops>>['items'], total: 0, limit: LIMIT, offset: 0 }
  try {
    data = await getShops({ q: q || undefined, limit: LIMIT, offset: (page - 1) * LIMIT })
  } catch { /* handled below */ }

  // Pre-process multilingual fields into display strings
  const rows = data.items.map((s) => ({
    id: s.id,
    name: pickName(s.names),
    address: [s.address_line1, s.city].filter(Boolean).join(', ') || '—',
    status: s.status,
    shop_type_id: s.shop_type_id ?? '—',
  }))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.nav_shops}</h1>
        <Link
          href="/admin/shops/new"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + {tr.add_new}
        </Link>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder={tr.search}
          className="flex-1 max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg"
        >
          ↵
        </button>
      </form>

      <EntityTable
        columns={[
          { key: 'id', label: tr.id },
          { key: 'name', label: tr.name },
          { key: 'address', label: tr.address },
          { key: 'status', label: tr.status },
          { key: 'shop_type_id', label: tr.shop_type },
        ]}
        rows={rows as unknown as Array<Record<string, unknown> & { id: number }>}
        editHref="/admin/shops/{id}/edit"
        deleteUrl="/api/admin/shops/{id}"
        deleteLabel={tr.delete}
        editLabel={tr.edit}
        confirmMessage={tr.confirm_delete}
        cancelLabel={tr.cancel}
        deletedMessage={tr.deleted}
        errorMessage={tr.error_generic}
        noItemsLabel={tr.no_items}
        total={data.total}
        page={page}
        limit={LIMIT}
        baseHref="/admin/shops"
        searchQ={q || undefined}
      />
    </div>
  )
}
