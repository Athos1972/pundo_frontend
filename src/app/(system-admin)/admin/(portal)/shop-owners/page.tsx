import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getShopOwners } from '@/lib/system-admin-api'
import { EntityTable } from '@/components/system-admin/EntityTable'
import type { Column } from '@/components/system-admin/EntityTable'

const LIMIT = 20

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}

export default async function ShopOwnersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''
  const status = sp.status ?? ''

  let data = { items: [] as Awaited<ReturnType<typeof getShopOwners>>['items'], total: 0, limit: LIMIT, offset: 0 }
  try {
    data = await getShopOwners({
      q: q || undefined,
      status: status || undefined,
      limit: LIMIT,
      offset: (page - 1) * LIMIT,
    })
  } catch { /* handled below */ }

  const statusBadge = (s: unknown) => {
    const val = String(s)
    const colors: Record<string, string> = {
      approved: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[val] ?? 'bg-gray-100 text-gray-600'}`}>
        {val}
      </span>
    )
  }

  const columns: Column[] = [
    { key: 'id', label: tr.id },
    { key: 'name', label: tr.owner_name },
    { key: 'email', label: tr.email },
    { key: 'status', label: tr.status, render: (v) => statusBadge(v) },
    { key: 'shop_id', label: 'Shop ID' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.nav_shop_owners}</h1>
      </div>

      <form method="GET" className="flex gap-2 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder={tr.search}
          className="flex-1 max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        >
          <option value="">All statuses</option>
          <option value="pending">{tr.pending}</option>
          <option value="approved">{tr.approved}</option>
          <option value="rejected">{tr.rejected}</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg"
        >
          ↵
        </button>
      </form>

      <EntityTable
        columns={columns}
        rows={data.items as unknown as Array<Record<string, unknown> & { id: number }>}
        editHref={(id) => `/admin/shop-owners/${id}/edit`}
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
        baseHref="/admin/shop-owners"
        searchQ={q || undefined}
      />
    </div>
  )
}
