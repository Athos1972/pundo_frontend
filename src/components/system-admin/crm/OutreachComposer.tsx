'use client'
// ─── CRM outreach composer (F7600; org cut: recipient choice and send gate) ──────────────────────────────────────────
// The target of an outreach is the organisation, the addressee may be a person (Design §5). Recipients come from
// GET /admin/crm/orgs/{id}/outreach/recipients (org mails, mails of active relations, personal mails of persons with an
// active relation; suppressed, ended and opted-out ones are already left out by the backend). Preview and send carry
// `recipient_channel_id`.
// Send gate (EA9): the effective tier is the stricter of organisation and channel tier. If the chosen recipient needs an
// approval and has none, a warning box says "Legal tier {tier}: sending only after admin approval" and "Send" is
// disabled; with crm:send_approve an "Approve" dialog with a mandatory reason (10..500 characters) creates the approval
// (POST …/outreach/approve), one approval = one send, 7 days. Without the permission the box says who may approve.
// R3: the idempotency key is generated once per composer session (useRef) and only rotated after a successful send.

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPost } from './crmFetch'
import { crmPath } from './crmPaths'
import { TIER_BADGE, tierLabel } from './crmLabels'
import { NO_OUTREACH_STATES } from './transitions'
import type {
  CrmOrgDetail,
  CrmOutreachApproveRequest,
  CrmOutreachLang,
  CrmOutreachPreviewRequest,
  CrmOutreachPreviewResponse,
  CrmOutreachRecipient,
  CrmOutreachSendRequest,
  CrmOutreachSendResponse,
  CrmSendApprovalOut,
} from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface OutreachComposerProps {
  org: Pick<CrmOrgDetail, 'id' | 'lead'>
  recipients: CrmOutreachRecipient[]
  tr: SysAdminTranslations
  /** crm:send — preview and send */
  canSend: boolean
  /** crm:send_approve — approve a send despite the legal tier */
  canApprove: boolean
}

