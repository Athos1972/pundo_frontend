'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SysAdminShopOwner } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { showToast } from '@/components/system-admin/Toast'

interface Props {
  owner: SysAdminShopOwner
  tr: SysAdminTranslations
}

export function ShopOwnerEditForm({ owner, tr }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(owner.status)

  async function handleStatusChange(newStatus: 'approved' | 'rejected' | 'suspended') {
    // F5970: suspending locks the account at once -> explicit confirmation
    if (newStatus === 'suspended' && !window.confirm(tr.owner_confirm_suspend)) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/shop-owners/${owner.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!res.ok) {
          // F5970: an applicant with an open claim is approved through the claim queue only (409 owner_has_open_claim)
          const body = await res.json().catch(() => ({})) as { detail?: { code?: string } }
          showToast(body.detail?.code === 'owner_has_open_claim' ? tr.claims_err_open_claim : tr.error_generic, 'error')
          return
        }
        setStatus(newStatus)
        showToast(tr.saved, 'success')
        router.refresh()
      } catch {
        showToast(tr.error_backend, 'error')
      }
    })
  }

  const statusColors: Record<string, string> = {
    pre_signup: 'bg-gray-100 text-gray-600',
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-red-200 text-red-900',
    inactive: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      {/* Read-only info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400 uppercase font-semibold">{tr.id}</span>
            <span className="text-gray-700">{owner.id}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400 uppercase font-semibold">{tr.owner_name}</span>
            <span className="text-gray-700">{owner.name}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400 uppercase font-semibold">{tr.email}</span>
            <span className="text-gray-700">{owner.email}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400 uppercase font-semibold">{tr.shop_id}</span>
            <span className="text-gray-700">{owner.shop_id}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-700">{tr.status}:</span>
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status}
          </span>
        </div>
        {status === 'suspended' && owner.suspended_at && (
          <p className="text-xs text-gray-500" data-testid="owner-suspended-info">
            {tr.owner_suspended_since
              .replace('{date}', owner.suspended_at.slice(0, 10))
              .replace('{reason}', owner.suspended_reason === 'claim_reassigned' ? tr.owner_suspended_reason_claim_reassigned : tr.owner_suspended_reason_admin_manual)}
          </p>
        )}
        {owner.open_claim_request_id ? (
          <Link href={`/admin/claims/${owner.open_claim_request_id}`} className="text-xs font-medium text-slate-800 underline" data-testid="owner-open-claim">
            {tr.owner_open_claim_badge.replace('{id}', String(owner.open_claim_request_id))}
          </Link>
        ) : null}
      </div>

      {/* Status actions */}
      <div className="flex gap-3">
        {status !== 'approved' && !owner.open_claim_request_id && (
          <button
            type="button"
            onClick={() => handleStatusChange('approved')}
            disabled={isPending}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium
              rounded-lg disabled:opacity-50 transition-colors"
          >
            {isPending ? '…' : status === 'suspended' ? tr.owner_unsuspend : tr.approve}
          </button>
        )}
        {status !== 'rejected' && (
          <button
            type="button"
            onClick={() => handleStatusChange('rejected')}
            disabled={isPending}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium
              rounded-lg disabled:opacity-50 transition-colors"
          >
            {isPending ? '…' : tr.reject}
          </button>
        )}
        {status !== 'suspended' && (
          <button
            type="button"
            onClick={() => handleStatusChange('suspended')}
            disabled={isPending}
            data-testid="owner-suspend"
            className="px-5 py-2 border border-red-300 text-red-700 text-sm font-medium
              rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {tr.owner_suspend}
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push('/admin/shop-owners')}
          disabled={isPending}
          className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700
            rounded-lg hover:bg-gray-50 transition-colors"
        >
          {tr.cancel}
        </button>
      </div>
    </div>
  )
}
