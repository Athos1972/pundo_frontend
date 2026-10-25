'use client'
// ─── Relations person × organisation (F7600 CRM-Backbone, org cut, T16; replaces PersonRoleEditor) ─────────────────
// One card per relation: organisation (or person), period of the relation, role set 0..n without dates (empty →
// "Role missing", E22), note, work location (organisation address or a different one), channels of the relation and
// the preferred channel (own relation channel, personal channel, or a channel of the SAME organisation: a reference,
// never a copy, E18). `RelationCard` is shared with OrgRelationList (organisation page).
// Clean Boundary: only system-admin components, types and translations.

import Link from 'next/link'
import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Combobox } from '@/components/system-admin/Combobox'
import { ConfirmDialog } from '@/components/system-admin/ConfirmDialog'
import { crmDelete, crmPatch, crmPost } from './crmFetch'
import { crmPath } from './crmPaths'
import { ORG_SEARCH_MIN, searchCrmOrgs, searchErrorText } from './crmSearch'
import { ROLE_CATALOG, roleLabel } from './crmPersonName'
import { channelKindLabel, ownerLabel } from './crmLabels'
import { ChannelEditor, type ChannelMoveTarget } from './ChannelEditor'
import type {
  CrmAddressIn, CrmChannelOut, CrmPerson, CrmRelationCreateRequest, CrmRelationEndRequest, CrmRelationOut,
  CrmRelationRoleRequest, CrmRelationUpdateRequest,
} from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

const INPUT = 'rounded border border-gray-300 px-2 py-1.5 text-sm'

/** Today as `YYYY-MM-DD` in local time (a relation ended "today" is no longer active: `valid_to > today`). */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Active relations first (as the backend lists them), ended ones after. */
export function sortRelations(relations: CrmRelationOut[]): CrmRelationOut[] {
  return [...relations].sort((a, b) => Number(b.active) - Number(a.active))
}

/** Choices for the preferred channel: own relation channels, personal channels, channels of this organisation. */
export function preferredChoices(relation: CrmRelationOut, orgChannels: CrmChannelOut[]): Array<{ channel: CrmChannelOut; owner: 'relation' | 'person' | 'org' }> {
  return [
    ...relation.channels.map((channel) => ({ channel, owner: 'relation' as const })),
    ...relation.person_channels.map((channel) => ({ channel, owner: 'person' as const })),
    ...orgChannels.map((channel) => ({ channel, owner: 'org' as const })),
  ]
}

function addressText(address: CrmRelationOut['address']): string {
  if (!address) return ''
  return [address.address_line1, address.postal_code, address.city].filter(Boolean).join(', ')
}

/**
 * Where a channel of this relation may be moved (backend rule, 03-implementation-T2T3 A-9): to the person ("personal",
 * valid for all relations) or to the organisation of the relation.
 */
export function relationMoveTargets(relation: CrmRelationOut, tr: SysAdminTranslations): ChannelMoveTarget[] {
  return [
    { owner: { type: 'person', id: relation.person.id }, label: tr.crm_move_target_person.replace('{name}', relation.person.display_name ?? `#${relation.person.id}`) },
    { owner: { type: 'org', id: relation.org.id }, label: `${relation.org.name} (${ownerLabel(tr, 'org')})` },
  ]
}

interface RelationCardProps {
  relation: CrmRelationOut
  /** `person`: the card is on the person page and names the organisation; `org`: on the organisation page, names the person. */
  context: 'person' | 'org'
  /** Channels of the relation's organisation (for the preferred channel). */
  orgChannels: CrmChannelOut[]
  canWrite: boolean
  /** crm:lifecycle:write — legal tier per channel (ChannelEditor). */
  canSetTier?: boolean
  tr: SysAdminTranslations
  onChanged: () => void
}

