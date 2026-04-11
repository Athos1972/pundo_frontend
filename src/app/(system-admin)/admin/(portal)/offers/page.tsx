import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getOffers, getAllShops, getAllProducts } from '@/lib/system-admin-api'
import { pickName } from '@/types/system-admin'
import { EntityTable } from '@/components/system-admin/EntityTable'
import type { Column } from '@/components/system-admin/EntityTable'

const LIMIT = 20

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; shop_id?: string; product_id?: string }>
}

export default async function OffersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''
  const shopIdQ = sp.shop_id ?? ''
  const productIdQ = sp.product_id ?? ''

  const [data, shops, products] = await Promise.all([
    getOffers({
      q: q || undefined,
      shop_id: shopIdQ ? Number(shopIdQ) : undefined,
      product_id: productIdQ ? Number(productIdQ) : undefined,
      limit: LIMIT,
      offset: (page - 1) * LIMIT,
    }).catch(() => ({
      items: [] as Awaited<ReturnType<typeof getOffers>>['items'],
      total: 0,
      limit: LIMIT,
      offset: 0,
    })),
    getAllShops().catch(() => []),
    getAllProducts().catch(() => []),
  ])

  const shopMap = new Map(shops.map((s) => [s.id, pickName(s.names)]))
  const productMap = new Map(products.map((p) => [p.id, pickName(p.names)]))

  const rows = data.items.map((o) => ({
    id: o.id,
    shop: o.shop_id ? (shopMap.get(o.shop_id) ?? String(o.shop_id)) : '—',
    product: o.product_id ? (productMap.get(o.product_id) ?? String(o.product_id)) : '—',
    price: o.price ?? '—',
    currency: o.currency,
    price_type: o.price_type,
    is_available: o.is_available,
  }))

  const columns: Column[] = [
    { key: 'id', label: tr.id },
    { key: 'shop', label: tr.shop },
    { key: 'product', label: tr.product },
    { key: 'price', label: tr.price },
    { key: 'currency', label: tr.currency },
    { key: 'price_type', label: tr.price_type },
    {
      key: 'is_available',
      label: tr.is_available,
      boolDisplay: {
        trueLabel: '✓',
        falseLabel: '✗',
        trueClass: 'text-green-600',
        falseClass: 'text-gray-400',
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{tr.product}</label>
          <div className="flex gap-1">
            <input
              name="q"
              defaultValue={q}
              placeholder={tr.search_product}
              className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
            <input
              name="product_id"
              defaultValue={productIdQ}
              placeholder="ID"
              type="number"
              min="1"
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{tr.shop}</label>
          <div className="flex gap-1">
            <input
              name="shop_id"
              defaultValue={shopIdQ}
              placeholder="ID"
              type="number"
              min="1"
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg"
        >
          ↵
        </button>
        {(q || shopIdQ || productIdQ) && (
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
