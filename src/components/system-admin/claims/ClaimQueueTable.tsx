// F5970 — queue of claim applications (Server Component: only links, no client state).
// Only imports from src/components/ui/ and system-admin code (Clean Boundary).

import Link from 'next/link'
import type { SysAdminClaimListItem } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface Props {
  items: SysAdminClaimListItem[]
  tr: SysAdminTranslations
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export function methodLabel(method: string | null, tr: SysAdminTranslations): string {
  switch (method) {
    case 'email_domain': return tr.claims_method_email_domain
    case 'shop_email_code': return tr.claims_method_shop_email_code
    case 'phone_callback': return tr.claims_method_phone_callback
    case 'document': return tr.claims_method_document
    default: return tr.claims_method_none
  }
}

export function subStateLabel(item: Pick<SysAdminClaimListItem, 'sub_state' | 'status'>, tr: SysAdminTranslations): string {
  if (item.status === 'verified') return tr.claims_badge_proof_received
  switch (item.sub_state) {
    case 'awaiting_email_verification': return tr.claims_badge_awaiting_email
    case 'awaiting_code': return tr.claims_badge_awaiting_code
    case 'awaiting_callback': return tr.claims_badge_callback_pending
    case 'callback_done_enter_code': return tr.claims_badge_callback_done
    case 'awaiting_review': return tr.claims_badge_awaiting_review
    case 'decided': return tr.claims_badge_decided
  }
}

const statusLabel = (status: string, tr: SysAdminTranslations): string =>
  ({ open: tr.claims_status_open, verified: tr.claims_status_verified, accepted: tr.claims_status_accepted, rejected: tr.claims_status_rejected } as Record<string, string>)[status] ?? status

export function ClaimQueueTable({ items, tr }: Props) {
  if (items.length === 0) {
    return <p className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">{tr.claims_empty}</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm" data-testid="claim-queue">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-start">{tr.claims_col_id}</th>
            <th className="px-3 py-2 text-start">{tr.claims_col_shop}</th>
            <th className="px-3 py-2 text-start">{tr.claims_col_type}</th>
            <th className="px-3 py-2 text-start">{tr.claims_col_method}</th>
            <th className="px-3 py-2 text-start">{tr.claims_col_state}</th>
            <th className="px-3 py-2 text-start">{tr.claims_col_applicant}</th>
            <th className="px-3 py-2 text-start">{tr.claims_col_created}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((c) => (
            <tr key={c.id} data-testid="claim-row" className="align-top hover:bg-gray-50">
              <td className="px-3 py-2">
                <Link href={`/admin/claims/${c.id}`} className="font-medium text-slate-800 underline">#{c.id}</Link>
              </td>
              <td className="px-3 py-2">
                <span className="block font-medium text-gray-900">{c.shop_name}</span>
                {c.open_requests_for_shop > 1 && (
                  <span className="mt-0.5 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800" data-testid="claim-n-requests">
                    {tr.claims_badge_n_requests.replace('{n}', String(c.open_requests_for_shop))}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                {c.kind === 'dispute' ? (
                  <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700" data-testid="claim-dispute-badge">{tr.claims_badge_dispute}</span>
                ) : c.source === 'admin_assign' ? tr.claims_source_admin_assign : tr.claims_kind_claim}
              </td>
              <td className="px-3 py-2 text-gray-600">{methodLabel(c.proof_method, tr)}</td>
              <td className="px-3 py-2">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>{statusLabel(c.status, tr)}</span>
                {c.status !== 'accepted' && c.status !== 'rejected' && (
                  <span className="mt-0.5 block text-xs text-gray-500">{subStateLabel(c, tr)}</span>
                )}
              </td>
              <td className="px-3 py-2 text-gray-600 break-all">{c.applicant?.email ?? '—'}</td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{c.created_at.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
