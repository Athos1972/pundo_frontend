import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getOffers } from '@/lib/system-admin-api'
import { EntityTable } from '@/components/system-admin/EntityTable'
import type { Column } from '@/components/system-admin/EntityTable'

const LIMIT = 20

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; shop_listing_id?: string }>
}

export default async function OffersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''
  const shopListingIdQ = sp.shop_listing_id ?? ''

  const data = await getOffers({
    q: q || undefined,
    shop_id: undefined,
    product_id: undefined,
    limit: LIMIT,
    offset: (page - 1) * LIMIT,
  }).catch(() => ({
    items: [] as Awaited<ReturnType<typeof getOffers>>['items'],
    total: 0,
    limit: LIMIT,
    offset: 0,
  }))

  const rows = data.items.map((o) => ({
    id: o.id,
    shop_listing_id: o.shop_listing_id,
    title: o.title ?? '—',
    source: o.source,
    currency: o.currency,
    price_type: o.price_type,
    archived: o.archived,
  }))

  const columns: Column[] = [
    { key: 'id', label: tr.id },
    { key: 'shop_listing_id', label: 'Shop Listing' },
    { key: 'title', label: tr.offer_title },
    { key: 'source', label: 'Source' },
    { key: 'currency', label: tr.currency },
    { key: 'price_type', label: tr.price_type },
    {
      key: 'archived',
      label: tr.archived ?? 'Archived',
      boolDisplay: {
        trueLabel: 'Yes',
        falseLabel: 'No',
        trueClass: 'text-gray-400',
        falseClass: 'text-green-600',
      },
    },
  ]

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

      <form method="GET" className="flex gap-2 flex-wrap items-end">
        <input
          name="q"
          defaultValue={q}
          placeholder={tr.search}
          className="flex-1 min-w-32 max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
        <input
          name="shop_listing_id"
          defaultValue={shopListingIdQ}
          placeholder="Shop Listing ID"
          type="number"
          min="1"
          className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg"
        >
          ↵
        </button>
        {(q || shopListingIdQ) && (
          <a href="/admin/offers" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
            {tr.clear}
          </a>
        )}
      </form>

      <EntityTable
        columns={columns}
        rows={rows as unknown as Array<Record<string, unknown> & { id: number }>}
        editHref="/admin/offers/{id}/edit"
        deleteUrl="/api/admin/offers/{id}"
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
      />
    </div>
  )
}
