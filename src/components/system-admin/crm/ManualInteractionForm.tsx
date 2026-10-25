'use client'
// ─── CRM manual contact documentation (N7600; org cut: "who at the customer" is a relation) ──────────────────────────
// Log a WhatsApp chat / phone call / note that happened outside the system. Append-only on the server
// (POST /admin/crm/orgs/{id}/interactions). The contact person is chosen from the active relations of the organisation
// (`relation_id`; the backend derives the person and answers 422 relation_not_in_org for a foreign one).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPost } from './crmFetch'
import { crmPath } from './crmPaths'
import { showToast } from '@/components/system-admin/Toast'
import type {
  CrmInteractionOut,
  CrmManualChannel,
  CrmManualInteractionRequest,
  CrmManualKind,
  CrmRelationOut,
} from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface ManualInteractionFormProps {
  orgId: number
  /** Relations of the organisation; only active ones are offered. */
  relations: CrmRelationOut[]
  tr: SysAdminTranslations
}

const KINDS: CrmManualKind[] = ['inbound_msg', 'outbound_msg', 'call', 'note']
const CHANNELS: CrmManualChannel[] = ['whatsapp', 'phone', 'email', 'telegram', 'sms']

/** Value for <input type="datetime-local"> in local time, e.g. "2026-10-19T14:30". */
function nowLocalInput(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const FIELD =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600'

export function ManualInteractionForm({ orgId, relations, tr }: ManualInteractionFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [kind, setKind] = useState<CrmManualKind>('inbound_msg')
  const [channel, setChannel] = useState<CrmManualChannel>('whatsapp')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [when, setWhen] = useState(nowLocalInput)
  const [content, setContent] = useState('')
  const [relationId, setRelationId] = useState('')
  const [ourParty, setOurParty] = useState('')
  const [theirParty, setTheirParty] = useState('')

  const activeRelations = relations.filter((r) => r.active)

  function onKindChange(next: CrmManualKind) {
    setKind(next)
    if (next === 'call') setChannel('phone')
    else if (channel === 'phone' && next !== 'note') setChannel('whatsapp')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const body: CrmManualInteractionRequest = {
      kind,
      channel,
      content: content.trim(),
      occurred_at: when ? new Date(when).toISOString() : undefined,
      our_party: ourParty.trim() || undefined,
      their_party: theirParty.trim() || undefined,
      relation_id: relationId ? Number(relationId) : undefined,
    }
    if (kind === 'call') body.direction = direction
    startTransition(async () => {
      const res = await crmPost<CrmInteractionOut>(crmPath('orgInteraction', { org_id: orgId }), body, tr)
      if (res.ok) {
        showToast(tr.crm_doc_saved, 'success')
        setContent('')
        setWhen(nowLocalInput())
        router.refresh()
      }
    })
  }

  const kindLabel = (k: CrmManualKind) => tr[`crm_doc_kind_${k}` as const]
  const channelLabel = (c: CrmManualChannel) => tr[`crm_doc_channel_${c}` as const]

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">{tr.crm_doc_intro}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {tr.crm_doc_kind}
          <select value={kind} onChange={(e) => onKindChange(e.target.value as CrmManualKind)} className={FIELD}>
            {KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {tr.crm_doc_channel}
          <select value={channel} onChange={(e) => setChannel(e.target.value as CrmManualChannel)} className={FIELD}>
            {CHANNELS.map((c) => <option key={c} value={c}>{channelLabel(c)}</option>)}
          </select>
        </label>
        {kind === 'call' && (
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            {tr.crm_doc_direction}
            <select value={direction} onChange={(e) => setDirection(e.target.value as 'in' | 'out')} className={FIELD}>
              <option value="in">{tr.crm_doc_direction_in}</option>
              <option value="out">{tr.crm_doc_direction_out}</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {tr.crm_doc_when}
          <input type="datetime-local" value={when} max={nowLocalInput()} onChange={(e) => setWhen(e.target.value)} className={FIELD} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {tr.crm_doc_content}
        <textarea value={content} onChange={(e) => setContent(e.target.value)} required maxLength={4000} rows={4} className={FIELD} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {tr.crm_doc_relation}
          <select value={relationId} onChange={(e) => setRelationId(e.target.value)} className={FIELD}>
            <option value="">{tr.crm_doc_relation_none}</option>
            {activeRelations.map((r) => (
              <option key={r.id} value={r.id}>{r.person.display_name ?? `#${r.person.id}`}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {tr.crm_doc_their_party}
          <input value={theirParty} onChange={(e) => setTheirParty(e.target.value)} maxLength={120} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {tr.crm_doc_our_party}
          <input value={ourParty} onChange={(e) => setOurParty(e.target.value)} maxLength={120} className={FIELD} />
        </label>
      </div>
      <div>
        <button
          type="submit"
          disabled={isPending || content.trim() === ''}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {tr.crm_doc_submit}
        </button>
      </div>
    </form>
  )
}
