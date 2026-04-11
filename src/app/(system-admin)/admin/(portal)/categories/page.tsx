import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getCategories } from '@/lib/system-admin-api'
import { CategoryTreeView } from '@/components/system-admin/CategoryTreeView'
import { EntityTable } from '@/components/system-admin/EntityTable'

const LIMIT = 50

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; id?: string; taxonomy_type?: string; view?: string }>
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''
  const idQ = sp.id ?? ''
  const taxonomyType = sp.taxonomy_type ?? ''
  const view = sp.view ?? 'tree'

  let data = { items: [] as Awaited<ReturnType<typeof getCategories>>['items'], total: 0, limit: LIMIT, offset: 0 }
  try {
    data = await getCategories({ q: q || undefined, id: idQ ? Number(idQ) : undefined, taxonomy_type: taxonomyType || undefined, limit: LIMIT, offset: (page - 1) * LIMIT })
  } catch { /* handled below */ }

  let allCategoriesForTree: Awaited<ReturnType<typeof getCategories>>['items'] = []
  if (view === 'tree') {
    try {
      const allData = await getCategories({ q: q || undefined, id: idQ ? Number(idQ) : undefined, taxonomy_type: taxonomyType || undefined, limit: 2000, offset: 0 })
      allCategoriesForTree = allData.items
    } catch { /* handled */ }
  }

  // Pre-process for table view: use translated name or external_id as display name
  const tableRows = data.items.map((c) => ({
    id: c.id,
    name: c.name ?? c.external_id,
    parent_id: c.parent_id ?? '—',
    level: c.level ?? '—',
    taxonomy_type: c.taxonomy_type,
  }))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.nav_categories}</h1>
        <Link
          href="/admin/categories/new"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + {tr.add_new}
        </Link>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <form method="GET" className="flex gap-2 flex-1 flex-wrap">
          <input name="view" type="hidden" value={view} />
          <input
            name="q"
            defaultValue={q}
            placeholder={tr.search}
            className="flex-1 min-w-32 max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-600"
          />
          <input
            name="id"
            defaultValue={idQ}
            placeholder={tr.search_by_id}
            type="number"
            min="1"
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-600"
          />
          <input
            name="taxonomy_type"
            defaultValue={taxonomyType}
            placeholder={tr.taxonomy_type}
            className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-600"
          />
          <button type="submit" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg">↵</button>
        </form>
        <div className="flex gap-1">
          <Link
            href={`/admin/categories?view=tree${q ? `&q=${q}` : ''}${idQ ? `&id=${idQ}` : ''}${taxonomyType ? `&taxonomy_type=${taxonomyType}` : ''}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === 'tree' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Tree
          </Link>
          <Link
            href={`/admin/categories?view=table${q ? `&q=${q}` : ''}${idQ ? `&id=${idQ}` : ''}${taxonomyType ? `&taxonomy_type=${taxonomyType}` : ''}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === 'table' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Table
          </Link>
        </div>
      </div>

      {view === 'tree' ? (
        <CategoryTreeView
          categories={allCategoriesForTree}
          editLabel={tr.edit}
          expandAllLabel={tr.expand_all}
          collapseAllLabel={tr.collapse_all}
        />
      ) : (
        <EntityTable
          columns={[
            { key: 'id', label: tr.id },
            { key: 'name', label: tr.name },
            { key: 'parent_id', label: tr.parent_category },
            { key: 'level', label: tr.level },
            { key: 'taxonomy_type', label: tr.taxonomy_type },
          ]}
          rows={tableRows as unknown as Array<Record<string, unknown> & { id: number }>}
          editHref="/admin/categories/{id}/edit"
          deleteUrl="/api/admin/categories/{id}"
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
          baseHref="/admin/categories"
          searchQ={q || undefined}
        />
      )}
    </div>
  )
}
