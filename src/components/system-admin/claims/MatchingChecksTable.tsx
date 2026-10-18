'use client'
// F5970 — pending matching checks (shop_claim_checks): candidates side by side, "Assign owner" (resolves the check)
// and "Resolve without assignment" (dismiss with a mandatory reason).
// Only imports from src/components/ui/ and system-admin code (Clean Boundary).

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SysAdminMatchingCheck } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { AssignOwnerDialog } from '@/components/system-admin/AssignOwnerDialog'
import { showToast } from '@/components/system-admin/Toast'
import { adminCall, adminClaimErrorMessage } from './adminClaimApi'

interface Props {
  checks: SysAdminMatchingCheck[]
  tr: SysAdminTranslations
}

export function MatchingChecksTable({ checks, tr }: Props) {
  const router = useRouter()
  const [assigning, setAssigning] = useState<SysAdminMatchingCheck | null>(null)
  const [dismissing, setDismissing] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function dismiss(id: number) {
    if (reason.trim().length < 3) { setError(tr.claims_err_reason_required); return }
    setError(null)
    startTransition(async () => {
      const res = await adminCall(`shop-claim-checks/${id}`, 'PATCH', { review_status: 'dismissed', reason: reason.trim() })
      if (res.ok) {
        showToast(tr.matching_closed, 'success')
        setDismissing(null)
        setReason('')
        router.refresh()
      } else setError(adminClaimErrorMessage(res, tr))
    })
  }

  if (checks.length === 0) {
    return <p className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">{tr.matching_empty}</p>
  }

  return (
    <>
      <div className="flex flex-col gap-3" data-testid="matching-checks">
        {checks.map((check) => (
          <article key={check.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm" data-testid="matching-check">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">{tr.matching_col_input}</p>
                <p className="break-all text-gray-800">{[check.input_shop_name, check.input_city, check.input_domain].filter(Boolean).join(' · ') || '—'}</p>
                <p className="mt-1 text-xs text-gray-500">{check.created_at.slice(0, 10)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">{tr.matching_col_method}</p>
                <p className="text-gray-800">{check.match_method}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">{tr.matching_col_outcome}</p>
                <p className="text-gray-800">{check.outcome}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">{tr.matching_col_candidates}</p>
              <ul className="mt-1 grid gap-2 sm:grid-cols-2">
                {check.candidates.map((c) => (
                  <li key={c.shop_id} className="rounded-lg border border-gray-200 px-3 py-2">
                    <Link href={`/admin/shops/${c.shop_id}/edit`} className="font-medium text-slate-800 underline">#{c.shop_id} {c.name ?? ''}</Link>
                    <p className="text-xs text-gray-500">{[c.city, c.website_url ?? c.webshop_url].filter(Boolean).join(' · ')}</p>
                  </li>
                ))}
              </ul>
            </div>

            {dismissing === check.id ? (
              <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3">
                <label className="flex flex-col gap-1 text-gray-700">
                  {tr.matching_dismiss_reason}
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="rounded-lg border border-gray-300 px-3 py-2" data-testid="dismiss-reason" />
                </label>
                {error && <p className="text-red-700" role="alert">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => dismiss(check.id)} disabled={isPending} data-testid="dismiss-confirm" className="rounded-lg bg-slate-800 px-3 py-1.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50">
                    {tr.matching_dismiss_confirm}
                  </button>
                  <button type="button" onClick={() => { setDismissing(null); setError(null) }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-white">
                    {tr.claims_dialog_cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setAssigning(check)} disabled={check.candidates.length === 0} data-testid="matching-assign" className="rounded-lg bg-slate-800 px-3 py-1.5 font-medium text-white hover:bg-slate-700 disabled:opacity-40">
                  {tr.matching_assign}
                </button>
                <button type="button" onClick={() => { setDismissing(check.id); setReason(''); setError(null) }} data-testid="matching-dismiss" className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50">
                  {tr.matching_dismiss}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {assigning && (
        <AssignOwnerDialog
          tr={tr}
          shops={assigning.candidates.map((c) => ({ id: c.shop_id, name: c.name ?? `#${c.shop_id}` }))}
          checkId={assigning.id}
          onClose={() => setAssigning(null)}
          onDone={() => { setAssigning(null); router.refresh() }}
        />
      )}
    </>
  )
}
