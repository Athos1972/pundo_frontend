import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getProducts } from '@/lib/system-admin-api'
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

  let data = { items: [] as Awaited<ReturnType<typeof getProducts>>['items'], total: 0, limit: LIMIT, offset: 0 }
  try {
    data = await getProducts({ q: q || undefined, limit: LIMIT, offset: (page - 1) * LIMIT })
  } catch { /* handled below */ }

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
          { key: 'category_id', label: tr.category },
          { key: 'brand_id', label: tr.brand },
        ]}
        rows={data.items as unknown as Array<Record<string, unknown> & { id: number }>}
        editHref={(id) => `/admin/products/${id}/edit`}
        deleteUrl={(id) => `/api/admin/products/${id}`}
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
