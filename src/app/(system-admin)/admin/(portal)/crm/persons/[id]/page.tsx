import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminMe, getCrmConfig, getCrmOrg, getCrmPerson } from '@/lib/system-admin-api'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { PersonRelationEditor } from '@/components/system-admin/crm/PersonRelationEditor'
import { PersonEditForm } from '@/components/system-admin/crm/PersonEditForm'
import { ChannelEditor, type ChannelMoveTarget } from '@/components/system-admin/crm/ChannelEditor'
import { crmCan } from '@/components/system-admin/crm/crmAccess'
import { objectionSourceLabel, ownerLabel } from '@/components/system-admin/crm/crmLabels'
import { PersonObjectionAction } from '@/components/system-admin/crm/PersonObjectionAction'
import { objectionChannelCount, objectionOrgsOf } from '@/components/system-admin/crm/crmObjection'
import { formatBirthDate } from '@/components/system-admin/crm/crmBirthDate'
import { salutationLabel } from '@/components/system-admin/crm/crmPersonName'
import type { CrmChannelOut, CrmLeadState, CrmPerson } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

/** A personal channel may move to one of the person's active relations (backend rule A-9 of T2/T3). */
function personMoveTargets(person: CrmPerson, tr: SysAdminTranslations): ChannelMoveTarget[] {
  return person.relations
    .filter((relation) => relation.active)
    .map((relation) => ({ owner: { type: 'relation', id: relation.id }, label: `${relation.org.name} (${ownerLabel(tr, 'relation')})` }))
}

interface ActiveOrgData {
  /** Channels of the organisations of the active relations (preferred channel may point to one of them, E18). */
  channels: Record<number, CrmChannelOut[]>
  /** Lead status per organisation (owner note of the objection dialog: REGISTERED stays registered). */
  leadStates: Record<number, CrmLeadState | null>
}

/**
 * One read per organisation of an active relation. A failing organisation read only empties its choice list and leaves
 * its lead status unknown; the person page still renders.
 */
async function activeOrgDataOf(person: CrmPerson): Promise<ActiveOrgData> {
  const orgIds = [...new Set(person.relations.filter((relation) => relation.active).map((relation) => relation.org.id))]
  const entries = await Promise.all(orgIds.map(async (orgId) => {
    try {
      const org = await getCrmOrg(orgId)
      return { orgId, channels: org.channels, leadState: org.lead.state }
    } catch {
      return { orgId, channels: [] as CrmChannelOut[], leadState: undefined }
    }
  }))
  const data: ActiveOrgData = { channels: {}, leadStates: {} }
  for (const entry of entries) {
    data.channels[entry.orgId] = entry.channels
    if (entry.leadState !== undefined) data.leadStates[entry.orgId] = entry.leadState
  }
  return data
}

/** `owner_optout_rule` for the objection dialog; `null` if the setting cannot be read (dialog then warns as if on, A4). */
async function ownerRuleOf(): Promise<boolean | null> {
  try {
    const config = await getCrmConfig()
    return typeof config?.owner_optout_rule === 'boolean' ? config.owner_optout_rule : null
  } catch {
    return null
  }
}

/** "Objection recorded on {date} · {source}"; without a source (objections before the source was stored) only the date. */
function objectionRecordedText(person: CrmPerson, tr: SysAdminTranslations, lang: string): string | null {
  if (!person.optout_at) return null
  const date = new Date(person.optout_at).toLocaleDateString(lang)
  return person.optout_source
    ? tr.crm_person_objection_recorded.replace('{date}', date).replace('{source}', objectionSourceLabel(tr, person.optout_source))
    : tr.crm_person_objection_recorded_date.replace('{date}', date)
}

/**
 * Person page (F7600 org cut, T16): master data, personal channels, relations. Birthday shown only here (AC 36).
 * Follow-up "Widerspruch einer Person im Admin erfassen": banner with date, source and reason of an objection; section
 * "Privacy" with "Record objection" only with crm:suppress_override and without an objection (no way back in the admin).
 */
export default async function CrmPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let person: CrmPerson
  try { person = await getCrmPerson(Number(id)) } catch { notFound() }
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const notObjected = !person.optout
  const [me, orgData, ownerRule] = await Promise.all([
    getAdminMe(), activeOrgDataOf(person), notObjected ? ownerRuleOf() : Promise.resolve(null),
  ])
  const orgChannels = orgData.channels
  const canWrite = crmCan(me, 'crm:contacts:write')
  const canSetTier = crmCan(me, 'crm:lifecycle:write')
  const canObject = notObjected && crmCan(me, 'crm:suppress_override')
  const recorded = objectionRecordedText(person, tr, lang)
  const birthday = formatBirthDate(person.birth_date, person.birth_year_unknown, lang)
  const salutation = salutationLabel(tr, person.salutation)

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Link href="/admin/crm/persons" className="text-sm text-gray-500 hover:underline">{tr.crm_persons_title}</Link>
      <h1 className="text-xl font-semibold">{person.display_name ?? '—'}</h1>
      {person.optout && (
        <div className="flex flex-col gap-1 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" data-testid="person-objection-banner">
          <p>{tr.crm_person_optout_hint}</p>
          {recorded && <p className="font-medium" data-testid="person-objection-recorded">{recorded}</p>}
          {person.optout_reason && (
            <dl className="flex flex-col">
              <dt className="text-xs font-semibold">{tr.crm_person_objection_reason_title}</dt>
              <dd className="whitespace-pre-wrap" data-testid="person-objection-reason">{person.optout_reason}</dd>
            </dl>
          )}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-gray-500">{tr.crm_person_salutation}</dt>
          <dd>{salutation ?? '—'}</dd>
          <dt className="text-gray-500">{tr.crm_birth_date}</dt>
          <dd data-testid="person-birthday">{birthday ?? '—'}</dd>
          {person.address && (
            <>
              <dt className="text-gray-500">{tr.address}</dt>
              <dd>{[person.address.address_line1, person.address.postal_code, person.address.city, person.address.country_code].filter(Boolean).join(', ')}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold">{tr.crm_person_channels_title}</h2>
        <p className="mb-3 text-xs text-gray-500">{tr.crm_person_channels_hint}</p>
        <ChannelEditor
          owner={{ type: 'person', id: person.id }}
          personId={person.id}
          channels={person.channels}
          canWrite={canWrite}
          canSetTier={canSetTier}
          moveTargets={personMoveTargets(person, tr)}
          tr={tr}
        />
      </section>

      {canWrite && <PersonEditForm person={person} tr={tr} lang={lang} />}
      <PersonRelationEditor person={person} orgChannels={orgChannels} tr={tr} canWrite={canWrite} canSetTier={canSetTier} />

      {canObject && (
        <section aria-labelledby="crm-person-privacy-title" className="rounded-xl border border-rose-100 bg-white p-5" data-testid="person-privacy-section">
          <h2 id="crm-person-privacy-title" className="mb-3 text-sm font-semibold">{tr.crm_person_privacy_title}</h2>
          <PersonObjectionAction
            personId={person.id}
            channelCount={objectionChannelCount(person)}
            orgs={objectionOrgsOf(person, orgData.leadStates)}
            ownerRule={ownerRule}
            tr={tr}
          />
        </section>
      )}
    </div>
  )
}
