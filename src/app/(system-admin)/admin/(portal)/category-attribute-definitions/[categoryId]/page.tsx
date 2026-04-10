import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getCategory, getCategoryAttributeDefs } from '@/lib/system-admin-api'
import { EntityTable } from '@/components/system-admin/EntityTable'
import type { Column } from '@/components/system-admin/EntityTable'

interface PageProps {
  params: Promise<{ categoryId: string }>
}

export default async function CategoryAttrDefsDetailPage({ params }: PageProps) {
  const { categoryId } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  const [category, defs] = await Promise.all([
    getCategory(Number(categoryId)).catch(() => null),
    getCategoryAttributeDefs(Number(categoryId)).catch(() => []),
  ])

  if (!category) notFound()

  const columns: Column[] = [
    { key: 'id', label: tr.id },
    { key: 'key', label: tr.key },
    { key: 'label', label: tr.label },
    { key: 'type', label: tr.type },
    {
      key: 'options',
      label: tr.options,
      render: (v) => {
        const opts = v as string[] | null
        return opts?.join(', ') ?? '—'
      },
    },
  ]

  const rows = defs as unknown as Array<Record<string, unknown> & { id: number }>

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/category-attribute-definitions" className="text-sm text-gray-500 hover:text-gray-700">
            ← {tr.nav_cat_attr_defs}
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">{category.name}</h1>
        </div>
        <Link
          href={`/admin/category-attribute-definitions/${categoryId}/new`}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + {tr.add_new}
        </Link>
      </div>

      <EntityTable
        columns={columns}
        rows={rows}
        editHref={(id) => `/admin/category-attribute-definitions/${categoryId}/${id}/edit`}
        deleteUrl={(id) => `/api/admin/categories/${categoryId}/attribute-definitions/${id}`}
        deleteLabel={tr.delete}
        editLabel={tr.edit}
        confirmMessage={tr.confirm_delete}
        cancelLabel={tr.cancel}
        deletedMessage={tr.deleted}
        errorMessage={tr.error_generic}
        noItemsLabel={tr.no_items}
        total={defs.length}
        page={1}
        limit={defs.length || 1}
        baseHref={`/admin/category-attribute-definitions/${categoryId}`}
      />
    </div>
  )
}
