'use client'
// F5970 — decisions on an application: mark as verified, accept (dispute: "and change owner", with the full list
// of consequences), reject. Every decision needs a reason (also enforced by the backend with 422).
// Only imports from src/components/ui/ and system-admin code (Clean Boundary).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminClaimDetail } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { showToast } from '@/components/system-admin/Toast'
import { adminCall, adminClaimErrorMessage } from './adminClaimApi'

type Action = 'verify' | 'accept' | 'reject'

interface Props {
  claim: SysAdminClaimDetail
  tr: SysAdminTranslations
}

export function ClaimDecisionDialog({ claim, tr }: Props) {
  const router = useRouter()
  const [action, setAction] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [notifyPrevious, setNotifyPrevious] = useState(true)
  const [notifyApplicant, setNotifyApplicant] = useState(true)
  const [rejectCode, setRejectCode] = useState<'insufficient_proof' | 'not_reachable' | 'other'>('insufficient_proof')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDispute = claim.kind === 'dispute'
  const replacesOwner = isDispute && claim.current_owner !== null && !claim.current_owner.is_system_account && claim.current_owner.status === 'approved'
  const canVerify = claim.status === 'open'
  const canAccept = claim.status === 'verified'
  const canReject = claim.status === 'open' || claim.status === 'verified'
  const applicantUnverified = claim.applicant !== null && !claim.applicant.email_verified
  const noReachedCall = isDispute && !claim.callbacks.some((c) => c.outcome === 'reached')

  if (!canVerify && !canAccept && !canReject) return null

  function close() {
    setAction(null)
    setReason('')
    setError(null)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!action) return
    if (reason.trim().length < 3) { setError(tr.claims_err_reason_required); return }
    setError(null)
    const path = `claim-requests/${claim.id}/${action}`
    const body =
      action === 'verify' ? { reason: reason.trim() }
      : action === 'accept' ? { reason: reason.trim(), notify_previous_owner: notifyPrevious }
      : { reason_code: rejectCode, reason: reason.trim(), notify_applicant: notifyApplicant }
    startTransition(async () => {
      const res = await adminCall(path, 'POST', body)
      if (res.ok) {
        showToast(action === 'verify' ? tr.claims_done_verify : action === 'accept' ? tr.claims_done_accept : tr.claims_done_reject, 'success')
        close()
        router.refresh()
      } else setError(adminClaimErrorMessage(res, tr))
    })
  }

  const title = action === 'verify' ? tr.claims_dialog_verify_title
    : action === 'accept' ? (isDispute ? tr.claims_dialog_accept_dispute_title : tr.claims_dialog_accept_title)
    : tr.claims_dialog_reject_title

  return (
    <>
      <div className="flex flex-wrap gap-3" data-testid="claim-actions">
        {canVerify && (
          <button type="button" onClick={() => setAction('verify')} data-testid="action-verify" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {tr.claims_action_verify}
          </button>
        )}
        {canAccept && (
          <button type="button" onClick={() => setAction('accept')} data-testid="action-accept" className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${isDispute ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
            {isDispute ? tr.claims_action_accept_dispute : tr.claims_action_accept}
          </button>
        )}
        {canReject && (
          <button type="button" onClick={() => setAction('reject')} data-testid="action-reject" className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            {tr.claims_action_reject}
          </button>
        )}
      </div>

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="claim-decision-title">
          <form onSubmit={submit} className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl" data-testid="claim-decision-dialog">
            <h2 id="claim-decision-title" className="text-lg font-semibold text-gray-900">{title}</h2>

            {action === 'accept' && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="accept-consequences">
                <p className="font-semibold">{tr.claims_cons_title}</p>
                <ul className="mt-1 list-disc ps-5">
                  <li>{tr.claims_cons_assign}</li>
                  {replacesOwner && <li>{tr.claims_cons_suspend}</li>}
                  {replacesOwner && <li>{tr.claims_cons_offers.replace('{n}', String(claim.current_owner?.offers_active ?? 0))}</li>}
                  {replacesOwner && <li>{tr.claims_cons_consent}</li>}
                </ul>
              </div>
            )}
            {action === 'accept' && noReachedCall && <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="warn-no-callback">{tr.claims_warn_no_callback}</p>}
            {action === 'accept' && applicantUnverified && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="warn-email-unverified">{tr.claims_warn_email_unverified}</p>}

            {action === 'reject' && (
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                {tr.claims_reject_reason_code}
                <select value={rejectCode} onChange={(e) => setRejectCode(e.target.value as typeof rejectCode)} className="rounded-lg border border-gray-300 px-3 py-2 font-normal" data-testid="reject-code">
                  <option value="insufficient_proof">{tr.claims_reject_insufficient_proof}</option>
                  <option value="not_reachable">{tr.claims_reject_not_reachable}</option>
                  <option value="other">{tr.claims_reject_other}</option>
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              {tr.claims_dialog_reason}
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required className="rounded-lg border border-gray-300 px-3 py-2 font-normal" data-testid="decision-reason" />
            </label>

            {action === 'accept' && replacesOwner && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={notifyPrevious} onChange={(e) => setNotifyPrevious(e.target.checked)} data-testid="notify-previous" />
                {tr.claims_notify_previous}
              </label>
            )}
            {action === 'reject' && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={notifyApplicant} onChange={(e) => setNotifyApplicant(e.target.checked)} data-testid="notify-applicant" />
                {tr.claims_notify_applicant}
              </label>
            )}

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={close} disabled={isPending} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {tr.claims_dialog_cancel}
              </button>
              <button type="submit" disabled={isPending || (action === 'accept' && applicantUnverified)} data-testid="decision-confirm" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40">
                {isPending ? '…' : tr.claims_dialog_confirm}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