const LANGS: { code: CrmOutreachLang; label: string }[] = [
  { code: 'el', label: 'Ελληνικά' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
]

export const APPROVAL_REASON_MIN = 10
export const APPROVAL_REASON_MAX = 500

function generateKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** "Maria Georgiou · maria@b.test (relation)" / "info@a.test (organisation)". */
export function recipientLabel(tr: SysAdminTranslations, r: CrmOutreachRecipient): string {
  const name = r.person?.display_name ?? (r.person ? `#${r.person.id}` : '')
  const template = r.owner_type === 'org' ? tr.crm_recipient_label_org
    : r.owner_type === 'relation' ? tr.crm_recipient_label_relation : tr.crm_recipient_label_person
  const label = template.replace('{name}', name).replace('{value}', r.value)
  return r.is_default ? `${label} — ${tr.crm_recipient_default}` : label
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function OutreachComposer({ org, recipients, tr, canSend, canApprove }: OutreachComposerProps) {
  const router = useRouter()
  const recipientId = useId()
  const reasonId = useId()
  const [isLoadingPreview, startPreviewTransition] = useTransition()
  const [isSending, startSendTransition] = useTransition()
  const [isApproving, startApproveTransition] = useTransition()

  const initial = recipients.find((r) => r.is_default) ?? recipients[0] ?? null
  const [channelId, setChannelId] = useState<number | null>(initial?.channel_id ?? null)
  const [lang, setLang] = useState<CrmOutreachLang>('el')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [lastSentKey, setLastSentKey] = useState<string | null>(null)
  /** Approvals known in this session (from the approve answer or the gate of a preview), per recipient channel. */
  const [approvals, setApprovals] = useState<Record<number, CrmSendApprovalOut>>({})
  const [showApprove, setShowApprove] = useState(false)
  const [reason, setReason] = useState('')

  const idempotencyKeyRef = useRef<string>(generateKey())
  const [idempotencyKeyDisplay, setIdempotencyKeyDisplay] = useState<string>('')
  useEffect(() => { setIdempotencyKeyDisplay(idempotencyKeyRef.current) }, [])

  const selected = recipients.find((r) => r.channel_id === channelId) ?? null
  const approval = selected ? approvals[selected.channel_id] ?? null : null
  const approved = !!selected && (selected.approval_open || approval !== null)
  const gateBlocks = !!selected && selected.approval_required && !approved
  const stateBlocks = org.lead.state === null || NO_OUTREACH_STATES.includes(org.lead.state)
  const reasonLength = reason.trim().length
  const reasonOk = reasonLength >= APPROVAL_REASON_MIN && reasonLength <= APPROVAL_REASON_MAX

  function resetPreview() {
    setSubject('')
    setBody('')
    setPreviewLoaded(false)
  }

  function handleLangChange(next: CrmOutreachLang) {
    setLang(next)
    resetPreview()
  }

  function handleRecipientChange(value: string) {
    setChannelId(value ? Number(value) : null)
    resetPreview()
  }

  function handleLoadPreview() {
    startPreviewTransition(async () => {
      const payload: CrmOutreachPreviewRequest = { language: lang, template_id: 'first_contact_email', recipient_channel_id: channelId }
      const result = await crmPost<CrmOutreachPreviewResponse>(crmPath('outreachPreview', { org_id: org.id }), payload, tr)
      if (result.ok && result.data) {
        setSubject(result.data.subject)
        setBody(result.data.body_rendered)
        setPreviewLoaded(true)
        const gateApproval = result.data.gate.approval
        if (gateApproval?.channel_id != null) {
          const id = gateApproval.channel_id
          setApprovals((current) => ({ ...current, [id]: gateApproval }))
        }
      }
    })
  }

  function handleApprove() {
    if (!selected || !reasonOk) return
    const id = selected.channel_id
    startApproveTransition(async () => {
      const payload: CrmOutreachApproveRequest = { recipient_channel_id: id, reason: reason.trim() }
      const result = await crmPost<CrmSendApprovalOut>(crmPath('outreachApprove', { org_id: org.id }), payload, tr)
      if (result.ok && result.data) {
        const created = result.data
        setApprovals((current) => ({ ...current, [id]: created }))
        setShowApprove(false)
        setReason('')
        router.refresh()
      }
    })
  }

  function handleSend() {
    if (!selected || gateBlocks || !subject.trim() || !body.trim()) return
    const key = idempotencyKeyRef.current
    const id = selected.channel_id
    startSendTransition(async () => {
      const payload: CrmOutreachSendRequest = {
        language: lang,
        subject: subject.trim(),
        body: body.trim(),
        idempotency_key: key,
        recipient_channel_id: id,
      }
      const result = await crmPost<CrmOutreachSendResponse>(crmPath('outreachSend', { org_id: org.id }), payload, tr)
      if (result.ok) {
        setLastSentKey(key)
        // One approval = one send: the used one is gone, the next send to a red recipient needs a new approval.
        setApprovals((current) => {
          const next = { ...current }
          delete next[id]
          return next
        })
        const newKey = generateKey()
        idempotencyKeyRef.current = newKey
        setIdempotencyKeyDisplay(newKey)
        router.refresh()
      }
    })
  }

  const busy = isLoadingPreview || isSending || isApproving
  const sendDisabled = !canSend || !selected || stateBlocks || gateBlocks || busy || !subject.trim() || !body.trim()

  return (
    <div className="flex flex-col gap-4">
      {recipients.length === 0 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          {tr.crm_outreach_no_recipient}
        </div>
      )}
      {stateBlocks && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700">
          {tr.crm_err_outreach_state}
        </div>
      )}
      {!canSend && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700">
          {tr.crm_outreach_no_permission}
        </div>
      )}

      {/* Recipient with tier badge */}
      {recipients.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor={recipientId} className="text-sm font-medium text-gray-700">{tr.crm_outreach_recipient}</label>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              id={recipientId}
              value={channelId ?? ''}
              onChange={(e) => handleRecipientChange(e.target.value)}
              disabled={busy}
              className="flex-1 min-w-60 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50"
            >
              {recipients.map((r) => (
                <option key={r.channel_id} value={r.channel_id}>{recipientLabel(tr, r)}</option>
              ))}
            </select>
            {selected && (
              <span
                data-testid="crm-outreach-tier"
                className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${TIER_BADGE[selected.effective_tier] ?? ''}`}
              >
                {tr.crm_outreach_tier.replace('{tier}', tierLabel(tr, selected.effective_tier))}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Send gate */}
      {selected?.approval_required && (
        <div
          role={gateBlocks ? 'alert' : 'status'}
          data-testid="crm-outreach-gate"
          className={`flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm ${
            gateBlocks ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {gateBlocks ? (
            <>
              <p className="font-medium">{tr.crm_err_tier_approval_required.replace('{tier}', tierLabel(tr, selected.effective_tier))}</p>
              {canApprove ? (
                <button
                  type="button"
                  onClick={() => setShowApprove(true)}
                  disabled={busy}
                  className="self-start px-3 py-1.5 text-sm font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
                >
                  {tr.crm_outreach_approve}
                </button>
              ) : (
                <p>{tr.crm_outreach_approval_needs_permission}</p>
              )}
            </>
          ) : approval ? (
            <p>
              {tr.crm_outreach_approved
                .replace('{by}', approval.approved_by)
                .replace('{until}', formatDateTime(approval.expires_at))}
            </p>
          ) : (
            <p>{tr.crm_outreach_approval_open}</p>
          )}
        </div>
      )}

      {/* Approve dialog: mandatory reason */}
      {showApprove && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby={`${reasonId}-title`}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 flex flex-col gap-4">
            <h2 id={`${reasonId}-title`} className="text-sm font-semibold text-gray-800">{tr.crm_outreach_approve_title}</h2>
            <p className="text-sm text-gray-700">{recipientLabel(tr, selected)}</p>
            <p className="text-xs text-gray-500">{tr.crm_outreach_approve_intro}</p>
            <label htmlFor={reasonId} className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              {tr.crm_outreach_approve_reason}
              <textarea
                id={reasonId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={APPROVAL_REASON_MAX}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
              />
            </label>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowApprove(false); setReason('') }}
                disabled={isApproving}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={!reasonOk || isApproving}
                className="px-4 py-2 text-sm font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
              >
                {tr.crm_outreach_approve}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => handleLangChange(code)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              lang === code ? 'border-slate-800 text-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleLoadPreview}
          disabled={!canSend || busy}
          className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {isLoadingPreview ? '…' : tr.crm_composer_preview}
        </button>
        {previewLoaded && (
          <span className="text-xs text-green-600">{tr.crm_composer_preview_loaded} — {lang.toUpperCase()}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="outreach_subject" className="text-sm font-medium text-gray-700">{tr.crm_composer_subject}</label>
        <input
          id="outreach_subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isSending}
          placeholder={tr.crm_composer_subject}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="outreach_body" className="text-sm font-medium text-gray-700">{tr.crm_composer_body}</label>
        <textarea
          id="outreach_body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={isSending}
          rows={10}
          placeholder={tr.crm_composer_body}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={sendDisabled}
          className="px-5 py-2.5 text-sm font-medium bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? tr.crm_composer_sending : tr.crm_composer_send}
        </button>
        {lastSentKey !== null && <span className="text-xs text-gray-500 italic">{tr.crm_composer_already_sent}</span>}
      </div>

      {/* @i18n-allow-literal — Debug-Anzeige */}
      <p className="text-xs text-gray-300 font-mono break-all">
        key: {idempotencyKeyDisplay}
      </p>
    </div>
  )
}
