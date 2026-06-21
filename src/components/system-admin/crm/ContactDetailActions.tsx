'use client'
// ─── CRM Contact Detail Actions (F7600 Stufe 1) ───────────────────────────────
// Actions: confirm-business, lifecycle transition, mark-as-registered (shop_id), suppress.
// Stufe 1 additions:
//   - Permission-gating via me.permissions (AK5/AK6)
//   - Superadmin SOURCED→REGISTERED direct button (AK3/AK4)
// All lifecycle actions carry `version` for optimistic locking.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/system-admin/ConfirmDialog'
import { crmPost } from './crmFetch'
import { CRM_ALLOWED_TRANSITIONS, SUPERADMIN_EXTRA_TRANSITIONS } from './transitions'
import type {
  CrmLifecycleState,
  CrmContactDetail,
  CrmConfirmBusinessRequest,
  CrmLifecycleRequest,
  CrmSuppressRequest,
  SysAdminUser,
} from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface ContactDetailActionsProps {
  contact: CrmContactDetail
  tr: SysAdminTranslations
  me: SysAdminUser
}

/**
 * Permission helper. Returns true if the user can perform the given action.
 * null permissions = grandfathering (all perms). superadmin always has all perms.
 */
function can(me: SysAdminUser, perm: string): boolean {
  return me.role === 'superadmin' || me.permissions == null || me.permissions.includes(perm)
}

