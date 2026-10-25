'use client'
// ─── CRM channel editor, owner-neutral (F7600, org cut, Architektur §7) ───────────────────────────────────────────────
// A channel has exactly one owner: the organisation, a relation (person × organisation) or a person. The editor shows
// the channels of one owner with kind, value, legal tier, origin, consent, reachability and the "check owner" marker, and
// offers (with the matching permission):
//   - add (POST …/channels of the owner) with the conflict answers of the backend:
//       409 channel_exists_same_person {channel_id} → dialog "keep as personal channel?" → POST /channels/{id}/move to the person
//       422 channel_owned_by_org {channel_id}       → hint; for a relation: "choose as preferred channel of the relation"
//       422 channel_owned_by_other_person          → hint "shared channel, keep it at the organisation"
//   - remove (DELETE …/channels/{id}); 422 last_channel → dialog "remove anyway and set UNREACHABLE?" → ?mark_unreachable=true
//   - legal tier per channel (PATCH /channels/{id}, crm:lifecycle:write)
//   - move to another owner (POST /channels/{id}/move); the caller passes the allowed targets.
// Clean Boundary: no imports from customer-facing code.

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/system-admin/ConfirmDialog'
import { showToast } from '@/components/system-admin/Toast'
import { crmDelete, crmPatch, crmPost } from './crmFetch'
import { crmPath } from './crmPaths'
import { LEGAL_TIERS, TIER_BADGE, channelKindLabel, tierLabel } from './crmLabels'
import type {
  CrmChannelAddRequest,
  CrmChannelKindIn,
  CrmChannelMoveRequest,
  CrmChannelOut,
  CrmChannelOwner,
  CrmChannelTierRequest,
  CrmLegalTier,
  CrmRelationUpdateRequest,
} from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

export interface ChannelMoveTarget {
  owner: CrmChannelOwner
  label: string
}

export interface ChannelEditorProps {
  owner: CrmChannelOwner
  channels: CrmChannelOut[]
  tr: SysAdminTranslations
  /** crm:contacts:write — add, remove, move */
  canWrite: boolean
  /** crm:lifecycle:write — legal tier per channel */
  canSetTier?: boolean
  /** Person behind a relation owner: target of "keep as personal channel" (409 channel_exists_same_person). */
  personId?: number | null
  /** Owners a channel may be moved to; none = no move action. */
  moveTargets?: ChannelMoveTarget[]
  /** Called after every successful change; default `router.refresh()`. */
  onChanged?: () => void
}

/** Codes the editor answers with a dialog or a hint instead of the generic toast. */
const ADD_CONFLICTS = ['channel_exists_same_person', 'channel_owned_by_org', 'channel_owned_by_other_person'] as const

type Conflict =
  | { code: 'channel_exists_same_person'; channelId: number | null }
  | { code: 'channel_owned_by_org'; channelId: number | null }
  | { code: 'channel_owned_by_other_person' }

function addPath(owner: CrmChannelOwner): string {
  if (owner.type === 'org') return crmPath('orgChannelAdd', { org_id: owner.id })
  if (owner.type === 'relation') return crmPath('relationChannelAdd', { relation_id: owner.id })
  return crmPath('personChannelAdd', { person_id: owner.id })
}

function removePath(owner: CrmChannelOwner, channelId: number, markUnreachable: boolean): string {
  const query = { mark_unreachable: markUnreachable ? true : undefined }
  if (owner.type === 'org') return crmPath('orgChannelRemove', { org_id: owner.id, channel_id: channelId }, query)
  if (owner.type === 'relation') return crmPath('relationChannelRemove', { relation_id: owner.id, channel_id: channelId }, query)
  return crmPath('personChannelRemove', { person_id: owner.id, channel_id: channelId }, query)
}

function consentBadge(state: string): string {
  if (state === 'opted_in' || state === 'consent') return 'text-emerald-700'
  if (state === 'optout' || state === 'hard_optout') return 'text-rose-700'
  return 'text-gray-500'
}

function reachableBadge(state: string): string {
  if (state === 'yes' || state === 'reachable') return 'text-emerald-700'
  if (state === 'no' || state === 'unreachable') return 'text-rose-700'
  return 'text-gray-500'
}

const sameOwner = (a: CrmChannelOwner, b: CrmChannelOwner) => a.type === b.type && a.id === b.id

