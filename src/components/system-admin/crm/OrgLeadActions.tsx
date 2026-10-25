'use client'
// ─── CRM lead actions of an organisation (F7600, org cut; replaces ContactDetailActions) ───────────────────────────────
// Works on the lead block of the organisation (`org.lead`, optimistic lock `lead_version`, 409 version_conflict):
//   - "make acquisition target" when the lead status is empty (null → SOURCED, EA8)
//   - confirm card (NEEDS_REVIEW → SOURCED, only with a card image at a source), reject as private
//   - confirm business (→ QUEUED), set status (transitions.ts mirrors lifecycle.py), mark as registered (shop id),
//     superadmin direct SOURCED → REGISTERED
//   - change legal tier of the organisation (POST /orgs/{id}/legal, EA9: the stricter of org and channel tier gates sends)
//   - suppress / opt-out (POST /orgs/{id}/suppress; also for an organisation without lead status)
// Permission gating: lifecycle actions and legal tier need crm:lifecycle:write, suppress/reject crm:suppress_override.

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/system-admin/ConfirmDialog'
import { crmPost } from './crmFetch'
import { crmPath } from './crmPaths'
import { crmCan } from './crmAccess'
import { LEGAL_TIERS, tierLabel } from './crmLabels'
import { leadStateLabel } from './LifecycleBadge'
import { SUPERADMIN_EXTRA_TRANSITIONS, allowedTransitions, isTerminalLeadState } from './transitions'
import type {
  CrmConfirmBusinessRequest,
  CrmLeadState,
  CrmLeadTransitionRequest,
  CrmLegalBasis,
  CrmLegalTier,
  CrmOrgDetail,
  CrmOrgLegalRequest,
  CrmSuppressRequest,
  SysAdminUser,
} from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface OrgLeadActionsProps {
  org: CrmOrgDetail
  tr: SysAdminTranslations
  me: SysAdminUser
}

const LEGAL_BASES: CrmLegalBasis[] = ['legitimate_interest', 'consent', 'contract', 'none']
/** States after which nothing but the legal tier can change (REGISTERED keeps "suppress" for its channels). */
const CLOSED: readonly CrmLeadState[] = ['HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD']

const BTN = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50'
const DIALOG_BOX = 'bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4'
const FIELD = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600'

