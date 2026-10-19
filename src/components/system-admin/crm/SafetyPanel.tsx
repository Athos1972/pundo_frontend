'use client'
// ─── CRM Safety Panel (N7600) ─────────────────────────────────────────────────
// Global outbound kill switch + send cap per channel. Writes need crm:config:write (canWrite).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPut } from './crmFetch'
import { showToast } from '@/components/system-admin/Toast'
import type { CrmConfigOut } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface SafetyPanelProps {
  config: CrmConfigOut
  canWrite: boolean
  tr: SysAdminTranslations
}

export function SafetyPanel({ config, canWrite, tr }: SafetyPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [paused, setPaused] = useState(config.outbound_kill_switch)
  const emailCap = config.send_caps.email
  const [cap, setCap] = useState(String(emailCap?.limit ?? 0))

  const capValue = Number(cap)
  const capValid = Number.isInteger(capValue) && capValue >= 0 && capValue <= 1000

  function save() {
    startTransition(async () => {
      const res = await crmPut<CrmConfigOut>(
        'crm/config',
        { outbound_kill_switch: paused, send_caps: { email: capValue } },
        tr,
      )
      if (res.ok) {
        showToast(tr.crm_safety_saved, 'success')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-600">{tr.crm_safety_intro}</p>

      <section
        className={`rounded-xl border p-5 ${paused ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}
      >
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={paused}
            disabled={!canWrite || isPending}
            onChange={(e) => setPaused(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-900">{tr.crm_kill_switch_label}</span>
            <span className={`text-sm ${paused ? 'text-red-700 font-medium' : 'text-green-700'}`}>
              {paused ? tr.crm_kill_switch_on : tr.crm_kill_switch_off}
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-800">{tr.crm_cap_title}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="cap-email" className="text-sm text-gray-700 w-20">
            {tr.crm_cap_email}
          </label>
          <input
            id="cap-email"
            type="number"
            min={0}
            max={1000}
            value={cap}
            disabled={!canWrite || isPending}
            onChange={(e) => setCap(e.target.value)}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
          />
          {emailCap && (
            <span className="text-xs text-gray-500">
              {emailCap.sent_24h} {tr.crm_cap_of} {emailCap.limit} {tr.crm_cap_used}
            </span>
          )}
        </div>
      </section>

      {canWrite ? (
        <div>
          <button
            type="button"
            onClick={save}
            disabled={isPending || !capValid}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {tr.crm_safety_save}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500">{tr.crm_safety_no_permission}</p>
      )}

      {config.updated_at && (
        <p className="text-xs text-gray-400">
          {tr.crm_safety_updated}: {new Date(config.updated_at).toLocaleString()}
          {config.updated_by ? ` · #${config.updated_by}` : ''}
        </p>
      )}
    </div>
  )
}
