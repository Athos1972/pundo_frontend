import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getCategories } from '@/lib/system-admin-api'
import { CategoryTreeView } from '@/components/system-admin/CategoryTreeView'
import { EntityTable } from '@/components/system-admin/EntityTable'

const LIMIT = 50

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; view?: string }>
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''
  const view = sp.view ?? 'tree'

  let data = { items: [] as Awaited<ReturnType<typeof getCategories>>['items'], total: 0, limit: LIMIT, offset: 0 }
  try {
    data = await getCategories({ q: q || undefined, limit: LIMIT, offset: (page - 1) * LIMIT })
  } catch { /* handled below */ }

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

      <div className="flex gap-2 items-center">
        <form method="GET" className="flex gap-2 flex-1">
          <input name="view" type="hidden" value={view} />
          <input
            name="q"
            defaultValue={q}
            placeholder={tr.search}
            className="flex-1 max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-600"
          />
          <button type="submit" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg">↵</button>
        </form>
        <div className="flex gap-1">
          <Link
            href={`/admin/categories?view=tree${q ? `&q=${q}` : ''}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === 'tree' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Tree
          </Link>
          <Link
            href={`/admin/categories?view=table${q ? `&q=${q}` : ''}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === 'table' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Table
          </Link>
        </div>
      </div>

      {view === 'tree' ? (
        <CategoryTreeView categories={data.items} editLabel={tr.edit} />
      ) : (
        <EntityTable
          columns={[
            { key: 'id', label: tr.id },
            { key: 'name', label: tr.name },
            { key: 'parent_id', label: tr.parent_category },
            { key: 'level', label: tr.level },
            { key: 'taxonomy_type', label: tr.taxonomy_type },
            { key: 'child_count', label: tr.child_count },
          ]}
          rows={data.items as unknown as Array<Record<string, unknown> & { id: number }>}
          editHref={(id) => `/admin/categories/${id}/edit`}
          deleteUrl={(id) => `/api/admin/categories/${id}`}
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
