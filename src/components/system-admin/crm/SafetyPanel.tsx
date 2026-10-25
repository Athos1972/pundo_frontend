'use client'
// ─── CRM Safety Panel (N7600; F7600 CRM-Backbone org cut, T17) ───────────────────────────────────────────────────────
// Global outbound kill switch + send cap per channel; since the org cut also the owner rule on objection (E3, switch
// `owner_optout_rule`, default on) and the legal tiers that need an explicit admin approval before sending (EA9,
// `require_human_approval_for_tier`, default only red). Writes need crm:config:write (canWrite); PUT /config is a
// partial update, the panel sends all four values.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPut } from './crmFetch'
import { crmPath } from './crmPaths'
import { LEGAL_TIERS, tierLabel } from './crmLabels'
import { showToast } from '@/components/system-admin/Toast'
import type { CrmConfigOut, CrmConfigUpdateRequest, CrmLegalTier } from '@/types/system-admin'
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
  const [ownerRule, setOwnerRule] = useState(config.owner_optout_rule)
  const [approvalTiers, setApprovalTiers] = useState<CrmLegalTier[]>(config.require_human_approval_for_tier)

  const capValue = Number(cap)
  const capValid = Number.isInteger(capValue) && capValue >= 0 && capValue <= 1000

  function toggleTier(tier: CrmLegalTier, on: boolean) {
    setApprovalTiers((current) => LEGAL_TIERS.filter((entry) => (entry === tier ? on : current.includes(entry))))
  }

  function save() {
    const body: CrmConfigUpdateRequest = {
      outbound_kill_switch: paused,
      send_caps: { email: capValue },
      owner_optout_rule: ownerRule,
      require_human_approval_for_tier: LEGAL_TIERS.filter((tier) => approvalTiers.includes(tier)),
    }
    startTransition(async () => {
      const res = await crmPut<CrmConfigOut>(crmPath('configUpdate'), body, tr)
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

      <section className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-800">{tr.crm_owner_rule_title}</h2>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={ownerRule}
            disabled={!canWrite || isPending}
            onChange={(e) => setOwnerRule(e.target.checked)}
            aria-labelledby="crm-owner-rule-label"
            aria-describedby="crm-owner-rule-state"
            className="mt-1 h-4 w-4"
          />
          <span className="flex flex-col gap-1">
            <span id="crm-owner-rule-label" className="text-sm text-gray-900">{tr.crm_owner_rule_label}</span>
            <span id="crm-owner-rule-state" className={`text-sm ${ownerRule ? 'text-green-700' : 'text-amber-800 font-medium'}`}>
              {ownerRule ? tr.crm_owner_rule_on : tr.crm_owner_rule_off}
            </span>
          </span>
        </label>
        <p className="text-xs text-gray-500">{tr.crm_owner_rule_help}</p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-gray-800">{tr.crm_approval_tiers_title}</legend>
          <div className="flex flex-wrap gap-4">
            {LEGAL_TIERS.map((tier) => (
              <label key={tier} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={approvalTiers.includes(tier)}
                  disabled={!canWrite || isPending}
                  onChange={(e) => toggleTier(tier, e.target.checked)}
                  className="h-4 w-4"
                />
                {tierLabel(tr, tier)}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-xs text-gray-500">{tr.crm_approval_tiers_help}</p>
        {approvalTiers.length === 0 && (
          <p className="text-xs font-medium text-amber-800" role="status">{tr.crm_approval_tiers_none}</p>
        )}
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
