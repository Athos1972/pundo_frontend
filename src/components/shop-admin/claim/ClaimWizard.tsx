'use client'
// F5970 — the claim application: confirm -> account (skipped when logged in) -> proof method + submit.
// Modes: `claim` (pick a proof method), `dispute` (document + call-back, the shop has an owner) and
// `document_only` (the shop offers no automatic proof). The access token of the created application goes to
// sessionStorage and the user to the status page; it never appears in a URL.
// Only imports from src/components/ui/ and shop-admin code (Clean Boundary).

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Lang } from '@/lib/lang'
import { isRTL } from '@/lib/lang'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'
import { createClaimRequest, saveClaimToken } from '@/lib/shop-admin-claim-client'
import { claimErrorMessage } from '@/lib/shop-admin-claim-errors'
import { loadDraft } from '@/lib/onboarding/draftStorage'
import { TurnstileWidget } from '@/components/ui/TurnstileWidget'
import type { ClaimProofMethod, ClaimShopInfo } from '@/types/shop-admin'
import { ClaimShopSummary } from './ClaimShopSummary'
import { ClaimAccountStep, type ClaimAccountValues } from './ClaimAccountStep'
import { ClaimProofMethodPicker, selectableMethods } from './ClaimProofMethodPicker'
import { ClaimDocumentUpload } from './ClaimDocumentUpload'

type Step = 'confirm' | 'account' | 'method'

/** Backend codes that belong to the account step (the user must fix them there). */
const ACCOUNT_ERROR_CODES = new Set([
  'invalid_credentials', 'claim_account_required', 'claim_name_required', 'claim_password_invalid',
])

interface Props {
  lang: Lang
  info: ClaimShopInfo
  /** `onboarding` when the user came from the shop wizard (prefills the e-mail from the draft, AR21). */
  from?: string | null
}

const SUPPORT_MAIL = 'mailto:support@pundo.cy'

