'use client'
// ─── CRM Outreach Composer (F7600) ────────────────────────────────────────────
// Language tabs (EL/EN/RU), preview load, editable subject/body, send with stable idempotency_key.
// R3: idempotency_key is generated ONCE per composer mount (useRef), not per click.
// R7: Send button only enabled when an email channel exists.
// R4: 502 → Toast "delivery failed, retry possible". After success, generate new key.

import { useState, useTransition, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { crmPost } from './crmFetch'
import type {
  CrmOutreachLang,
  CrmOutreachPreviewResponse,
  CrmOutreachSendRequest,
  CrmOutreachSendResponse,
  CrmContactDetail,
} from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface OutreachComposerProps {
  contact: CrmContactDetail
  tr: SysAdminTranslations
}

const LANGS: { code: CrmOutreachLang; label: string }[] = [
  { code: 'el', label: 'Ελληνικά' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
]

function generateKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function OutreachComposer({ contact, tr }: OutreachComposerProps) {
  const router = useRouter()
  const [isLoadingPreview, startPreviewTransition] = useTransition()
  const [isSending, startSendTransition] = useTransition()

  const [lang, setLang] = useState<CrmOutreachLang>('el')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [lastSentKey, setLastSentKey] = useState<string | null>(null)

  // Stable idempotency key — R3: one key per composer session.
  // Stored in a ref so mutations don't trigger re-render during send.
  // idempotencyKeyDisplay mirrors the ref and is updated only after successful send.
  const idempotencyKeyRef = useRef<string>(generateKey())
  const [idempotencyKeyDisplay, setIdempotencyKeyDisplay] = useState<string>('')

  useEffect(() => {
    setIdempotencyKeyDisplay(idempotencyKeyRef.current)
  }, [])

  const hasEmailChannel = contact.channels.some((ch) => ch.kind === 'email')

  function handleLangChange(newLang: CrmOutreachLang) {
    setLang(newLang)
    // Reset preview when switching language — user must reload
    setSubject('')
    setBody('')
    setPreviewLoaded(false)
  }

  const handleLoadPreview = useCallback(() => {
    startPreviewTransition(async () => {
      const result = await crmPost<CrmOutreachPreviewResponse>(
        `crm/contacts/${contact.id}/outreach/preview`,
        { language: lang, template_id: 'first_contact_email' },
        tr,
      )
      if (result.ok && result.data) {
        setSubject(result.data.subject)
        setBody(result.data.body_rendered)
        setPreviewLoaded(true)
      }
    })
  }, [contact.id, lang, tr])

  function handleSend() {
    if (!hasEmailChannel || !subject.trim() || !body.trim()) return

    const key = idempotencyKeyRef.current
    startSendTransition(async () => {
      const payload: CrmOutreachSendRequest = {
        language: lang,
        subject: subject.trim(),
        body: body.trim(),
        idempotency_key: key,
      }
      const result = await crmPost<CrmOutreachSendResponse>(
        `crm/contacts/${contact.id}/outreach/send`,
        payload,
        tr,
      )
      if (result.ok) {
        setLastSentKey(key)
        // R3 / R4: generate new key so next compose session is fresh
        const newKey = generateKey()
        idempotencyKeyRef.current = newKey
        setIdempotencyKeyDisplay(newKey)
        router.refresh()
      }
    })
  }

  const isAlreadySent = lastSentKey !== null

  return (
    <div className="flex flex-col gap-4">
      {!hasEmailChannel && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          {tr.crm_err_no_email}
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
              lang === code
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Preview load button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleLoadPreview}
          disabled={isLoadingPreview || isSending}
          className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200
            transition-colors disabled:opacity-50"
        >
          {isLoadingPreview ? '…' : tr.crm_composer_preview}
        </button>
        {previewLoaded && (
          <span className="text-xs text-green-600">
            Preview loaded — {lang.toUpperCase()}
          </span>
        )}
      </div>

      {/* Editable subject */}
      <div className="flex flex-col gap-1">
        <label htmlFor="outreach_subject" className="text-sm font-medium text-gray-700">
          {tr.crm_composer_subject}
        </label>
        <input
          id="outreach_subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isSending}
          placeholder={tr.crm_composer_subject}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50"
        />
      </div>

      {/* Editable body */}
      <div className="flex flex-col gap-1">
        <label htmlFor="outreach_body" className="text-sm font-medium text-gray-700">
          {tr.crm_composer_body}
        </label>
        <textarea
          id="outreach_body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={isSending}
          rows={10}
          placeholder={tr.crm_composer_body}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50"
        />
      </div>

      {/* Send button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={!hasEmailChannel || isSending || isLoadingPreview || !subject.trim() || !body.trim()}
          className="px-5 py-2.5 text-sm font-medium bg-indigo-700 text-white rounded-lg hover:bg-indigo-800
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? tr.crm_composer_sending : tr.crm_composer_send}
        </button>
        {isAlreadySent && (
          <span className="text-xs text-gray-500 italic">{tr.crm_composer_already_sent}</span>
        )}
      </div>

      {/* Debug: idempotency key (subtle, for admin awareness) */}
      <p className="text-xs text-gray-300 font-mono break-all">
        key: {idempotencyKeyDisplay}
      </p>
    </div>
  )
}
