import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getApiKeys } from '@/lib/system-admin-api'
import { EntityTable } from '@/components/system-admin/EntityTable'

const LIMIT = 20

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function ApiKeysPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))

  let rawItems: Awaited<ReturnType<typeof getApiKeys>>['items'] = []
  let total = 0
  try {
    const data = await getApiKeys({ limit: LIMIT, offset: (page - 1) * LIMIT })
    rawItems = data.items
    total = data.total
  } catch { /* handled below */ }

  // Pre-format dates on server to avoid render functions crossing SC→CC boundary
  const rows = rawItems.map((item) => ({
    ...item,
    created_at: item.created_at ? new Date(item.created_at).toLocaleDateString() : '—',
    last_used_at: item.last_used_at ? new Date(item.last_used_at).toLocaleDateString() : tr.never,
  }))

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_api_keys}</h1>
      <p className="text-sm text-gray-500">API keys are created by shop owners. Admins can only revoke them.</p>

      <EntityTable
        columns={[
          { key: 'id', label: tr.id },
          { key: 'name', label: tr.name },
          { key: 'scope', label: tr.scope },
          { key: 'shop_owner_id', label: 'Owner ID' },
          { key: 'created_at', label: tr.created_at },
          { key: 'last_used_at', label: tr.last_used },
        ]}
        rows={rows as unknown as Array<Record<string, unknown> & { id: number }>}
        deleteUrl="/api/admin/api-keys/{id}"
        deleteLabel={tr.revoke}
        editLabel={tr.edit}
        confirmMessage={tr.confirm_revoke}
        cancelLabel={tr.cancel}
        deletedMessage={tr.deleted}
        errorMessage={tr.error_generic}
        noItemsLabel={tr.no_items}
        total={total}
        page={page}
        limit={LIMIT}
        baseHref="/admin/api-keys"
      />
    </div>
  )
}
