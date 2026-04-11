import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getProducts, getAllBrands, getAllCategories } from '@/lib/system-admin-api'
import { pickName } from '@/types/system-admin'
import { EntityTable } from '@/components/system-admin/EntityTable'

const LIMIT = 20

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''

  const [data, brands, categories] = await Promise.all([
    getProducts({ q: q || undefined, limit: LIMIT, offset: (page - 1) * LIMIT }).catch(() => ({
      items: [] as Awaited<ReturnType<typeof getProducts>>['items'],
      total: 0,
      limit: LIMIT,
      offset: 0,
    })),
    getAllBrands().catch(() => []),
    getAllCategories().catch(() => []),
  ])

  // Build lookup maps for human-readable names
  const brandMap = new Map(brands.map((b) => [b.id, pickName(b.names)]))
  const catMap = new Map(categories.map((c) => [c.id, c.name ?? c.external_id]))

  const rows = data.items.map((p) => ({
    id: p.id,
    name: pickName(p.names),
    slug: p.slug,
    category: p.category_id ? (catMap.get(p.category_id) ?? String(p.category_id)) : '—',
    brand: p.brand_id ? (brandMap.get(p.brand_id) ?? String(p.brand_id)) : '—',
  }))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.nav_products}</h1>
        <Link
          href="/admin/products/new"
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
        <button type="submit" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg">↵</button>
      </form>

      <EntityTable
        columns={[
          { key: 'id', label: tr.id },
          { key: 'name', label: tr.name },
          { key: 'slug', label: tr.slug },
          { key: 'category', label: tr.category },
          { key: 'brand', label: tr.brand },
        ]}
        rows={rows as unknown as Array<Record<string, unknown> & { id: number }>}
        editHref="/admin/products/{id}/edit"
        deleteUrl="/api/admin/products/{id}"
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
        baseHref="/admin/products"
        searchQ={q || undefined}
      />
    </div>
  )
}
