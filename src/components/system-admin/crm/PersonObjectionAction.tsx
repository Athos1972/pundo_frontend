'use client'
// ─── Record the objection of a person (F7600 CRM-Backbone, follow-up "Widerspruch einer Person im Admin erfassen") ────
// Button and dialog on the person page (only with crm:suppress_override and without an objection; the page decides).
// The dialog states the effect before anything is sent: number of personal and relation channels that get blocked, the
// organisations of the active relations ("stays contactable" or the owner-rule note), source and reason (trimmed 10..500
// characters, both required) and that it cannot be undone. POST /admin/crm/persons/{id}/opt-out → refresh; 409
// person_already_opted_out (a second admin was faster) shows its text in the dialog and refreshes too; any other error is
// a toast from crmFetch and the dialog stays open. Cancel sends nothing.

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPost } from './crmFetch'
import { crmPath } from './crmPaths'
import { OBJECTION_SOURCES, objectionSourceLabel } from './crmLabels'
import { OBJECTION_REASON_MAX, OBJECTION_REASON_MIN, type ObjectionOrg } from './crmObjection'
import type { CrmObjectionSource, CrmPerson, CrmPersonOptOutRequest } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface PersonObjectionActionProps {
  personId: number
  /** Personal channels plus the channels of all relations (active and ended): every one gets blocked. */
  channelCount: number
  orgs: ObjectionOrg[]
  /** `crm_config.owner_optout_rule`; `null` = the setting could not be read → the stricter note (rule on, spec A4). */
  ownerRule: boolean | null
  tr: SysAdminTranslations
}


const BTN = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50'
const FIELD = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600'

/**
 * Effect text: channel sentence (singular for exactly one channel, "No channels yet" for none) plus what happens to the
 * organisations. With the owner rule on (or unreadable, A4) and an owner relation the owner organisations are named as
 * blocked and only the others as contactable; otherwise all organisations stay contactable. No sentence without orgs.
 */
export function effectText(channelCount: number, orgs: ObjectionOrg[], ownerRule: boolean | null, tr: SysAdminTranslations): string {
  const channels = channelCount === 0
    ? tr.crm_person_objection_no_channels
    : channelCount === 1
      ? tr.crm_person_objection_effect_one
      : tr.crm_person_objection_effect.replace('{n}', String(channelCount))
  const ownersBlocked = ownerRule !== false && orgs.some((org) => org.isOwner)
  const others = orgs.some((org) => !org.isOwner)
  const parts = [channels]
  if (ownersBlocked) {
    parts.push(tr.crm_person_objection_owner_orgs_blocked)
    if (others) parts.push(tr.crm_person_objection_other_orgs_stay)
  } else if (orgs.length > 0) {
    parts.push(tr.crm_person_objection_orgs_stay)
  }
  return parts.join(' ')
}

function orgNote(org: ObjectionOrg, ownerRule: boolean | null, tr: SysAdminTranslations): string {
  if (!org.isOwner) return tr.crm_person_objection_org_stays.replace('{org}', org.name)
  if (ownerRule === false) return tr.crm_person_objection_owner_off.replace('{org}', org.name)
  return (org.leadState === 'REGISTERED' ? tr.crm_person_objection_owner_on_registered : tr.crm_person_objection_owner_on)
    .replace('{org}', org.name)
}

export function PersonObjectionAction({ personId, channelCount, orgs, ownerRule, tr }: PersonObjectionActionProps) {
  const router = useRouter()
  const ids = { title: useId(), source: useId(), reason: useId(), help: useId() }
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<CrmObjectionSource | ''>('')
  const [reason, setReason] = useState('')
  const [already, setAlready] = useState(false)
  const [isPending, startTransition] = useTransition()

  const trimmed = reason.trim()
  const valid = source !== '' && trimmed.length >= OBJECTION_REASON_MIN && trimmed.length <= OBJECTION_REASON_MAX

  function close() {
    setOpen(false)
    setSource('')
    setReason('')
    setAlready(false)
  }

  function submit() {
    if (!valid) return
    const body: CrmPersonOptOutRequest = { source, reason: trimmed }
    startTransition(async () => {
      const result = await crmPost<CrmPerson>(crmPath('personOptOut', { person_id: personId }), body, tr, {
        silent: ['person_already_opted_out'],
      })
      if (result.ok) {
        close()
        router.refresh()
      } else if (result.code === 'person_already_opted_out') {
        setAlready(true)
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${BTN} text-rose-700 border border-rose-200 hover:bg-rose-50`}
        data-testid="person-objection-button"
      >
        {tr.crm_person_objection_button}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby={ids.title}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 flex flex-col gap-4 max-h-[90vh] overflow-y-auto" data-testid="person-objection-dialog">
            <h2 id={ids.title} className="text-sm font-semibold text-gray-800">{tr.crm_person_objection_button}</h2>
            <p className="text-sm text-gray-700" data-testid="person-objection-effect">
              {effectText(channelCount, orgs, ownerRule, tr)}
            </p>

            {orgs.length > 0 && (
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tr.crm_person_objection_orgs_title}</h3>
                <ul className="flex flex-col gap-1 text-sm" data-testid="person-objection-orgs">
                  {orgs.map((org) => (
                    <li
                      key={org.id}
                      data-owner={org.isOwner ? 'true' : 'false'}
                      className={org.isOwner && ownerRule !== false ? 'text-rose-800' : 'text-gray-700'}
                    >
                      {orgNote(org, ownerRule, tr)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label htmlFor={ids.source} className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              {tr.crm_person_objection_source_label}
              <select
                id={ids.source}
                value={source}
                onChange={(e) => setSource(e.target.value as CrmObjectionSource | '')}
                className={FIELD}
                required
              >
                <option value="">{tr.select_placeholder}</option>
                {OBJECTION_SOURCES.map((s) => <option key={s} value={s}>{objectionSourceLabel(tr, s)}</option>)}
              </select>
            </label>

            <div className="flex flex-col gap-1">
              <label htmlFor={ids.reason} className="text-sm font-medium text-gray-700">{tr.crm_outreach_approve_reason}</label>
              <textarea
                id={ids.reason}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={OBJECTION_REASON_MAX}
                rows={3}
                aria-describedby={ids.help}
                className={FIELD}
                required
              />
              <p id={ids.help} className="text-xs text-gray-500">{tr.crm_person_objection_reason_help}</p>
              <p className="text-xs text-gray-400" data-testid="person-objection-count">
                {tr.crm_person_objection_reason_count.replace('{n}', String(trimmed.length))}
              </p>
            </div>

            <p className="text-sm font-medium text-rose-800">{tr.crm_person_objection_irreversible}</p>

            {already && (
              <p role="alert" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{tr.crm_err_person_already_opted_out}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={close} className={`${BTN} text-gray-600 border border-gray-300 hover:bg-gray-50`}>
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!valid || isPending || already}
                className={`${BTN} bg-rose-700 text-white hover:bg-rose-800`}
                data-testid="person-objection-confirm"
              >
                {tr.crm_person_objection_button}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
