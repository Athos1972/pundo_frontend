import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin, type SysAdminTranslations } from '@/lib/system-admin-translations'
import { getReviewAuditLog } from '@/lib/system-admin-api'
import type { SysAdminReviewAuditEntry } from '@/types/system-admin'

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

export default async function ReviewAuditLogPage({ params }: Props) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  let entries: SysAdminReviewAuditEntry[] = []
  let failed = false
  try {
    entries = await getReviewAuditLog(id)
  } catch {
    failed = true
  }

  const label = (prefix: 'rev_audit_action_' | 'rev_actor_', value: string): string => {
    const key = `${prefix}${value}` as keyof SysAdminTranslations
    return key in tr ? (tr[key] as string) : value
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/reviews" className="text-sm text-gray-500 hover:text-gray-900">
          ← {tr.rev_audit_back}
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">{tr.rev_audit_title} #{id}</h1>
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-red-600">{tr.rev_load_error}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500">{tr.rev_audit_empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-start">
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">{tr.rev_audit_col_time}</th>
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">{tr.rev_audit_col_action}</th>
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">{tr.rev_audit_col_actor}</th>
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">{tr.rev_audit_col_ip}</th>
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">{tr.rev_audit_col_reason}</th>
                <th className="py-2 pe-4 text-gray-500 font-medium text-xs">{tr.rev_audit_col_model}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pe-4 text-gray-600 whitespace-nowrap">{formatDate(entry.timestamp)}</td>
                  <td className="py-2 pe-4 font-medium text-gray-900">{label('rev_audit_action_', entry.action)}</td>
                  <td className="py-2 pe-4 text-gray-600">{label('rev_actor_', entry.actor_type)}</td>
                  <td className="py-2 pe-4 text-gray-500 font-mono text-xs">{entry.actor_ip ?? '—'}</td>
                  <td dir="auto" className="py-2 pe-4 text-gray-600">{entry.reason ?? '—'}</td>
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