export function RelationCard({ relation, context, orgChannels, canWrite, canSetTier = false, tr, onChanged }: RelationCardProps) {
  const [busy, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [roleToAdd, setRoleToAdd] = useState('')
  const editable = canWrite && relation.active
  const choices = preferredChoices(relation, orgChannels)
  const preferred = choices.find((choice) => choice.channel.id === relation.preferred_channel_id)
  const freeRoles = ROLE_CATALOG.filter((role) => !relation.roles.includes(role))
  const id = `relation-${relation.id}`

  function run(request: () => Promise<{ ok: boolean }>, after?: () => void) {
    start(async () => {
      const result = await request()
      if (result.ok) { after?.(); onChanged() }
    })
  }

  const update = (body: CrmRelationUpdateRequest, after?: () => void) =>
    run(() => crmPatch<CrmRelationOut>(crmPath('relationUpdate', { relation_id: relation.id }), body, tr), after)

  function addRole(event: React.FormEvent) {
    event.preventDefault()
    if (!roleToAdd) return
    const body: CrmRelationRoleRequest = { role: roleToAdd }
    run(() => crmPost<CrmRelationOut>(crmPath('relationRoleAdd', { relation_id: relation.id }), body, tr), () => setRoleToAdd(''))
  }

  const removeRole = (role: string) =>
    run(() => crmDelete<CrmRelationOut>(crmPath('relationRoleRemove', { relation_id: relation.id, role }), tr))

  function endRelation() {
    const body: CrmRelationEndRequest = { valid_to: todayIso() }
    run(() => crmPost<CrmRelationOut>(crmPath('relationEnd', { relation_id: relation.id }), body, tr), () => setConfirmEnd(false))
  }

  const heading = context === 'person'
    ? <Link className="font-medium hover:underline" href={`/admin/crm/orgs/${relation.org.id}`}>{relation.org.city ? `${relation.org.name} (${relation.org.city})` : relation.org.name}</Link>
    : <Link className="font-medium hover:underline" href={`/admin/crm/persons/${relation.person.id}`}>{relation.person.display_name ?? `#${relation.person.id}`}</Link>

  return (
    <li className={`flex flex-col gap-2 rounded-lg border p-3 ${relation.active ? 'border-gray-200' : 'border-dashed border-gray-200 bg-gray-50'}`} data-testid={id}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {heading}
        {!relation.active && <span className="rounded bg-gray-200 px-1.5 text-xs text-gray-700">{tr.crm_relation_ended}</span>}
        {context === 'org' && relation.person.optout && <span className="rounded bg-rose-50 px-1.5 text-xs text-rose-700">{tr.crm_person_optout_badge}</span>}
        <span className="text-xs text-gray-500">
          {tr.crm_relation_period}: {relation.valid_from ?? '—'} – {relation.valid_to ?? '—'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs" aria-label={tr.crm_relation_roles}>
        {relation.role_missing && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">{tr.crm_relation_role_missing}</span>}
        {relation.roles.map((role) => (
          <span key={role} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">
            {roleLabel(tr, role)}
            {editable && (
              <button type="button" disabled={busy} onClick={() => removeRole(role)} className="text-slate-500 hover:text-red-700"
                aria-label={tr.crm_relation_role_remove.replace('{role}', roleLabel(tr, role))}>
                <span aria-hidden="true">×</span>
              </button>
            )}
          </span>
        ))}
        {editable && freeRoles.length > 0 && (
          <form onSubmit={addRole} className="inline-flex items-center gap-1">
            <label className="sr-only" htmlFor={`${id}-role`}>{tr.crm_person_role}</label>
            <select id={`${id}-role`} value={roleToAdd} onChange={(e) => setRoleToAdd(e.target.value)} className="rounded border px-1 py-0.5 text-xs">
              <option value="">{tr.select_placeholder}</option>
              {freeRoles.map((role) => <option key={role} value={role}>{roleLabel(tr, role)}</option>)}
            </select>
            <button type="submit" disabled={busy || !roleToAdd} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-white disabled:opacity-50">{tr.crm_relation_role_add}</button>
          </form>
        )}
      </div>

      {relation.note && <p className="whitespace-pre-line text-sm text-gray-700"><span className="text-xs text-gray-500">{tr.crm_relation_note}: </span>{relation.note}</p>}
      <p className="text-xs text-gray-600">
        {tr.crm_relation_work_location}: {relation.uses_org_address || !relation.address ? tr.crm_relation_uses_org_address : addressText(relation.address)}
      </p>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-700">{tr.crm_relation_channels}</span>
        <ChannelEditor
          owner={{ type: 'relation', id: relation.id }}
          personId={relation.person.id}
          channels={relation.channels}
          canWrite={editable}
          canSetTier={editable && canSetTier}
          moveTargets={relationMoveTargets(relation, tr)}
          tr={tr}
          onChanged={onChanged}
        />
      </div>

      {context === 'org' && relation.person_channels.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-sm" aria-label={ownerLabel(tr, 'person')}>
          {relation.person_channels.map((channel) => (
            <li key={channel.id} className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{channelKindLabel(tr, channel.kind)}</span>
              <span>{channel.value_normalized}</span>
              <span className="rounded bg-sky-50 px-1.5 text-xs text-sky-800">{ownerLabel(tr, 'person')}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
        <label htmlFor={`${id}-preferred`}>{tr.crm_relation_preferred}</label>
        {editable ? (
          <select
            id={`${id}-preferred`}
            value={relation.preferred_channel_id ?? ''}
            disabled={busy}
            onChange={(e) => update({ preferred_channel_id: e.target.value ? Number(e.target.value) : null })}
            className="rounded border px-1 py-0.5 text-xs"
          >
            <option value="">{tr.crm_relation_preferred_none}</option>
            {choices.map(({ channel, owner }) => (
              <option key={channel.id} value={channel.id}>{`${channel.value_normalized} (${ownerLabel(tr, owner)})`}</option>
            ))}
          </select>
        ) : (
          <span id={`${id}-preferred`}>
            {preferred ? `${preferred.channel.value_normalized} (${ownerLabel(tr, preferred.owner)})` : relation.preferred_channel_id ? `#${relation.preferred_channel_id}` : tr.crm_relation_preferred_none}
          </span>
        )}
      </div>

      {editable && (
        <div className="flex gap-3 text-xs">
          <button type="button" className="underline" onClick={() => setEditing((open) => !open)}>{tr.crm_relation_edit}</button>
          <button type="button" className="text-red-700 underline" onClick={() => setConfirmEnd(true)}>{tr.crm_relation_end}</button>
        </div>
      )}
      {editing && editable && <RelationEditForm relation={relation} tr={tr} busy={busy} onSave={(body) => update(body, () => setEditing(false))} />}
      <ConfirmDialog
        open={confirmEnd}
        message={tr.crm_relation_end_confirm}
        confirmLabel={tr.crm_relation_end}
        cancelLabel={tr.cancel}
        isPending={busy}
        onConfirm={endRelation}
        onCancel={() => setConfirmEnd(false)}
      />
    </li>
  )
}

/** Changed fields only; explicit `null` clears (PATCH /relations/{id}). */
export function relationPatch(
  relation: CrmRelationOut,
  form: { validFrom: string; validTo: string; note: string; ownAddress: boolean; line: string; city: string; postalCode: string },
): CrmRelationUpdateRequest {
  const body: CrmRelationUpdateRequest = {}
  const orNull = (value: string) => value.trim() || null
  if (orNull(form.validFrom) !== relation.valid_from) body.valid_from = orNull(form.validFrom)
  if (orNull(form.validTo) !== relation.valid_to) body.valid_to = orNull(form.validTo)
  if (orNull(form.note) !== relation.note) body.note = orNull(form.note)
  if (!form.ownAddress && !relation.uses_org_address) body.address = null
  if (form.ownAddress) {
    const address: CrmAddressIn = { address_line1: orNull(form.line), city: orNull(form.city), postal_code: orNull(form.postalCode), country_code: relation.address?.country_code ?? 'CY' }
    const old = relation.address
    if (relation.uses_org_address || !old || old.address_line1 !== address.address_line1 || old.city !== address.city || old.postal_code !== address.postal_code) {
      body.address = address
    }
  }
  return body
}

function RelationEditForm({ relation, tr, busy, onSave }: { relation: CrmRelationOut; tr: SysAdminTranslations; busy: boolean; onSave: (body: CrmRelationUpdateRequest) => void }) {
  const id = `relation-${relation.id}-edit`
  const [validFrom, setValidFrom] = useState(relation.valid_from ?? '')
  const [validTo, setValidTo] = useState(relation.valid_to ?? '')
  const [note, setNote] = useState(relation.note ?? '')
  const [ownAddress, setOwnAddress] = useState(!relation.uses_org_address && relation.address !== null)
  const [line, setLine] = useState(relation.address?.address_line1 ?? '')
  const [city, setCity] = useState(relation.address?.city ?? '')
  const [postalCode, setPostalCode] = useState(relation.address?.postal_code ?? '')
  const body = relationPatch(relation, { validFrom, validTo, note, ownAddress, line, city, postalCode })
  const addressMissing = ownAddress && !line.trim() && !city.trim() && !postalCode.trim()
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (Object.keys(body).length && !addressMissing) onSave(body) }}
      className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 text-sm"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-600" htmlFor={`${id}-from`}>{tr.crm_relation_valid_from}<input id={`${id}-from`} type="date" className={INPUT} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs text-gray-600" htmlFor={`${id}-to`}>{tr.crm_relation_valid_to}<input id={`${id}-to`} type="date" className={INPUT} value={validTo} onChange={(e) => setValidTo(e.target.value)} /></label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-gray-600" htmlFor={`${id}-note`}>
        {tr.crm_relation_note}
        <textarea id={`${id}-note`} maxLength={2000} rows={2} className={INPUT} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="-mt-1 text-xs text-gray-500">{tr.crm_relation_note_hint}</p>
      <label className="flex items-center gap-2 text-xs text-gray-700">
        <input type="checkbox" checked={ownAddress} onChange={(e) => setOwnAddress(e.target.checked)} />
        {tr.crm_relation_own_address}
      </label>
      {ownAddress && (
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-xs text-gray-600" htmlFor={`${id}-line`}>{tr.address}<input id={`${id}-line`} className={INPUT} value={line} onChange={(e) => setLine(e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-xs text-gray-600" htmlFor={`${id}-city`}>{tr.crm_form_city}<input id={`${id}-city`} className={INPUT} value={city} onChange={(e) => setCity(e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-xs text-gray-600" htmlFor={`${id}-postal`}>{tr.postal_code}<input id={`${id}-postal`} className={INPUT} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></label>
        </div>
      )}
      <div>
        <button type="submit" disabled={busy || !Object.keys(body).length || addressMissing} className="rounded bg-slate-800 px-3 py-1.5 text-xs text-white disabled:opacity-50">{tr.save}</button>
      </div>
    </form>
  )
}

/** Role set as check boxes (0..n; none chosen is valid, E22). */
export function RoleChoice({ idPrefix, value, onChange, tr }: { idPrefix: string; value: string[]; onChange: (roles: string[]) => void; tr: SysAdminTranslations }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-xs text-gray-600">{tr.crm_relation_roles}</legend>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {ROLE_CATALOG.map((role) => (
          <label key={role} className="flex items-center gap-1 text-xs text-gray-700" htmlFor={`${idPrefix}-${role}`}>
            <input
              id={`${idPrefix}-${role}`}
              type="checkbox"
              checked={value.includes(role)}
              onChange={(e) => onChange(e.target.checked ? [...value, role] : value.filter((entry) => entry !== role))}
            />
            {roleLabel(tr, role)}
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-500">{tr.crm_relation_roles_hint}</p>
    </fieldset>
  )
}

interface PersonRelationEditorProps {
  person: CrmPerson
  /** Channels of the organisations of the person's relations, by organisation id (for the preferred channel). */
  orgChannels?: Record<number, CrmChannelOut[]>
  tr: SysAdminTranslations
  canWrite?: boolean
  /** crm:lifecycle:write — legal tier of the relation channels. */
  canSetTier?: boolean
}

export function PersonRelationEditor({ person, orgChannels = {}, tr, canWrite = true, canSetTier = false }: PersonRelationEditorProps) {
  const router = useRouter()
  const refresh = useCallback(() => router.refresh(), [router])
  const [pending, start] = useTransition()
  const [org, setOrg] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [validFrom, setValidFrom] = useState('')
  const [note, setNote] = useState('')
  const loadOrgs = useCallback((query: string) => searchCrmOrgs(query), [])
  const errorText = useCallback((error: unknown) => searchErrorText(error, tr), [tr])

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!org) return
    const body: CrmRelationCreateRequest = {
      person_id: person.id, org_id: Number(org), roles,
      ...(validFrom ? { valid_from: validFrom } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    start(async () => {
      const result = await crmPost<CrmRelationOut>(crmPath('relationCreate'), body, tr)
      if (result.ok) { setOrg(''); setRoles([]); setValidFrom(''); setNote(''); refresh() }
    })
  }

  const relations = sortRelations(person.relations)
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold">{tr.crm_person_relations_title}</h2>
      {relations.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">{tr.crm_person_no_relations}</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-3">
          {relations.map((relation) => (
            <RelationCard key={relation.id} relation={relation} context="person" orgChannels={orgChannels[relation.org.id] ?? []} canWrite={canWrite} canSetTier={canSetTier} tr={tr} onChanged={refresh} />
          ))}
        </ul>
      )}
      {canWrite && (
        <form onSubmit={add} className="flex flex-col gap-2 border-t border-gray-100 pt-3">
          <h3 className="text-xs font-semibold text-gray-700">{tr.crm_relation_add}</h3>
          <div className="w-80">
            <Combobox
              id="person-org"
              items={[]}
              value={org}
              onChange={setOrg}
              loadItems={loadOrgs}
              placeholder={tr.crm_org_search_placeholder}
              searchLabel={tr.crm_col_org}
              noResultsLabel={tr.no_results}
              minQueryLength={ORG_SEARCH_MIN}
              minQueryLabel={tr.crm_search_min_chars.replace('{n}', String(ORG_SEARCH_MIN))}
              loadingLabel={tr.crm_search_loading}
              errorLabel={errorText}
            />
          </div>
          <RoleChoice idPrefix="person-relation-role" value={roles} onChange={setRoles} tr={tr} />
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs text-gray-600" htmlFor="person-relation-from">{tr.crm_relation_valid_from}<input id="person-relation-from" type="date" className={INPUT} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-gray-600" htmlFor="person-relation-note">{tr.crm_relation_note}<input id="person-relation-note" maxLength={2000} className={INPUT} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          </div>
          <div>
            <button type="submit" disabled={pending || !org} className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50">{tr.crm_relation_add}</button>
          </div>
        </form>
      )}
    </section>
  )
}
