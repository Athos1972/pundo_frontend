import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminMe, getCrmOrg, getCrmPerson } from '@/lib/system-admin-api'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { PersonRelationEditor } from '@/components/system-admin/crm/PersonRelationEditor'
import { PersonEditForm } from '@/components/system-admin/crm/PersonEditForm'
import { ChannelEditor, type ChannelMoveTarget } from '@/components/system-admin/crm/ChannelEditor'
import { crmCan } from '@/components/system-admin/crm/crmAccess'
import { ownerLabel } from '@/components/system-admin/crm/crmLabels'
import { formatBirthDate } from '@/components/system-admin/crm/crmBirthDate'
import { salutationLabel } from '@/components/system-admin/crm/crmPersonName'
import type { CrmChannelOut, CrmPerson } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

/** A personal channel may move to one of the person's active relations (backend rule A-9 of T2/T3). */
function personMoveTargets(person: CrmPerson, tr: SysAdminTranslations): ChannelMoveTarget[] {
  return person.relations
    .filter((relation) => relation.active)
    .map((relation) => ({ owner: { type: 'relation', id: relation.id }, label: `${relation.org.name} (${ownerLabel(tr, 'relation')})` }))
}

/**
 * Channels of the organisations of the active relations (preferred channel may point to one of them, E18). A failing
 * organisation read only empties its choice list; the person page still renders.
 */
async function orgChannelsOf(person: CrmPerson): Promise<Record<number, CrmChannelOut[]>> {
  const orgIds = [...new Set(person.relations.filter((relation) => relation.active).map((relation) => relation.org.id))]
  const entries = await Promise.all(orgIds.map(async (orgId) => {
    try { return [orgId, (await getCrmOrg(orgId)).channels] as const } catch { return [orgId, []] as const }
  }))
  return Object.fromEntries(entries)
}

/** Person page (F7600 org cut, T16): master data, personal channels, relations. Birthday shown only here (AC 36). */
export default async function CrmPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let person: CrmPerson
  try { person = await getCrmPerson(Number(id)) } catch { notFound() }
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const [me, orgChannels] = await Promise.all([getAdminMe(), orgChannelsOf(person)])
  const canWrite = crmCan(me, 'crm:contacts:write')
  const canSetTier = crmCan(me, 'crm:lifecycle:write')
  const birthday = formatBirthDate(person.birth_date, person.birth_year_unknown, lang)
  const salutation = salutationLabel(tr, person.salutation)

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Link href="/admin/crm/persons" className="text-sm text-gray-500 hover:underline">{tr.crm_persons_title}</Link>
      <h1 className="text-xl font-semibold">{person.display_name ?? '—'}</h1>
      {person.optout && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{tr.crm_person_optout_hint}</p>}

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
    </div>
  )
}
