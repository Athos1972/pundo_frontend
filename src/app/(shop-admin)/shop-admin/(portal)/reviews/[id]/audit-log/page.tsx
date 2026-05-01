import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { cookies } from 'next/headers'
import type { AuditLogEntry } from '@/types/shop-admin'
import Link from 'next/link'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'

async function getAuditLog(reviewId: string, lang: string): Promise<AuditLogEntry[]> {
  const store = await cookies()
  const token = store.get('admin_token')?.value ?? store.get('shop_owner_token')?.value

  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/reviews/${reviewId}/audit-log`, {
      headers: {
        'Accept-Language': lang,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

interface Props {
  params: Promise<{ id: string }>
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default async function AuditLogPage({ params }: Props) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tAdmin(lang)
  const entries = await getAuditLog(id, lang)

  const actionLabel = (action: string): string => {
    const map: Record<string, string> = {
      created: tr.reviews_audit_action_created,
      edited: tr.reviews_audit_action_edited,
      reported: tr.reviews_audit_action_reported,
      invalidated: tr.reviews_audit_action_invalidated,
      restored: tr.reviews_audit_action_restored,
      photo_approved: tr.reviews_audit_action_photo_approved,
      photo_rejected: tr.reviews_audit_action_photo_rejected,
    }
    return map[action] ?? action
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/shop-admin/reviews" className="text-sm text-gray-500 hover:text-gray-900">
          ← {tr.back}
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{tr.reviews_audit_log} #{id}</h1>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">{tr.reviews_no_items}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-start">
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">Zeit</th>
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">Aktion</th>
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">Typ</th>
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">IP</th>
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">Grund</th>
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">Modell</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pe-4 text-gray-600 whitespace-nowrap">{formatDate(entry.timestamp)}</td>
                  <td className="py-2 pe-4 font-medium text-gray-900">{actionLabel(entry.action)}</td>
                  <td className="py-2 pe-4 text-gray-600">{entry.actor_type}</td>
                  <td className="py-2 pe-4 text-gray-500 font-mono text-xs">{entry.actor_ip ?? '—'}</td>
                  <td className="py-2 pe-4 text-gray-600">{entry.reason ?? '—'}</td>
                  <td className="py-2 pe-4 text-gray-500 text-xs">
                    {entry.moderation_model
                      ? `${entry.moderation_model} (${((entry.moderation_confidence ?? 0) * 100).toFixed(0)}%)`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
