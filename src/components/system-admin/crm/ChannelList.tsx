// ─── CRM Channel List (F7600) ──────────────────────────────────────────────────
// Server/UI component — pure display.

import type { CrmChannelOut } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface ChannelListProps {
  channels: CrmChannelOut[]
  tr: SysAdminTranslations
}

function consentBadge(state: string): string {
  if (state === 'opted_in' || state === 'consent') return 'bg-green-50 text-green-700'
  if (state === 'optout' || state === 'hard_optout') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-600'
}

function reachableBadge(state: string): string {
  if (state === 'yes' || state === 'reachable') return 'bg-green-50 text-green-700'
  if (state === 'no' || state === 'unreachable') return 'bg-red-50 text-red-700'
  return 'bg-yellow-50 text-yellow-700'
}

export function ChannelList({ channels, tr }: ChannelListProps) {
  if (channels.length === 0) {
    return <p className="text-sm text-gray-400">{tr.no_items}</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Kind</th>
            <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Value</th>
            <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Consent</th>
            <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Reachable</th>
            <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Preferred</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((ch) => (
            <tr key={ch.id} className="border-b border-gray-100 last:border-0">
              <td className="px-3 py-2 font-mono text-xs text-gray-700">{ch.kind}</td>
              <td className="px-3 py-2 font-mono text-xs text-gray-800">{ch.value_normalized}</td>
              <td className="px-3 py-2">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${consentBadge(ch.consent_state)}`}>
                  {ch.consent_state}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${reachableBadge(ch.reachable)}`}>
                  {ch.reachable}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">
                {ch.is_preferred ? '★' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
