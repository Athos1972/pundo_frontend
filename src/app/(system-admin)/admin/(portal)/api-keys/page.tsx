import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getApiKeys } from '@/lib/system-admin-api'
import { EntityTable } from '@/components/system-admin/EntityTable'

const LIMIT = 20

// Outside the component on purpose: "expired" depends on the current time (impure), the table is rendered per request.
function keyStatus(key: { is_active: boolean; expires_at: string | null }, tr: ReturnType<typeof tSysAdmin>): string {
  if (!key.is_active) return tr.api_key_revoked
  if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) return tr.api_key_expired
  return tr.api_key_active
}

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
    // the backend sends `scopes` (list) and `owner_id`; the table used the field names `scope`/`shop_owner_id`, which
    // the backend never sent, so both columns were always empty (found by the type contract, B8950-016 T17)
    scope: item.scopes.join(', ') || '—',
    shop_owner_id: item.owner_id ?? '—',
    created_at: item.created_at ? new Date(item.created_at).toLocaleDateString() : '—',
    // B6210-002: a revoked key was not recognisable in the table; revoked wins over expired
    status: keyStatus(item, tr),
    expires_at: item.expires_at ? new Date(item.expires_at).toLocaleDateString() : '—',
    last_used_at: item.last_used_at ? new Date(item.last_used_at).toLocaleDateString() : tr.never,
  }))

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_api_keys}</h1>
      <p className="text-sm text-gray-500">{tr.api_keys_admin_hint}</p>

      <EntityTable
        columns={[
          { key: 'id', label: tr.id },
          { key: 'name', label: tr.name },
          { key: 'key_prefix', label: tr.api_key_prefix },
          { key: 'status', label: tr.status },
          { key: 'expires_at', label: tr.api_key_expires },
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
        actionsLabel={tr.actions}
        total={total}
        page={page}
        limit={LIMIT}
        baseHref="/admin/api-keys"
      />
    </div>
  )
}
