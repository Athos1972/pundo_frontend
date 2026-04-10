import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getShopTypes } from '@/lib/system-admin-api'
import { EntityTable } from '@/components/system-admin/EntityTable'

const LIMIT = 50

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function ShopTypesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''

  let data = { items: [] as Awaited<ReturnType<typeof getShopTypes>>['items'], total: 0, limit: LIMIT, offset: 0 }
  try {
    data = await getShopTypes({ q: q || undefined, limit: LIMIT, offset: (page - 1) * LIMIT })
  } catch { /* handled below */ }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.nav_shop_types}</h1>
        <Link
          href="/admin/shop-types/new"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + {tr.add_new}
        </Link>
      </div>

      <EntityTable
        columns={[
          { key: 'id', label: tr.id },
          { key: 'name', label: tr.name },
          { key: 'description', label: tr.description },
        ]}
        rows={data.items as unknown as Array<Record<string, unknown> & { id: number }>}
        editHref={(id) => `/admin/shop-types/${id}/edit`}
        deleteUrl={(id) => `/api/admin/shop-types/${id}`}
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
        baseHref="/admin/shop-types"
        searchQ={q || undefined}
      />
    </div>
  )
}
