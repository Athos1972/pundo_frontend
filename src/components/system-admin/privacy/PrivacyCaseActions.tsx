'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

type PrivacyAction = 'preview' | 'generate-export' | 'release-export' | 'close' | 'extend' | 'decline' | 'correct' | 'send-response' | 'send-no-data' | 'execute-erasure'
type PrivacyRight = 'access' | 'export' | 'erasure' | 'correction'

// Keep this table aligned with ingestor/api/admin/privacy.py::_require_right.
const ACTIONS_BY_RIGHT: Record<PrivacyRight, readonly PrivacyAction[]> = {
  access: ['generate-export', 'release-export', 'extend', 'decline', 'send-response', 'send-no-data', 'close'],
  export: ['generate-export', 'release-export', 'extend', 'decline', 'send-response', 'send-no-data', 'close'],
  erasure: ['preview', 'extend', 'decline', 'send-response', 'execute-erasure', 'close'],
  correction: ['extend', 'decline', 'correct', 'send-response', 'close'],
}

interface PrivacyCaseActionsProps {
  caseId: string
  tr: SysAdminTranslations
  right: string
  status: string
  canWrite: boolean
  canExecuteErasure: boolean
  canExtend: boolean
}

function allowedActions({ right, status, canWrite, canExecuteErasure, canExtend }: Omit<PrivacyCaseActionsProps, 'caseId' | 'tr'>): PrivacyAction[] {
  if (!canWrite || status === 'closed' || status === 'rejected') return []
  const actions = ACTIONS_BY_RIGHT[right as PrivacyRight] ?? []
  return actions.filter(action =>
    (action !== 'execute-erasure' || canExecuteErasure) &&
    (action !== 'extend' || canExtend),
  )
}

export function PrivacyCaseActions(props: PrivacyCaseActionsProps) {
  const { caseId, tr } = props
  const router = useRouter()
  const actions = allowedActions(props)
  const [notice, setNotice] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [previewRevision, setPreviewRevision] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const hasAction = (action: PrivacyAction) => actions.includes(action)
  const needsReason = (['extend', 'decline', 'correct'] as PrivacyAction[]).some(hasAction)
  const needsMessage = (['correct', 'send-response'] as PrivacyAction[]).some(hasAction)
  const needsConfirmation = hasAction('execute-erasure')

  async function action(name: PrivacyAction) {
    const response = await fetch(`/api/admin/privacy-requests/${encodeURIComponent(caseId)}/${name}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: ['preview', 'generate-export', 'release-export'].includes(name) ? undefined : JSON.stringify({ reason, message, confirmed, preview_revision: previewRevision }),
    })
    if (response.ok && name === 'preview') {
      const data = await response.json() as { revision?: string }
      setPreviewRevision(data.revision ?? '')
    }
    setNotice(response.ok ? tr.privacy_case_saved : tr.privacy_case_error)
    if (response.ok) router.refresh()
  }

  if (actions.length === 0) return null

  const labels: Record<PrivacyAction, string> = {
    preview: tr.privacy_case_preview,
    'generate-export': tr.privacy_case_export,
    'release-export': tr.privacy_case_release,
    close: tr.privacy_case_close,
    extend: tr.privacy_case_extend,
    decline: tr.privacy_case_decline,
    correct: tr.privacy_case_correct,
    'send-response': tr.privacy_case_send,
    'send-no-data': tr.privacy_case_no_data,
    'execute-erasure': tr.privacy_case_erasure,
  }

  return <section className="flex flex-col gap-3" aria-label={tr.privacy_case_actions}>
    {needsReason ? <label className="flex flex-col gap-1 text-sm">{tr.privacy_case_reason}<input className="rounded border p-2" value={reason} onChange={event => setReason(event.target.value)} /></label> : null}
    {needsMessage ? <label className="flex flex-col gap-1 text-sm">{tr.privacy_case_message}<textarea className="rounded border p-2" value={message} onChange={event => setMessage(event.target.value)} /></label> : null}
    {needsConfirmation ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{tr.privacy_case_confirm}</label> : null}
    <div className="flex flex-wrap items-center gap-2">
      {actions.map(name => <button key={name} type="button" className={name === 'close' ? 'rounded bg-slate-800 px-3 py-2 text-sm text-white' : 'rounded border px-3 py-2 text-sm'} disabled={name === 'execute-erasure' && (!previewRevision || !confirmed)} onClick={() => void action(name)}>{labels[name]}</button>)}
    </div>
    <span role="status">{notice}</span>
  </section>
}
