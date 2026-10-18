'use client'
// F5970 — status page of an application (no login). The access token comes from the e-mail link (`?t=`), is
// moved to sessionStorage and removed from the URL at once; afterwards it only travels in the X-Claim-Token header.
// Only imports from src/components/ui/ and shop-admin code (Clean Boundary).

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Lang } from '@/lib/lang'
import { isRTL } from '@/lib/lang'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'
import {
  ClaimApiError, clearClaimToken, getClaimStatus, loadClaimToken, saveClaimToken, sendClaimCode,
  verifyClaimCode, withdrawClaim,
} from '@/lib/shop-admin-claim-client'
import { claimErrorMessage } from '@/lib/shop-admin-claim-errors'
import type { ClaimStatusResponse } from '@/types/shop-admin'
import { ClaimCodeEntry } from './ClaimCodeEntry'

interface Props {
  lang: Lang
  claimId: number | null
}

type Phase = 'loading' | 'ready' | 'no_token' | 'not_found' | 'error'

export function ClaimStatusView({ lang, claimId }: Props) {
  const tr = tShopAdminClaim(lang)
  const rtl = isRTL(lang)
  const router = useRouter()
  const params = useSearchParams()
  const existingNotice = params.get('existing') === '1'
  const urlToken = params.get('t')

  const tokenRef = useRef<string | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [status, setStatus] = useState<ClaimStatusResponse | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [busy, startTransition] = useTransition()

  const load = useCallback(async () => {
    if (claimId === null || !tokenRef.current) return
    try {
      setStatus(await getClaimStatus(claimId, tokenRef.current))
      setPhase('ready')
    } catch (err) {
      if (err instanceof ClaimApiError && err.code === 'claim_not_found') {
        clearClaimToken(claimId)
        setPhase('not_found')
      } else {
        setPageError(claimErrorMessage(err, tr, lang))
        setPhase('error')
      }
    }
  }, [claimId, tr, lang])

  // Take over the token once: URL -> sessionStorage, then clean the URL (Access-Log risk stays at the first request).
  useEffect(() => {
    if (claimId === null) return
    if (urlToken) {
      saveClaimToken(claimId, urlToken)
      tokenRef.current = urlToken
      router.replace(`/shop-admin/claim/status?id=${claimId}`)
    } else {
      tokenRef.current = loadClaimToken(claimId)
    }
    if (!tokenRef.current) {
      startTransition(() => setPhase('no_token'))
      return
    }
    startTransition(() => { void load() })
    // runs once per application on purpose (the token is taken over exactly once)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId])

  function act(run: (id: number, token: string) => Promise<ClaimStatusResponse>) {
    if (claimId === null || !tokenRef.current) return
    setActionError(null)
    startTransition(async () => {
      try {
        setStatus(await run(claimId, tokenRef.current as string))
      } catch (err) {
        setActionError(claimErrorMessage(err, tr, lang))
        await load() // attempts / resend budget changed on the server
      }
    })
  }

  const wrap = (children: React.ReactNode) => (
    <div className="flex flex-col gap-4" dir={rtl ? 'rtl' : 'ltr'} data-testid="claim-status">{children}</div>
  )

  if (claimId === null || phase === 'no_token') {
    return wrap(
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
        <p className="font-semibold">{tr.claim_token_missing_title}</p>
        <p className="mt-1">{tr.claim_token_missing_text}</p>
      </div>,
    )
  }
  if (phase === 'loading') return wrap(<p className="text-sm text-gray-500">{tr.claim_loading}</p>)
  if (phase === 'not_found') {
    return wrap(<p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{tr.claim_err_not_found}</p>)
  }
  if (phase === 'error' || !status) {
    return wrap(
      <div className="flex flex-col gap-3">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{pageError ?? tr.claim_err_generic}</p>
        <button type="button" onClick={() => { setPhase('loading'); void load() }} className="w-fit rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {tr.claim_refresh}
        </button>
      </div>,
    )
  }

  const decided = status.status === 'accepted' || status.status === 'rejected'
  const subText = (): string => {
    switch (status.sub_state) {
      case 'awaiting_email_verification': return tr.claim_sub_awaiting_email_verification
      case 'awaiting_code': return tr.claim_sub_awaiting_code
      case 'awaiting_callback': return tr.claim_sub_awaiting_callback
      case 'callback_done_enter_code': return tr.claim_sub_callback_done
      case 'awaiting_review': return status.kind === 'dispute' ? tr.claim_sub_awaiting_review_dispute : tr.claim_sub_awaiting_review
      case 'decided':
        if (status.status === 'accepted') return tr.claim_sub_accepted
        return tr[`claim_rejected_${status.rejection_reason ?? 'other'}` as 'claim_rejected_other']
    }
  }
  const chipColor =
    status.status === 'accepted' ? 'bg-green-100 text-green-800'
    : status.status === 'rejected' ? 'bg-red-100 text-red-800'
    : status.status === 'verified' ? 'bg-blue-100 text-blue-800'
    : 'bg-amber-100 text-amber-800'

  return wrap(
    <>
      {existingNotice && <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800" role="status">{tr.claim_existing_notice}</p>}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-gray-400">{tr.claim_status_shop}</p>
          <p className="font-semibold text-gray-900 break-words" data-testid="claim-status-shop">{status.shop.name}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${chipColor}`} data-testid="claim-status-chip">
          {tr[`claim_status_label_${status.status}` as 'claim_status_label_open']}
        </span>
      </div>

      <p className="text-sm text-gray-700" data-testid="claim-sub-state">{subText()}</p>

      {status.sub_state === 'awaiting_code' && status.proof_method === 'shop_email_code' && (
        <ClaimCodeEntry
          tr={tr}
          code={status.code}
          purpose="shop_email"
          busy={busy}
          error={actionError}
          onSend={() => act(sendClaimCode)}
          onVerify={(code) => act((id, token) => verifyClaimCode(id, token, code))}
        />
      )}
      {status.sub_state === 'callback_done_enter_code' && (
        <ClaimCodeEntry
          tr={tr}
          code={status.code}
          purpose="callback"
          busy={busy}
          error={actionError}
          onSend={() => undefined}
          onVerify={(code) => act((id, token) => verifyClaimCode(id, token, code))}
        />
      )}
      {actionError && !['awaiting_code', 'callback_done_enter_code'].includes(status.sub_state) && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{actionError}</p>
      )}

      {status.status === 'accepted' && (
        <a href={status.login_url ?? '/shop-admin/login'} className="inline-flex w-fit rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-dark">
          {tr.claim_login}
        </a>
      )}
      {status.status === 'rejected' && (
        <a href={`/shop-admin/claim?shop=${encodeURIComponent(status.shop.slug)}`} className="inline-flex w-fit rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {tr.claim_new_application}
        </a>
      )}

      {status.documents.length > 0 && (
        <section aria-label={tr.claim_documents_title}>
          <h2 className="text-sm font-semibold text-gray-900">{tr.claim_documents_title}</h2>
          <ul className="mt-1 flex flex-col gap-1 text-sm text-gray-600">
            {status.documents.map((doc, i) => (
              <li key={`${doc.filename}-${i}`} className="flex justify-between gap-3">
                <span className="min-w-0 truncate" dir="auto">{doc.filename}</span>
                <span className="shrink-0 text-xs text-gray-400">{doc.deleted ? tr.claim_document_deleted : `${Math.max(1, Math.round(doc.size_bytes / 1024))} KB`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
        <button type="button" onClick={() => void load()} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
          {tr.claim_refresh}
        </button>
        {!decided && !confirmWithdraw && (
          <button type="button" onClick={() => setConfirmWithdraw(true)} className="text-sm font-medium text-red-600 hover:underline" data-testid="claim-withdraw">
            {tr.claim_withdraw}
          </button>
        )}
        {!decided && confirmWithdraw && (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-700">{tr.claim_withdraw_confirm}</span>
            <button type="button" onClick={() => { setConfirmWithdraw(false); act(withdrawClaim) }} disabled={busy} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-40" data-testid="claim-withdraw-yes">
              {tr.claim_withdraw_confirm_yes}
            </button>
            <button type="button" onClick={() => setConfirmWithdraw(false)} className="font-medium text-gray-600 hover:underline">
              {tr.claim_cancel}
            </button>
          </span>
        )}
      </div>
    </>,
  )
}
