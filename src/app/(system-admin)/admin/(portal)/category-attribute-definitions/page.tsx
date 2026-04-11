import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getCategories } from '@/lib/system-admin-api'
import { EntityTable } from '@/components/system-admin/EntityTable'

// This page lists all categories and links to their attribute definitions
const LIMIT = 50

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function CategoryAttributeDefsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''

  let data = { items: [] as Awaited<ReturnType<typeof getCategories>>['items'], total: 0, limit: LIMIT, offset: 0 }
  try {
    data = await getCategories({ q: q || undefined, limit: LIMIT, offset: (page - 1) * LIMIT })
  } catch { /* handled below */ }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_cat_attr_defs}</h1>
      <p className="text-sm text-gray-500">Select a category to manage its attribute definitions.</p>

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
          { key: 'level', label: tr.level },
        ]}
        rows={data.items as unknown as Array<Record<string, unknown> & { id: number }>}
        editHref="/admin/category-attribute-definitions/{id}"
        editLabel="Manage defs"
        deleteLabel={tr.delete}
        confirmMessage={tr.confirm_delete}
        cancelLabel={tr.cancel}
        deletedMessage={tr.deleted}
        errorMessage={tr.error_generic}
        noItemsLabel={tr.no_items}
        total={data.total}
        page={page}
        limit={LIMIT}
        baseHref="/admin/category-attribute-definitions"
        searchQ={q || undefined}
      />
    </div>
  )
}