export function ClaimWizard({ lang, info, from }: Props) {
  const tr = tShopAdminClaim(lang)
  const rtl = isRTL(lang)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const viewer = info.viewer
  const loggedIn = viewer !== null
  const isDispute = info.mode === 'dispute'
  const documentOnly = info.mode !== 'claim'

  const [step, setStep] = useState<Step>('confirm')
  const [ownerConfirmed, setOwnerConfirmed] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [account, setAccount] = useState<ClaimAccountValues>({ name: '', email: '', password: '' })
  const [accountError, setAccountError] = useState<string | null>(null)
  const [method, setMethod] = useState<ClaimProofMethod | null>(documentOnly ? 'document' : null)
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [callbackAck, setCallbackAck] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [captchaBroken, setCaptchaBroken] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitTried, setSubmitTried] = useState(false)

  // Prefill from the wizard draft (AR21: the business e-mail; the person's name is not part of the draft).
  useEffect(() => {
    if (from !== 'onboarding' || loggedIn) return
    const email = loadDraft()?.contact?.businessEmail
    if (email) startTransition(() => setAccount((a) => (a.email ? a : { ...a, email })))
  }, [from, loggedIn])

  const handleToken = useCallback((t: string) => { setToken(t); setCaptchaBroken(false) }, [])
  const handleCaptchaError = useCallback(() => setCaptchaBroken(true), [])

  const accountEmail = loggedIn ? viewer.email : account.email
  const visibleMethods = selectableMethods(info.methods, accountEmail)
  const totalSteps = loggedIn ? 2 : 3
  const stepNumber = step === 'confirm' ? 1 : step === 'account' ? 2 : totalSteps

  // ── blocking states ────────────────────────────────────────────────────────
  const supportLink = (
    <a href={SUPPORT_MAIL} className="text-accent underline">{tr.claim_contact_support}</a>
  )

  if (viewer?.has_shop) {
    return (
      <div className="flex flex-col gap-4" data-testid="claim-has-shop" dir={rtl ? 'rtl' : 'ltr'}>
        <ClaimShopSummary shop={info.shop} tr={tr} />
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          <p className="font-semibold">{tr.claim_has_shop_title}</p>
          <p className="mt-1">{tr.claim_has_shop_text_generic}</p>
          <p className="mt-2">{supportLink}</p>
        </div>
      </div>
    )
  }

  const noMethodPossible = info.methods.length === 0
  if (noMethodPossible) {
    return (
      <div className="flex flex-col gap-4" data-testid="claim-no-method" dir={rtl ? 'rtl' : 'ltr'}>
        <ClaimShopSummary shop={info.shop} tr={tr} />
        {!info.document_upload_available ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            <p className="font-semibold">{tr.claim_upload_disabled_title}</p>
            <p className="mt-1">{tr.claim_upload_disabled_text}</p>
            <p className="mt-2">{supportLink}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">{tr.claim_methods_none} {supportLink}</p>
        )}
      </div>
    )
  }

  // ── step handlers ──────────────────────────────────────────────────────────
  function toNextFromConfirm() {
    setConfirmTouched(true)
    if (!ownerConfirmed) return
    setError(null)
    setStep(loggedIn ? 'method' : 'account')
  }

  function handleAccount(values: ClaimAccountValues) {
    setAccount(values)
    setAccountError(null)
    // a method that depended on the previous e-mail may have disappeared
    setMethod((current) => (current && selectableMethods(info.methods, values.email).some((m) => m.method === current) ? current : documentOnly ? 'document' : null))
    setStep('method')
  }

  const effectiveMethod: ClaimProofMethod | null =
    method ?? (visibleMethods.length === 1 ? visibleMethods[0].method : null)
  const needsDocuments = effectiveMethod === 'document'
  const showMessage = isDispute || needsDocuments
  const documentsOk = !needsDocuments || files.length > 0
  const ackOk = !isDispute || callbackAck
  const canSubmit = !!effectiveMethod && documentsOk && ackOk && !!token && !isPending

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitTried(true)
    if (!effectiveMethod || !documentsOk || !ackOk || !token) return
    setError(null)

    const form = new FormData()
    form.set('shop_slug', info.shop.slug)
    form.set('source', from === 'onboarding' ? 'onboarding' : 'shop_page')
    form.set('proof_method', effectiveMethod)
    form.set('owner_confirmed', 'true')
    form.set('lang', lang)
    form.set('turnstile_token', token)
    if (isDispute) form.set('callback_ack', 'true')
    if (showMessage && message.trim()) form.set('message', message.trim())
    if (!loggedIn) {
      form.set('name', account.name)
      form.set('email', account.email)
      form.set('password', account.password)
    }
    if (needsDocuments) for (const file of files) form.append('files', file)

    startTransition(async () => {
      try {
        const created = await createClaimRequest(form)
        saveClaimToken(created.claim_request_id, created.access_token)
        const qs = new URLSearchParams({ id: String(created.claim_request_id) })
        if (created.existing) qs.set('existing', '1')
        router.push(`/shop-admin/claim/status?${qs.toString()}`)
      } catch (err) {
        const code = (err as { code?: string }).code ?? ''
        const text = claimErrorMessage(err, tr, lang)
        if (ACCOUNT_ERROR_CODES.has(code)) {
          setAccountError(text)
          setStep('account')
        } else {
          setError(text)
        }
        // the Turnstile token is single-use: whatever failed, the next attempt needs a fresh one
        setToken(null)
        setCaptchaResetKey((k) => k + 1)
      }
    })
  }

  const intro = isDispute ? tr.claim_intro_dispute : info.mode === 'document_only' ? tr.claim_intro_document_only : tr.claim_intro_claim

  return (
    <div className="flex flex-col gap-5" dir={rtl ? 'rtl' : 'ltr'} data-testid="claim-wizard">
      <p className="text-xs text-gray-400" aria-live="polite">
        {tr.claim_step_progress.replace('{step}', String(stepNumber)).replace('{total}', String(totalSteps))}
      </p>

      {step === 'confirm' && (
        <div className="flex flex-col gap-4" data-testid="claim-step-confirm">
          <ClaimShopSummary shop={info.shop} tr={tr} />
          <p className="text-sm text-gray-700">{intro}</p>
          {loggedIn && <p className="text-xs text-gray-500">{tr.claim_logged_in_as.replace('{email}', viewer.email)}</p>}
          <label className="flex items-start gap-3 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={ownerConfirmed}
              onChange={(e) => setOwnerConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4"
              data-testid="claim-owner-confirm"
            />
            <span>{tr.claim_owner_confirm_label}</span>
          </label>
          {confirmTouched && !ownerConfirmed && (
            <p className="text-xs text-red-600" role="alert">{tr.claim_owner_confirm_required}</p>
          )}
          <button
            type="button"
            onClick={toNextFromConfirm}
            className="rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            {tr.claim_continue}
          </button>
        </div>
      )}

      {step === 'account' && (
        <ClaimAccountStep
          tr={tr}
          initial={{ name: account.name, email: account.email }}
          error={accountError}
          onNext={handleAccount}
          onBack={() => setStep('confirm')}
        />
      )}

      {step === 'method' && (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4" data-testid="claim-step-method">
          <ClaimShopSummary shop={info.shop} tr={tr} />

          {!documentOnly && (
            <ClaimProofMethodPicker
              tr={tr}
              methods={info.methods}
              accountEmail={accountEmail}
              selected={effectiveMethod}
              onSelect={setMethod}
            />
          )}

          {needsDocuments && (
            <ClaimDocumentUpload
              tr={tr}
              lang={lang}
              files={files}
              onChange={setFiles}
              maxFiles={info.limits.max_files}
              maxBytes={info.limits.max_file_bytes}
            />
          )}
          {submitTried && !documentsOk && <p className="text-xs text-red-600" role="alert">{tr.claim_upload_required}</p>}

          {showMessage && (
            <div className="flex flex-col gap-1">
              <label htmlFor="claim-message" className="text-sm font-medium text-gray-700">
                {isDispute ? tr.claim_message_label_dispute : tr.claim_message_label}
              </label>
              <textarea
                id="claim-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, info.limits.message_max_chars))}
                maxLength={info.limits.message_max_chars}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-end text-xs text-gray-400">{message.length} / {info.limits.message_max_chars}</p>
            </div>
          )}

          {isDispute && (
            <label className="flex items-start gap-3 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={callbackAck}
                onChange={(e) => setCallbackAck(e.target.checked)}
                className="mt-0.5 h-4 w-4"
                data-testid="claim-callback-ack"
              />
              <span>{tr.claim_callback_ack_label}</span>
            </label>
          )}
          {submitTried && isDispute && !callbackAck && (
            <p className="text-xs text-red-600" role="alert">{tr.claim_callback_ack_missing}</p>
          )}

          <TurnstileWidget onToken={handleToken} onError={handleCaptchaError} loadingText={tr.claim_turnstile_loading} resetKey={captchaResetKey} />
          {captchaBroken && <p className="text-xs text-red-600" role="alert">{tr.claim_err_captcha}</p>}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(loggedIn ? 'confirm' : 'account')}
              className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {tr.claim_back}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
              data-testid="claim-submit"
            >
              {isPending ? tr.claim_submitting : tr.claim_submit}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