export function ContactDetailActions({ contact, tr, me }: ContactDetailActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Confirm-business dialog
  const [showConfirmBusiness, setShowConfirmBusiness] = useState(false)

  // Lifecycle dialog
  const [showLifecycle, setShowLifecycle] = useState(false)
  const [selectedState, setSelectedState] = useState<CrmLifecycleState | ''>('')

  // Register dialog (needs shop_id) — used for both normal and superadmin-direct register
  const [showRegister, setShowRegister] = useState(false)
  const [shopIdInput, setShopIdInput] = useState('')

  // Suppress dialog
  const [showSuppress, setShowSuppress] = useState(false)
  const [suppressReason, setSuppressReason] = useState<'hard_optout' | 'rejected_private'>('hard_optout')

  const currentState = contact.lifecycle_state as CrmLifecycleState
  const allowedTransitions = CRM_ALLOWED_TRANSITIONS[currentState] ?? []

  // Superadmin extra: SOURCED→REGISTERED direct (AK3)
  const superadminExtras = me.role === 'superadmin'
    ? (SUPERADMIN_EXTRA_TRANSITIONS[currentState] ?? [])
    : []
  const showSuperadminRegister =
    me.role === 'superadmin' &&
    superadminExtras.includes('REGISTERED') &&
    !allowedTransitions.includes('REGISTERED')

  const canLifecycle = can(me, 'crm:lifecycle:write')

  function stateLabel(state: string): string {
    const key = `crm_state_${state}` as keyof SysAdminTranslations
    const val = tr[key]
    return (typeof val === 'string' ? val : null) ?? state
  }

  async function doAction<T>(fn: () => Promise<{ ok: boolean; data?: T }>) {
    startTransition(async () => {
      const result = await fn()
      if (result.ok) {
        router.refresh()
      }
    })
  }

  function handleConfirmBusiness() {
    setShowConfirmBusiness(false)
    doAction(() =>
      crmPost<CrmContactDetail>(
        `crm/contacts/${contact.id}/confirm-business`,
        { version: contact.version, legal_basis: 'legitimate_interest' } satisfies CrmConfirmBusinessRequest,
        tr,
      ),
    )
  }

  function handleLifecycleSubmit() {
    if (!selectedState) return
    setShowLifecycle(false)
    doAction(() =>
      crmPost<CrmContactDetail>(
        `crm/contacts/${contact.id}/lifecycle`,
        { to_state: selectedState, version: contact.version } satisfies CrmLifecycleRequest,
        tr,
      ),
    )
  }

  function handleRegisterSubmit() {
    const shopId = parseInt(shopIdInput, 10)
    if (isNaN(shopId)) return
    setShowRegister(false)
    doAction(() =>
      crmPost<CrmContactDetail>(
        `crm/contacts/${contact.id}/lifecycle`,
        { to_state: 'REGISTERED', version: contact.version, shop_id: shopId } satisfies CrmLifecycleRequest,
        tr,
      ),
    )
  }

  function handleSuppressSubmit() {
    setShowSuppress(false)
    doAction(() =>
      crmPost<CrmContactDetail>(
        `crm/contacts/${contact.id}/suppress`,
        { reason: suppressReason, version: contact.version } satisfies CrmSuppressRequest,
        tr,
      ),
    )
  }

  // Terminal states — no actions available
  const isTerminal = ['HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'].includes(currentState)

  return (
    <>
      {/* Confirm-business dialog */}
      <ConfirmDialog
        open={showConfirmBusiness}
        message={`${tr.crm_action_confirm_business}?`}
        confirmLabel={tr.crm_action_confirm_business}
        cancelLabel={tr.cancel}
        isPending={isPending}
        onConfirm={handleConfirmBusiness}
        onCancel={() => setShowConfirmBusiness(false)}
      />

      {/* Lifecycle dialog */}
      {showLifecycle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-800">{tr.crm_action_set_lifecycle}</h2>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value as CrmLifecycleState)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
            >
              <option value="">— select —</option>
              {allowedTransitions.map((s) => (
                <option key={s} value={s}>{stateLabel(s)}</option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowLifecycle(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleLifecycleSubmit}
                disabled={!selectedState || isPending}
                className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                {tr.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register dialog */}
      {showRegister && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-800">{tr.crm_action_register}</h2>
            <div className="flex flex-col gap-1">
              <label htmlFor="shop_id_input" className="text-sm font-medium text-gray-700">
                {tr.crm_register_shop_id} *
              </label>
              <input
                id="shop_id_input"
                type="number"
                min={1}
                value={shopIdInput}
                onChange={(e) => setShopIdInput(e.target.value)}
                placeholder="e.g. 42"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
              />
              <p className="text-xs text-gray-500">{tr.crm_register_shop_id_hint}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowRegister(false); setShopIdInput('') }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleRegisterSubmit}
                disabled={!shopIdInput || isPending}
                className="px-4 py-2 text-sm bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50"
              >
                {tr.crm_action_register}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suppress dialog */}
      {showSuppress && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-800">{tr.crm_action_suppress}</h2>
            <div className="flex flex-col gap-2">
              {(['hard_optout', 'rejected_private'] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="suppress_reason"
                    value={r}
                    checked={suppressReason === r}
                    onChange={() => setSuppressReason(r)}
                  />
                  {r === 'hard_optout' ? tr.crm_suppress_reason_hard_optout : tr.crm_suppress_reason_rejected_private}
                </label>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowSuppress(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleSuppressSubmit}
                disabled={isPending}
                className="px-4 py-2 text-sm text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 disabled:opacity-50"
              >
                {tr.crm_action_suppress}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      {!isTerminal && (
        <div className="flex flex-wrap gap-2">
          {canLifecycle && contact.org.business_status !== 'confirmed' && (
            <button
              type="button"
              onClick={() => setShowConfirmBusiness(true)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-800
                transition-colors disabled:opacity-50"
            >
              {tr.crm_action_confirm_business}
            </button>
          )}

          {canLifecycle && allowedTransitions.filter((s) => s !== 'REGISTERED').length > 0 && (
            <button
              type="button"
              onClick={() => { setSelectedState(''); setShowLifecycle(true) }}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-800
                transition-colors disabled:opacity-50"
            >
              {tr.crm_action_set_lifecycle}
            </button>
          )}

          {canLifecycle && allowedTransitions.includes('REGISTERED') && currentState !== 'REGISTERED' && (
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-teal-700 text-white rounded-lg hover:bg-teal-800
                transition-colors disabled:opacity-50"
            >
              {tr.crm_action_register}
            </button>
          )}

          {/* Superadmin-only: SOURCED→REGISTERED direct (AK3) */}
          {showSuperadminRegister && (
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-teal-800 text-white rounded-lg hover:bg-teal-900
                transition-colors disabled:opacity-50"
            >
              {tr.crm_action_register_direct}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSuppress(true)}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-rose-700 border border-rose-200 rounded-lg
              hover:bg-rose-50 transition-colors disabled:opacity-50 ms-auto"
          >
            {tr.crm_action_suppress}
          </button>
        </div>
      )}

      {isTerminal && (
        <p className="text-sm text-gray-500 italic">
          This contact is in a terminal state ({stateLabel(currentState)}) — no further actions available.
        </p>
      )}
    </>
  )
}