export function ChannelEditor({
  owner, channels, tr, canWrite, canSetTier = false, personId = null, moveTargets = [], onChanged,
}: ChannelEditorProps) {
  const router = useRouter()
  const kindId = useId()
  const valueId = useId()
  const moveId = useId()
  const [isPending, startTransition] = useTransition()

  const [showAdd, setShowAdd] = useState(false)
  const [addKind, setAddKind] = useState<CrmChannelKindIn>('email')
  const [addValue, setAddValue] = useState('')
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [lastChannelId, setLastChannelId] = useState<number | null>(null)
  const [moving, setMoving] = useState<{ channel: CrmChannelOut; target: string } | null>(null)

  const changed = () => (onChanged ? onChanged() : router.refresh())
  const targetsFor = (channel: CrmChannelOut) => moveTargets.filter((t) => !sameOwner(t.owner, channel.owner))

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addValue.trim()) return
    setConflict(null)
    startTransition(async () => {
      const body: CrmChannelAddRequest = { kind: addKind, value: addValue.trim() }
      const result = await crmPost<unknown>(addPath(owner), body, tr, { silent: ADD_CONFLICTS })
      if (result.ok) {
        setShowAdd(false)
        setAddValue('')
        setAddKind('email')
        changed()
        return
      }
      const channelId = result.extras?.channel_id ?? null
      if (result.code === 'channel_exists_same_person') setConflict({ code: result.code, channelId })
      else if (result.code === 'channel_owned_by_org') setConflict({ code: result.code, channelId })
      else if (result.code === 'channel_owned_by_other_person') setConflict({ code: result.code })
    })
  }

  /** 409 channel_exists_same_person: the value stays one row; it becomes a personal channel of the person (AC 9). */
  function keepAsPersonal() {
    if (conflict?.code !== 'channel_exists_same_person' || conflict.channelId === null || personId === null) return
    const channelId = conflict.channelId
    startTransition(async () => {
      const body: CrmChannelMoveRequest = { owner: { type: 'person', id: personId } }
      const result = await crmPost<CrmChannelOut>(crmPath('channelMove', { channel_id: channelId }), body, tr)
      if (result.ok) {
        setConflict(null)
        setShowAdd(false)
        setAddValue('')
        changed()
      }
    })
  }

  /** 422 channel_owned_by_org: reference instead of copy — the relation points to the org channel (AC 39). */
  function chooseAsPreferred() {
    if (conflict?.code !== 'channel_owned_by_org' || conflict.channelId === null || owner.type !== 'relation') return
    const channelId = conflict.channelId
    startTransition(async () => {
      const body: CrmRelationUpdateRequest = { preferred_channel_id: channelId }
      const result = await crmPatch<unknown>(crmPath('relationUpdate', { relation_id: owner.id }), body, tr)
      if (result.ok) {
        showToast(tr.crm_preferred_set, 'success')
        setConflict(null)
        setShowAdd(false)
        setAddValue('')
        changed()
      }
    })
  }

  function handleRemove(channelId: number) {
    startTransition(async () => {
      const result = await crmDelete<unknown>(removePath(owner, channelId, false), tr, { silent: ['last_channel'] })
      if (result.ok) changed()
      else if (result.code === 'last_channel') setLastChannelId(channelId)
    })
  }

  function removeAndMarkUnreachable() {
    if (lastChannelId === null) return
    const channelId = lastChannelId
    startTransition(async () => {
      const result = await crmDelete<unknown>(removePath(owner, channelId, true), tr)
      setLastChannelId(null)
      if (result.ok) changed()
    })
  }

  function handleTier(channelId: number, tier: CrmLegalTier) {
    startTransition(async () => {
      const body: CrmChannelTierRequest = { legal_tier: tier }
      const result = await crmPatch<CrmChannelOut>(crmPath('channelTier', { channel_id: channelId }), body, tr)
      if (result.ok) changed()
    })
  }

  function handleMove() {
    if (!moving || !moving.target) return
    const target = targetsFor(moving.channel)[Number(moving.target)]
    if (!target) return
    const channelId = moving.channel.id
    startTransition(async () => {
      const body: CrmChannelMoveRequest = { owner: target.owner }
      const result = await crmPost<CrmChannelOut>(crmPath('channelMove', { channel_id: channelId }), body, tr)
      if (result.ok) {
        setMoving(null)
        changed()
      }
    })
  }

  return (
    <div className="flex flex-col gap-3" data-testid={`crm-channels-${owner.type}-${owner.id}`}>
      <ConfirmDialog
        open={lastChannelId !== null}
        message={tr.crm_last_channel_dialog}
        confirmLabel={tr.crm_last_channel_confirm}
        cancelLabel={tr.cancel}
        isPending={isPending}
        onConfirm={removeAndMarkUnreachable}
        onCancel={() => setLastChannelId(null)}
      />
      <ConfirmDialog
        open={conflict?.code === 'channel_exists_same_person' && conflict.channelId !== null && personId !== null}
        message={tr.crm_err_channel_exists_same_person}
        confirmLabel={tr.crm_keep_personal}
        cancelLabel={tr.cancel}
        isPending={isPending}
        onConfirm={keepAsPersonal}
        onCancel={() => setConflict(null)}
      />

      {channels.length === 0 ? (
        <p className="text-sm text-gray-400">{tr.no_items}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{tr.crm_channel_kind}</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{tr.crm_channel_value}</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{tr.crm_detail_legal_tier}</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{tr.crm_channel_origin}</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{tr.crm_channel_consent}</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{tr.crm_channel_reachable}</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{tr.crm_channel_preferred}</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch.id} className="border-b border-gray-100 last:border-0" data-channel-id={ch.id}>
                  <td className="px-3 py-2 text-xs text-gray-700">{channelKindLabel(tr, ch.kind)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-800">
                    {ch.value_normalized}
                    {ch.owner_review_pending && (
                      <span className="ms-2 inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-800">
                        {tr.crm_channel_review_pending}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {canSetTier ? (
                      <select
                        aria-label={`${tr.crm_detail_legal_tier}: ${ch.value_normalized}`}
                        value={ch.legal_tier}
                        onChange={(e) => handleTier(ch.id, e.target.value as CrmLegalTier)}
                        disabled={isPending}
                        className="rounded border border-gray-300 px-1.5 py-0.5 text-xs bg-white disabled:opacity-50"
                      >
                        {LEGAL_TIERS.map((tier) => <option key={tier} value={tier}>{tierLabel(tr, tier)}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${TIER_BADGE[ch.legal_tier] ?? ''}`}>
                        {tierLabel(tr, ch.legal_tier)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{ch.origin ?? ''}</td>
                  <td className={`px-3 py-2 text-xs font-medium ${consentBadge(ch.consent_state)}`}>{ch.consent_state}</td>
                  <td className={`px-3 py-2 text-xs font-medium ${reachableBadge(ch.reachable)}`}>{ch.reachable}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{ch.is_preferred ? '★' : ''}</td>
                  {canWrite && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      {targetsFor(ch).length > 0 && (
                        <button
                          type="button"
                          onClick={() => setMoving({ channel: ch, target: '' })}
                          disabled={isPending}
                          className="me-3 text-xs font-medium text-slate-600 hover:text-slate-800 disabled:opacity-40"
                        >
                          {tr.crm_channel_move}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(ch.id)}
                        disabled={isPending}
                        aria-label={`${tr.crm_channel_remove}: ${ch.value_normalized}`}
                        className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40"
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
      )}

      {/* Move a channel to another owner */}
      {moving && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3" data-testid="crm-channel-move">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700">{tr.crm_channel_move_title}</span>
            <span className="font-mono text-xs text-gray-600">{moving.channel.value_normalized}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={moveId} className="text-xs font-medium text-gray-600">{tr.crm_channel_move_target}</label>
            <select
              id={moveId}
              value={moving.target}
              onChange={(e) => setMoving({ ...moving, target: e.target.value })}
              disabled={isPending}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white disabled:opacity-50"
            >
              <option value="">{tr.select_placeholder}</option>
              {targetsFor(moving.channel).map((t, i) => <option key={`${t.owner.type}-${t.owner.id}`} value={i}>{t.label}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={handleMove}
            disabled={isPending || !moving.target}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {tr.crm_channel_move}
          </button>
          <button
            type="button"
            onClick={() => setMoving(null)}
            disabled={isPending}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {tr.cancel}
          </button>
        </div>
      )}

      {/* Conflict hints of the last add attempt */}
      {conflict?.code === 'channel_owned_by_org' && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>{tr.crm_err_channel_owned_by_org}</span>
          {owner.type === 'relation' && conflict.channelId !== null && (
            <button type="button" onClick={chooseAsPreferred} disabled={isPending}
              className="px-3 py-1 text-xs font-medium bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50">
              {tr.crm_action_use_as_preferred}
            </button>
          )}
          <button type="button" onClick={() => setConflict(null)} className="ms-auto text-xs text-amber-800 underline">
            {tr.close}
          </button>
        </div>
      )}
      {(conflict?.code === 'channel_owned_by_other_person'
        || (conflict?.code === 'channel_exists_same_person' && (conflict.channelId === null || personId === null))) && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>{conflict.code === 'channel_owned_by_other_person' ? tr.crm_err_channel_owned_by_other_person : tr.crm_err_channel_exists_same_person}</span>
          <button type="button" onClick={() => setConflict(null)} className="ms-auto text-xs text-amber-800 underline">
            {tr.close}
          </button>
        </div>
      )}

      {canWrite && (
        <div>
          {!showAdd ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              disabled={isPending}
              className="text-sm text-slate-600 hover:text-slate-800 font-medium underline underline-offset-2 disabled:opacity-50"
            >
              + {tr.crm_channel_add}
            </button>
          ) : (
            <form onSubmit={handleAdd} data-testid="channel-add-form" className="flex items-end gap-2 flex-wrap">
              <div className="flex flex-col gap-1">
                <label htmlFor={kindId} className="text-xs font-medium text-gray-600">{tr.crm_channel_kind}</label>
                <select
                  id={kindId}
                  value={addKind}
                  onChange={(e) => setAddKind(e.target.value as CrmChannelKindIn)}
                  disabled={isPending}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600 bg-white disabled:opacity-50"
                >
                  <option value="email">{tr.crm_channel_kind_email}</option>
                  <option value="phone">{tr.crm_channel_kind_phone}</option>
                  <option value="whatsapp">{tr.crm_doc_channel_whatsapp}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-40">
                <label htmlFor={valueId} className="text-xs font-medium text-gray-600">{tr.crm_channel_value}</label>
                <input
                  id={valueId}
                  type="text"
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  disabled={isPending}
                  placeholder={addKind === 'email' ? 'name@example.com' : '+357 99…'}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={isPending || !addValue.trim()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? tr.crm_channel_adding : tr.crm_channel_add}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setAddValue(''); setConflict(null) }}
                disabled={isPending}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
