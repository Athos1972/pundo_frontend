// ─── CRM interaction timeline (F7600; org cut: person and recipient per entry) ────────────────────────────────────────
// Server/UI component — read-only, chronological audit list of an organisation. Since the org cut every interaction may
// name the person/relation it concerns, and every message its recipient channel; the timeline shows "who at the customer"
// and "to whom" (person or organisation plus channel kind, no plain value needed; AC 14 traceability).

import type { CrmChannelOut, CrmInteractionOut, CrmMessageOut, CrmRelationOut } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { channelKindLabel } from './crmLabels'

interface InteractionTimelineProps {
  interactions: CrmInteractionOut[]
  messages: CrmMessageOut[]
  tr: SysAdminTranslations
  /** Relations of the organisation (active and ended): name of the person behind an entry or a recipient. */
  relations?: CrmRelationOut[]
  /** Channels of the organisation: recipient of a message sent to the organisation itself. */
  orgChannels?: CrmChannelOut[]
}

function kindBadgeColor(kind: string): string {
  if (kind === 'state_change') return 'bg-blue-50 text-blue-700'
  if (kind === 'outbound_email' || kind === 'outbound_mail' || kind === 'outbound_msg') return 'bg-indigo-50 text-indigo-700'
  if (kind === 'inbound' || kind === 'inbound_msg') return 'bg-green-50 text-green-700'
  return 'bg-gray-100 text-gray-600'
}

function deliveryBadgeColor(status: string): string {
  if (status === 'sent' || status === 'delivered') return 'bg-green-50 text-green-700'
  if (status === 'failed') return 'bg-red-100 text-red-800'
  if (status === 'queued') return 'bg-yellow-50 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

export function InteractionTimeline({ interactions, messages, tr, relations = [], orgChannels = [] }: InteractionTimelineProps) {
  if (interactions.length === 0 && messages.length === 0) {
    return <p className="text-sm text-gray-400">{tr.no_items}</p>
  }

  const personName = (personId: number | null, relationId: number | null): string | null => {
    const relation = relations.find((r) => (relationId !== null && r.id === relationId) || (relationId === null && r.person.id === personId))
    if (relation) return relation.person.display_name ?? `#${relation.person.id}`
    return personId !== null ? `#${personId}` : null
  }

  /** "To: <person or organisation> · <kind>"; a deleted channel is shown by its number. */
  const recipientText = (msg: CrmMessageOut): string | null => {
    if (msg.recipient_channel_id === null) return null
    const id = msg.recipient_channel_id
    const orgChannel = orgChannels.find((c) => c.id === id)
    if (orgChannel) {
      return tr.crm_timeline_recipient.replace('{who}', tr.crm_owner_org).replace('{kind}', channelKindLabel(tr, orgChannel.kind))
    }
    for (const relation of relations) {
      const channel = [...relation.channels, ...relation.person_channels].find((c) => c.id === id)
      if (channel) {
        return tr.crm_timeline_recipient
          .replace('{who}', relation.person.display_name ?? `#${relation.person.id}`)
          .replace('{kind}', channelKindLabel(tr, channel.kind))
      }
    }
    const who = personName(msg.person_id, msg.relation_id) ?? tr.crm_timeline_recipient_unknown.replace('{id}', String(id))
    return tr.crm_timeline_recipient.replace('{who}', who).replace('{kind}', channelKindLabel(tr, msg.channel))
  }

  return (
    <div className="flex flex-col gap-2">
      {interactions.map((ia) => {
        const who = ia.person_id !== null || ia.relation_id !== null ? personName(ia.person_id, ia.relation_id) : null
        return (
          <div key={`ia-${ia.id}`} className="flex gap-3 items-start bg-white rounded-lg border border-gray-100 px-4 py-3">
            <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-2" />
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${kindBadgeColor(ia.kind)}`}>
                  {ia.kind}
                </span>
                {ia.payload?.manual === true && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                    {tr.crm_doc_manual_badge}
                  </span>
                )}
                {ia.state_from && ia.state_to && (
                  <span className="text-xs text-gray-500">{ia.state_from} → {ia.state_to}</span>
                )}
                <span className="text-xs text-gray-400 ms-auto">{new Date(ia.created_at).toLocaleString()}</span>
              </div>
              {who && <p className="text-xs text-gray-700">{tr.crm_timeline_person.replace('{name}', who)}</p>}
              {ia.outcome && <p className="text-xs text-gray-600 whitespace-pre-wrap">{ia.outcome}</p>}
              {ia.payload?.manual === true && (!!ia.payload.our_party || !!ia.payload.their_party) && (
                <p className="text-xs text-gray-500">
                  {String(ia.payload.our_party ?? '—')} ↔ {String(ia.payload.their_party ?? '—')}
                </p>
              )}
              {(ia.kind === 'contact_updated' || ia.payload?.event === 'org_updated') && Array.isArray(ia.payload?.fields) && (
                <p className="text-xs text-gray-600">
                  {tr.crm_timeline_changed} {(ia.payload.fields as string[]).join(', ')}
                </p>
              )}
              {(ia.kind === 'channel_added' || ia.kind === 'channel_removed') && !!ia.payload?.channel_kind && (
                <p className="text-xs text-gray-600">
                  {ia.kind === 'channel_added' ? '+' : '−'} {channelKindLabel(tr, String(ia.payload.channel_kind))}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {ia.actor_type}{ia.actor_id ? ` #${ia.actor_id}` : ''} · {ia.direction} · {ia.channel}
              </p>
            </div>
          </div>
        )
      })}

      {messages.map((msg) => {
        const recipient = recipientText(msg)
        return (
          <div key={`msg-${msg.id}`} className="flex gap-3 items-start bg-indigo-50/30 rounded-lg border border-indigo-100 px-4 py-3">
            <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2" />
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-indigo-700">{channelKindLabel(tr, msg.channel)}</span>
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${deliveryBadgeColor(msg.delivery_status)}`}>
                  {msg.delivery_status}
                </span>
                {msg.language && <span className="text-xs text-gray-500 uppercase">{msg.language}</span>}
                <span className="text-xs text-gray-400 ms-auto">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              {recipient && <p className="text-xs text-gray-700" data-testid={`crm-message-recipient-${msg.id}`}>{recipient}</p>}
              {msg.subject_rendered && <p className="text-xs text-gray-700 font-medium">{msg.subject_rendered}</p>}
              {msg.error_code && <p className="text-xs text-red-600">{tr.crm_timeline_error} {msg.error_code}</p>}
              <p className="text-xs text-gray-400">
                #{msg.id} · {msg.direction} · {msg.channel}
                {msg.retry_count > 0 ? ` · retries: ${msg.retry_count}` : ''}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
