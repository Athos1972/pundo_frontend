import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getShopOwnerOffers } from '@/lib/system-admin-api'
import { EntityTable } from '@/components/system-admin/EntityTable'
import type { Column } from '@/components/system-admin/EntityTable'

const LIMIT = 20

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function ShopOwnerOffersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))

  let data = { items: [] as Awaited<ReturnType<typeof getShopOwnerOffers>>['items'], total: 0, limit: LIMIT, offset: 0 }
  try {
    data = await getShopOwnerOffers({ limit: LIMIT, offset: (page - 1) * LIMIT })
  } catch { /* handled below */ }

  const columns: Column[] = [
    { key: 'id', label: tr.id },
    { key: 'shop_id', label: tr.shop },
    { key: 'title', label: tr.offer_title },
    { key: 'price', label: tr.price },
    { key: 'valid_from', label: tr.valid_from },
    { key: 'valid_until', label: tr.valid_until },
    {
      key: 'archived',
      label: tr.archived,
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
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_so_offers}</h1>

      <EntityTable
        columns={columns}
        rows={data.items as unknown as Array<Record<string, unknown> & { id: number }>}
        editHref="/admin/shop-owner-offers/{id}/edit"
        deleteUrl="/api/admin/shop-owner-offers/{id}"
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
        baseHref="/admin/shop-owner-offers"
      />
    </div>
  )
}
