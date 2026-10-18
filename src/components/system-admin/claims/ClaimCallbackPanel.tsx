'use client'
// F5970 — call-back to the PUBLIC phone number: issue a one-time code the admin tells by phone, and protocol the
// result. The plaintext code exists only in this component's state (the API shows it exactly once).
// Only imports from src/components/ui/ and system-admin code (Clean Boundary).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminCallbackCode, SysAdminClaimDetail } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { showToast } from '@/components/system-admin/Toast'
import { adminCall, adminClaimErrorMessage } from './adminClaimApi'

interface Props {
  claim: Pick<SysAdminClaimDetail, 'id' | 'status' | 'kind' | 'proof_method' | 'callbacks'> & { shop: Pick<SysAdminClaimDetail['shop'], 'phone'> }
  tr: SysAdminTranslations
  locale: string
}

export function ClaimCallbackPanel({ claim, tr, locale }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState<SysAdminCallbackCode | null>(null)
  const [outcome, setOutcome] = useState<'reached' | 'not_reached'>('reached')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const active = claim.status === 'open' || claim.status === 'verified'
  const codeApplicable = claim.status === 'open' && (claim.proof_method === 'phone_callback' || claim.proof_method === 'document' || claim.kind === 'dispute')

  function issue() {
    setError(null)
    startTransition(async () => {
      const res = await adminCall<SysAdminCallbackCode>(`claim-requests/${claim.id}/callback-code`, 'POST')
      if (res.ok) setCode(res.data)
      else setError(adminClaimErrorMessage(res, tr))
    })
  }

  function record(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await adminCall(`claim-requests/${claim.id}/callback`, 'POST', { outcome, ...(note.trim() ? { note: note.trim() } : {}) })
      if (res.ok) {
        showToast(tr.claims_callback_saved, 'success')
        setNote('')
        router.refresh()
      } else setError(adminClaimErrorMessage(res, tr))
    })
  }

  return (
    <div className="flex flex-col gap-3 text-sm" data-testid="claim-callback-panel">
      <p className="text-gray-600">{tr.claims_callback_hint.replace('{phone}', claim.shop.phone ?? '—')}</p>

      {claim.callbacks.length === 0 ? (
        <p className="text-gray-400">{tr.claims_callback_none}</p>
      ) : (
        <ul className="flex flex-col gap-1" data-testid="claim-callbacks">
          {claim.callbacks.map((c, i) => (
            <li key={i} className="rounded-lg border border-gray-200 px-3 py-2">
              <span className={c.outcome === 'reached' ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>
                {c.outcome === 'reached' ? tr.claims_callback_reached : tr.claims_callback_not_reached}
              </span>
              <span className="text-gray-500"> · {new Date(c.at).toLocaleString(locale)}{c.admin_id ? ` · admin #${c.admin_id}` : ''}</span>
              {c.note && <p className="mt-0.5 text-gray-700 whitespace-pre-line">{c.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {codeApplicable && (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={issue} disabled={isPending} data-testid="callback-issue" className="w-fit rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-800 hover:bg-gray-50 disabled:opacity-50">
            {tr.claims_callback_issue}
          </button>
          {code && (
            <div className="rounded-lg border-2 border-slate-800 bg-slate-50 p-3" data-testid="callback-code-box">
              <p className="text-xs text-gray-600">{tr.claims_callback_code_label}</p>
              <p className="mt-1 text-3xl font-bold tracking-[0.3em] text-slate-900" dir="ltr" data-testid="callback-code">{code.code}</p>
              <p className="text-xs text-gray-500">{tr.claims_callback_code_valid.replace('{time}', new Date(code.expires_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }))}</p>
            </div>
          )}
        </div>
      )}

      {active && (
        <form onSubmit={record} className="flex flex-col gap-2 border-t border-gray-100 pt-3">
          <h3 className="font-medium text-gray-800">{tr.claims_callback_record}</h3>
          <label className="flex flex-col gap-1 text-gray-700">
            {tr.claims_callback_outcome}
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as 'reached' | 'not_reached')} className="w-fit rounded-lg border border-gray-300 px-3 py-2" data-testid="callback-outcome">
              <option value="reached">{tr.claims_callback_reached}</option>
              <option value="not_reached">{tr.claims_callback_not_reached}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-gray-700">
            {tr.claims_callback_note}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} className="rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <button type="submit" disabled={isPending} data-testid="callback-save" className="w-fit rounded-lg bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50">
            {tr.claims_callback_save}
          </button>
        </form>
      )}

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700" role="alert">{error}</p>}
    </div>
  )
}
