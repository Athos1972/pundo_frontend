'use client'
// F5970 — manual owner assignment (POST /admin/shops/{id}/assign-owner): owner search, reason, and the follow-up
// options the backend asks for (409 shop_has_owner -> replace, 409 owner_has_other_shop -> deactivate the duplicate).
// Only imports from src/components/ui/ and system-admin code (Clean Boundary).

import { useState, useTransition } from 'react'
import type { SysAdminShopOwner, SysAdminAssignOwnerPayload, SysAdminAssignOwnerResult, PaginatedResponse } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { adminCall, adminClaimErrorMessage } from './claims/adminClaimApi'
import { showToast } from './Toast'

interface Props {
  tr: SysAdminTranslations
  /** Candidate shops (one fixed shop in the shop editor, several in the matching tab). */
  shops: Array<{ id: number; name: string }>
  /** Matching check that the assignment resolves (optional). */
  checkId?: number
  onClose: () => void
  onDone: (result: SysAdminAssignOwnerResult) => void
}

type Need = { replace: boolean; other: { shop_id: number; shop_name: string } | null }

export function AssignOwnerDialog({ tr, shops, checkId, onClose, onDone }: Props) {
  const [shopId, setShopId] = useState<number>(shops[0]?.id ?? 0)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SysAdminShopOwner[] | null>(null)
  const [selected, setSelected] = useState<SysAdminShopOwner | null>(null)
  const [approve, setApprove] = useState(true)
  const [replace, setReplace] = useState(false)
  const [deactivate, setDeactivate] = useState(false)
  const [notifyPrevious, setNotifyPrevious] = useState(true)
  const [reason, setReason] = useState('')
  const [need, setNeed] = useState<Need>({ replace: false, other: null })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function search(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim()) return
    startTransition(async () => {
      const res = await adminCall<PaginatedResponse<SysAdminShopOwner>>(`shop-owners?q=${encodeURIComponent(query.trim())}&limit=10`, 'GET')
      setResults(res.ok ? res.data.items : [])
    })
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !shopId) return
    if (reason.trim().length < 3) { setError(tr.claims_err_reason_required); return }
    setError(null)
    const payload: SysAdminAssignOwnerPayload = {
      shop_owner_id: selected.id,
      reason: reason.trim(),
      approve_owner: approve,
      replace_existing_owner: replace,
      deactivate_previous_shop_of_owner: deactivate,
      notify_previous_owner: notifyPrevious,
      ...(checkId ? { shop_claim_check_id: checkId } : {}),
    }
    startTransition(async () => {
      const res = await adminCall<SysAdminAssignOwnerResult>(`shops/${shopId}/assign-owner`, 'POST', payload)
      if (res.ok) {
        showToast(tr.assign_done.replace('{n}', String(res.data.offers_flagged_count)), 'success')
        onDone(res.data)
        return
      }
      if (res.code === 'shop_has_owner') setNeed((n) => ({ ...n, replace: true }))
      else if (res.code === 'owner_has_other_shop') {
        setNeed((n) => ({ ...n, other: { shop_id: Number(res.extra.shop_id), shop_name: String(res.extra.shop_name ?? '') } }))
      }
      setError(adminClaimErrorMessage(res, tr))
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="assign-owner-title">
      <form onSubmit={submit} className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl" data-testid="assign-owner-dialog">
        <h2 id="assign-owner-title" className="text-lg font-semibold text-gray-900">{tr.assign_title}</h2>

        {shops.length > 1 && (
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            {tr.assign_shop_label}
            <select value={shopId} onChange={(e) => setShopId(Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {shops.map((s) => <option key={s.id} value={s.id}>#{s.id} {s.name}</option>)}
            </select>
          </label>
        )}
        {shops.length === 1 && <p className="text-sm text-gray-600">#{shops[0].id} {shops[0].name}</p>}

        <div className="flex flex-col gap-2">
          <label htmlFor="assign-owner-search" className="text-sm font-medium text-gray-700">{tr.assign_search}</label>
          <div className="flex gap-2">
            <input
              id="assign-owner-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search(e) }}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button type="button" onClick={() => search()} disabled={isPending} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              {tr.assign_search_btn}
            </button>
          </div>
          {results !== null && results.length === 0 && <p className="text-sm text-gray-400">{tr.assign_results_none}</p>}
          {results !== null && results.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200" data-testid="assign-owner-results">
              {results.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900">{o.email}</span>
                    <span className="block text-xs text-gray-500">{o.name} · {o.status}{o.shop_id ? ` · shop #${o.shop_id}` : ''}</span>
                  </span>
                  <button type="button" onClick={() => { setSelected(o); setNeed({ replace: false, other: null }); setReplace(false); setDeactivate(false); setError(null) }} className="shrink-0 rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700">
                    {tr.assign_pick}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm" data-testid="assign-owner-selected">
            <p><span className="text-gray-500">{tr.assign_selected}:</span> <strong>{selected.email}</strong> ({selected.status})</p>
            <label className="flex items-center gap-2 text-gray-700">
              <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} />
              {tr.assign_approve}
            </label>

            {need.other && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900" data-testid="assign-need-other">
                <p>{tr.assign_other_shop_text.replace('{shop}', need.other.shop_name).replace('{id}', String(need.other.shop_id))}</p>
                <label className="mt-2 flex items-start gap-2">
                  <input type="checkbox" checked={deactivate} onChange={(e) => setDeactivate(e.target.checked)} className="mt-0.5" data-testid="assign-deactivate" />
                  {tr.assign_deactivate_check}
                </label>
              </div>
            )}

            {need.replace && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900" data-testid="assign-need-replace">
                <p className="font-semibold">{tr.assign_replace_title}</p>
                <p className="mt-1">{tr.assign_replace_text}</p>
                <label className="mt-2 flex items-start gap-2">
                  <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="mt-0.5" data-testid="assign-replace" />
                  {tr.assign_replace_check}
                </label>
                {replace && (
                  <label className="mt-2 flex items-start gap-2">
                    <input type="checkbox" checked={notifyPrevious} onChange={(e) => setNotifyPrevious(e.target.checked)} className="mt-0.5" />
                    {tr.claims_notify_previous}
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          {tr.assign_reason}
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal" />
        </label>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {tr.claims_dialog_cancel}
          </button>
          <button type="submit" disabled={isPending || !selected} data-testid="assign-owner-submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40">
            {isPending ? '…' : tr.assign_submit}
          </button>
        </div>
      </form>
    </div>
  )
}