export function OrgLeadActions({ org, tr, me }: OrgLeadActionsProps) {
  const router = useRouter()
  const ids = { state: useId(), shop: useId(), tier: useId(), basis: useId(), note: useId() }
  const [isPending, startTransition] = useTransition()

  const [showConfirmBusiness, setShowConfirmBusiness] = useState(false)
  const [showLifecycle, setShowLifecycle] = useState(false)
  const [selectedState, setSelectedState] = useState<CrmLeadState | ''>('')
  const [showRegister, setShowRegister] = useState(false)
  const [shopIdInput, setShopIdInput] = useState('')
  const [showSuppress, setShowSuppress] = useState(false)
  const [suppressReason, setSuppressReason] = useState<'hard_optout' | 'rejected_private'>('hard_optout')
  const [showLegal, setShowLegal] = useState(false)
  const [legalTier, setLegalTier] = useState<CrmLegalTier>(org.lead.effective_legal_tier)
  const [legalBasis, setLegalBasis] = useState<CrmLegalBasis>(org.lead.effective_legal_basis)
  const [legalNote, setLegalNote] = useState('')

  const state = org.lead.state
  const version = org.lead.version
  const allowed = allowedTransitions(state)
  const canLifecycle = crmCan(me, 'crm:lifecycle:write')
  const canSuppress = crmCan(me, 'crm:suppress_override')
  const closed = state !== null && CLOSED.includes(state)
  const hasCardImage = org.sources.some((s) => s.has_card_image.front)

  const superadminRegister =
    me.role === 'superadmin' && state !== null &&
    (SUPERADMIN_EXTRA_TRANSITIONS[state] ?? []).includes('REGISTERED') && !allowed.includes('REGISTERED')
  const setStateOptions = allowed.filter((s) => s !== 'REGISTERED')

  function run(path: string, body: unknown) {
    startTransition(async () => {
      const result = await crmPost<CrmOrgDetail>(path, body, tr)
      if (result.ok) router.refresh()
    })
  }

  const lead = (body: CrmLeadTransitionRequest) => run(crmPath('orgLead', { org_id: org.id }), body)
  const suppress = (reason: CrmSuppressRequest['reason']) =>
    run(crmPath('orgSuppress', { org_id: org.id }), { reason, lead_version: version } satisfies CrmSuppressRequest)

  function submitLifecycle() {
    if (!selectedState) return
    setShowLifecycle(false)
    lead({ to_state: selectedState, lead_version: version })
  }

  function submitRegister() {
    const shopId = parseInt(shopIdInput, 10)
    if (isNaN(shopId)) return
    setShowRegister(false)
    lead({ to_state: 'REGISTERED', lead_version: version, shop_id: shopId })
  }

  function submitLegal() {
    setShowLegal(false)
    const body: CrmOrgLegalRequest = {
      effective_legal_tier: legalTier,
      effective_legal_basis: legalBasis,
      lead_version: version,
      note: legalNote.trim() || null,
    }
    run(crmPath('orgLegal', { org_id: org.id }), body)
  }

  return (
    <>
      <ConfirmDialog
        open={showConfirmBusiness}
        message={`${tr.crm_action_confirm_business}? ${tr.crm_action_confirm_business_hint}`}
        confirmLabel={tr.crm_action_confirm_business}
        cancelLabel={tr.cancel}
        isPending={isPending}
        onConfirm={() => {
          setShowConfirmBusiness(false)
          run(crmPath('orgConfirmBusiness', { org_id: org.id }), {
            lead_version: version, legal_basis: 'legitimate_interest',
          } satisfies CrmConfirmBusinessRequest)
        }}
        onCancel={() => setShowConfirmBusiness(false)}
      />

      {showLifecycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby={ids.state}>
          <div className={DIALOG_BOX}>
            <h2 id={ids.state} className="text-sm font-semibold text-gray-800">{tr.crm_action_set_lifecycle}</h2>
            <select
              aria-label={tr.crm_col_lead_state}
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value as CrmLeadState)}
              className={FIELD}
            >
              <option value="">{tr.select_placeholder}</option>
              {setStateOptions.map((s) => <option key={s} value={s}>{leadStateLabel(tr, s)}</option>)}
            </select>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowLifecycle(false)} className={`${BTN} text-gray-600 border border-gray-300 hover:bg-gray-50`}>
                {tr.cancel}
              </button>
              <button type="button" onClick={submitLifecycle} disabled={!selectedState || isPending} className={`${BTN} bg-slate-800 text-white hover:bg-slate-700`}>
                {tr.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className={DIALOG_BOX}>
            <h2 className="text-sm font-semibold text-gray-800">{tr.crm_action_register}</h2>
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.shop} className="text-sm font-medium text-gray-700">{tr.crm_register_shop_id} *</label>
              <input id={ids.shop} type="number" min={1} value={shopIdInput} onChange={(e) => setShopIdInput(e.target.value)} className={FIELD} />
              <p className="text-xs text-gray-500">{tr.crm_register_shop_id_hint}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowRegister(false); setShopIdInput('') }} className={`${BTN} text-gray-600 border border-gray-300 hover:bg-gray-50`}>
                {tr.cancel}
              </button>
              <button type="button" onClick={submitRegister} disabled={!shopIdInput || isPending} className={`${BTN} bg-teal-700 text-white hover:bg-teal-800`}>
                {tr.crm_action_register}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuppress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className={DIALOG_BOX}>
            <h2 className="text-sm font-semibold text-gray-800">{tr.crm_action_suppress}</h2>
            <div className="flex flex-col gap-2">
              {(['hard_optout', 'rejected_private'] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="suppress_reason" value={r} checked={suppressReason === r} onChange={() => setSuppressReason(r)} />
                  {r === 'hard_optout' ? tr.crm_suppress_reason_hard_optout : tr.crm_suppress_reason_rejected_private}
                </label>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowSuppress(false)} className={`${BTN} text-gray-600 border border-gray-300 hover:bg-gray-50`}>
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={() => { setShowSuppress(false); suppress(suppressReason) }}
                disabled={isPending}
                className={`${BTN} text-rose-700 border border-rose-200 hover:bg-rose-50`}
              >
                {tr.crm_action_suppress}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLegal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby={`${ids.tier}-title`}>
          <div className={DIALOG_BOX}>
            <h2 id={`${ids.tier}-title`} className="text-sm font-semibold text-gray-800">{tr.crm_action_change_legal}</h2>
            <label htmlFor={ids.tier} className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              {tr.crm_detail_legal_tier}
              <select id={ids.tier} value={legalTier} onChange={(e) => setLegalTier(e.target.value as CrmLegalTier)} className={FIELD}>
                {LEGAL_TIERS.map((t) => <option key={t} value={t}>{tierLabel(tr, t)}</option>)}
              </select>
            </label>
            <label htmlFor={ids.basis} className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              {tr.crm_detail_legal_basis}
              <select id={ids.basis} value={legalBasis} onChange={(e) => setLegalBasis(e.target.value as CrmLegalBasis)} className={FIELD}>
                {LEGAL_BASES.map((b) => <option key={b} value={b}>{tr[`crm_basis_${b}` as const]}</option>)}
              </select>
            </label>
            <label htmlFor={ids.note} className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              {tr.crm_legal_note}
              <input id={ids.note} value={legalNote} onChange={(e) => setLegalNote(e.target.value)} maxLength={500} className={FIELD} />
            </label>
            <p className="text-xs text-gray-500">{tr.crm_legal_hint}</p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowLegal(false)} className={`${BTN} text-gray-600 border border-gray-300 hover:bg-gray-50`}>
                {tr.cancel}
              </button>
              <button type="button" onClick={submitLegal} disabled={isPending} className={`${BTN} bg-slate-800 text-white hover:bg-slate-700`}>
                {tr.save}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2" data-testid="crm-lead-actions">
        {state === null && canLifecycle && (
          <button type="button" onClick={() => lead({ to_state: 'SOURCED', lead_version: version })} disabled={isPending}
            className={`${BTN} bg-slate-800 text-white hover:bg-slate-700`}>
            {tr.crm_action_make_target}
          </button>
        )}

        {state === 'NEEDS_REVIEW' && canLifecycle && hasCardImage && (
          <button type="button" onClick={() => lead({ to_state: 'SOURCED', lead_version: version })} disabled={isPending}
            className={`${BTN} bg-green-700 text-white hover:bg-green-800`}>
            {tr.crm_action_confirm_card}
          </button>
        )}

        {state === 'NEEDS_REVIEW' && canSuppress && (
          <button type="button" onClick={() => suppress('rejected_private')} disabled={isPending}
            className={`${BTN} text-rose-700 border border-rose-200 hover:bg-rose-50`}>
            {tr.crm_action_reject_private}
          </button>
        )}

        {canLifecycle && org.business_status !== 'confirmed' && allowed.includes('QUEUED') && (
          <button type="button" onClick={() => setShowConfirmBusiness(true)} disabled={isPending} title={tr.crm_action_confirm_business_hint}
            className={`${BTN} bg-slate-700 text-white hover:bg-slate-800`}>
            {tr.crm_action_confirm_business}
          </button>
        )}

        {canLifecycle && state !== null && setStateOptions.length > 0 && (
          <button type="button" onClick={() => { setSelectedState(''); setShowLifecycle(true) }} disabled={isPending}
            className={`${BTN} bg-slate-700 text-white hover:bg-slate-800`}>
            {tr.crm_action_set_lifecycle}
          </button>
        )}

        {canLifecycle && allowed.includes('REGISTERED') && (
          <button type="button" onClick={() => setShowRegister(true)} disabled={isPending}
            className={`${BTN} bg-teal-700 text-white hover:bg-teal-800`}>
            {tr.crm_action_register}
          </button>
        )}

        {superadminRegister && (
          <button type="button" onClick={() => setShowRegister(true)} disabled={isPending}
            className={`${BTN} bg-teal-800 text-white hover:bg-teal-900`}>
            {tr.crm_action_register_direct}
          </button>
        )}

        {canLifecycle && (
          <button type="button" onClick={() => {
            setLegalTier(org.lead.effective_legal_tier)
            setLegalBasis(org.lead.effective_legal_basis)
            setLegalNote('')
            setShowLegal(true)
          }} disabled={isPending} className={`${BTN} text-slate-700 border border-slate-300 hover:bg-slate-50`}>
            {tr.crm_action_change_legal}
          </button>
        )}

        {canSuppress && !closed && (
          <button type="button" onClick={() => setShowSuppress(true)} disabled={isPending}
            className={`${BTN} text-rose-700 border border-rose-200 hover:bg-rose-50 ms-auto`}>
            {tr.crm_action_suppress}
          </button>
        )}
      </div>

      {isTerminalLeadState(state) && (
        <p className="text-sm text-gray-500 italic">
          {tr.crm_terminal_state.replace('{state}', leadStateLabel(tr, state))}
        </p>
      )}
    </>
  )
}
