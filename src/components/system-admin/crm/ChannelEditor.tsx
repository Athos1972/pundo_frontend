'use client'
// ─── CRM Channel Editor (F7600 Stufe 1) ──────────────────────────────────────
// Displays channels + Remove button per row + Add-channel inline form.
// Remove is disabled when only 1 channel remains (AK2c).
// Clean Boundary: no imports from customer-facing code.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPost, crmDelete } from './crmFetch'
import type { CrmContactDetail, CrmChannelOut, CrmChannelAddRequest, CrmChannelKindIn } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface ChannelEditorProps {
  contact: CrmContactDetail
  tr: SysAdminTranslations
  canWrite: boolean
}

function consentBadge(state: string): string {
  if (state === 'opted_in' || state === 'consent') return 'bg-gray-50 text-emerald-700'
  if (state === 'optout' || state === 'hard_optout') return 'bg-gray-50 text-rose-700'
  return 'bg-gray-50 text-gray-500'
}

function reachableBadge(state: string): string {
  if (state === 'yes' || state === 'reachable') return 'bg-gray-50 text-emerald-700'
  if (state === 'no' || state === 'unreachable') return 'bg-gray-50 text-rose-700'
  return 'bg-gray-50 text-gray-500'
}

export function ChannelEditor({ contact, tr, canWrite }: ChannelEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Add-channel form
  const [showAdd, setShowAdd] = useState(false)
  const [addKind, setAddKind] = useState<CrmChannelKindIn>('email')
  const [addValue, setAddValue] = useState('')

  const channels: CrmChannelOut[] = contact.channels

  function handleRemove(channelId: number) {
    startTransition(async () => {
      const result = await crmDelete<CrmContactDetail>(
        `crm/contacts/${contact.id}/channels/${channelId}`,
        tr,
      )
      if (result.ok) {
        router.refresh()
      }
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addValue.trim()) return

    startTransition(async () => {
      const body: CrmChannelAddRequest = {
        kind: addKind,
        value: addValue.trim(),
      }
      const result = await crmPost<CrmContactDetail>(
        `crm/contacts/${contact.id}/channels`,
        body,
        tr,
      )
      if (result.ok) {
        setShowAdd(false)
        setAddValue('')
        setAddKind('email')
        router.refresh()
      }
    })
  }

  if (channels.length === 0) {
    return <p className="text-sm text-gray-400">{tr.no_items}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Kind</th>
              <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Value</th>
              <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Consent</th>
              <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Reachable</th>
              <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Preferred</th>
              {canWrite && (
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500" />
              )}
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
                {canWrite && (
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleRemove(ch.id)}
                      disabled={isPending || channels.length <= 1}
                      title={channels.length <= 1 ? tr.crm_err_last_channel : tr.crm_channel_remove}
                      className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add channel */}
      {canWrite && (
        <div>
          {!showAdd ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              disabled={isPending}
              className="text-sm text-slate-600 hover:text-slate-800 font-medium underline underline-offset-2
                disabled:opacity-50"
            >
              + {tr.crm_channel_add}
            </button>
          ) : (
            <form onSubmit={handleAdd} className="flex items-end gap-2 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">{tr.crm_channel_kind}</label>
                <select
                  value={addKind}
                  onChange={(e) => setAddKind(e.target.value as CrmChannelKindIn)}
                  disabled={isPending}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none
                    focus:ring-2 focus:ring-slate-600 bg-white disabled:opacity-50"
                >
                  <option value="email">email</option>
                  <option value="phone">phone</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-40">
                <label className="text-xs font-medium text-gray-600">{tr.crm_channel_value}</label>
                <input
                  type="text"
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  disabled={isPending}
                  placeholder={addKind === 'email' ? 'name@example.com' : '+357 99…'}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none
                    focus:ring-2 focus:ring-slate-600 disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={isPending || !addValue.trim()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium
                  rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? tr.crm_channel_adding : tr.crm_channel_add}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setAddValue('') }}
                disabled={isPending}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg
                  hover:bg-gray-50 disabled:opacity-50"
              >
                {tr.cancel}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
