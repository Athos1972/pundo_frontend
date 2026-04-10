import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getOffers } from '@/lib/system-admin-api'
import { EntityTable } from '@/components/system-admin/EntityTable'

const LIMIT = 20

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function OffersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''

  let data = { items: [] as Awaited<ReturnType<typeof getOffers>>['items'], total: 0, limit: LIMIT, offset: 0 }
  try {
    data = await getOffers({ limit: LIMIT, offset: (page - 1) * LIMIT })
  } catch { /* handled below */ }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.nav_offers}</h1>
        <Link
          href="/admin/offers/new"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + {tr.add_new}
        </Link>
      </div>

      <EntityTable
        columns={[
          { key: 'id', label: tr.id },
          { key: 'shop_id', label: tr.shop },
          { key: 'product_id', label: tr.product },
          { key: 'price', label: tr.price },
          { key: 'currency', label: tr.currency },
          { key: 'price_type', label: tr.price_type },
          {
            key: 'is_available',
            label: tr.is_available,
            render: (v) => (
              <span className={`text-xs font-medium ${v ? 'text-green-600' : 'text-gray-400'}`}>
                {v ? '✓' : '✗'}
              </span>
            ),
          },
        ]}
        rows={data.items as unknown as Array<Record<string, unknown> & { id: number }>}
        editHref={(id) => `/admin/offers/${id}/edit`}
        deleteUrl={(id) => `/api/admin/offers/${id}`}
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
        baseHref="/admin/offers"
        searchQ={q || undefined}
      />
    </div>
  )
}
