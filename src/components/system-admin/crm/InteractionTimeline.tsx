// ─── CRM Interaction Timeline (F7600) ─────────────────────────────────────────
// Server/UI component — read-only, chronological audit list.

import type { CrmInteractionOut, CrmMessageOut } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface InteractionTimelineProps {
  interactions: CrmInteractionOut[]
  messages: CrmMessageOut[]
  tr: SysAdminTranslations
}

function kindBadgeColor(kind: string): string {
  if (kind === 'state_change') return 'bg-blue-50 text-blue-700'
  if (kind === 'outbound_email' || kind === 'outbound_mail') return 'bg-indigo-50 text-indigo-700'
  if (kind === 'inbound') return 'bg-green-50 text-green-700'
  return 'bg-gray-100 text-gray-600'
}

function deliveryBadgeColor(status: string): string {
  if (status === 'sent' || status === 'delivered') return 'bg-green-50 text-green-700'
  if (status === 'failed') return 'bg-red-100 text-red-800'
  if (status === 'queued') return 'bg-yellow-50 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

export function InteractionTimeline({ interactions, messages, tr }: InteractionTimelineProps) {
  if (interactions.length === 0 && messages.length === 0) {
    return <p className="text-sm text-gray-400">{tr.no_items}</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {interactions.map((ia) => (
        <div
          key={`ia-${ia.id}`}
          className="flex gap-3 items-start bg-white rounded-lg border border-gray-100 px-4 py-3"
        >
          <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-2" />
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${kindBadgeColor(ia.kind)}`}>
                {ia.kind}
              </span>
              {ia.state_from && ia.state_to && (
                <span className="text-xs text-gray-500">
                  {ia.state_from} → {ia.state_to}
                </span>
              )}
              <span className="text-xs text-gray-400 ms-auto">
                {new Date(ia.created_at).toLocaleString()}
              </span>
            </div>
            {ia.outcome && (
              <p className="text-xs text-gray-600">{ia.outcome}</p>
            )}
            {ia.kind === 'contact_updated' && Array.isArray(ia.payload?.fields) && (
              <p className="text-xs text-gray-600">
                Geändert: {(ia.payload.fields as string[]).join(', ')}
              </p>
            )}
            {(ia.kind === 'channel_added' || ia.kind === 'channel_removed') && !!ia.payload?.channel_kind && (
              <p className="text-xs text-gray-600">
                {ia.kind === 'channel_added' ? '+' : '−'}{' '}
                {String(ia.payload.channel_kind)}
              </p>
            )}
            <p className="text-xs text-gray-400">
              {ia.actor_type}{ia.actor_id ? ` #${ia.actor_id}` : ''} · {ia.direction} · {ia.channel}
            </p>
          </div>
        </div>
      ))}

      {messages.map((msg) => (
        <div
          key={`msg-${msg.id}`}
          className="flex gap-3 items-start bg-indigo-50/30 rounded-lg border border-indigo-100 px-4 py-3"
        >
          <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2" />
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-indigo-700">email</span>
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${deliveryBadgeColor(msg.delivery_status)}`}>
                {msg.delivery_status}
              </span>
              {msg.language && (
                <span className="text-xs text-gray-500 uppercase">{msg.language}</span>
              )}
              <span className="text-xs text-gray-400 ms-auto">
                {new Date(msg.created_at).toLocaleString()}
              </span>
            </div>
            {msg.subject_rendered && (
              <p className="text-xs text-gray-700 font-medium">{msg.subject_rendered}</p>
            )}
            {msg.error_code && (
              <p className="text-xs text-red-600">Error: {msg.error_code}</p>
            )}
            <p className="text-xs text-gray-400">
              #{msg.id} · {msg.direction} · {msg.channel}
              {msg.retry_count > 0 ? ` · retries: ${msg.retry_count}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
