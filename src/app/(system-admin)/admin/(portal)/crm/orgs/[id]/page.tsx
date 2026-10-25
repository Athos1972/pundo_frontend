// @seo-allow-default
// CRM organisation detail (F7600, org cut; replaces the former contact detail). Exactly one h1 = organisation name (AC 27).
// Sections in this order (Architektur §7): lead status and actions, master data, head office / branches, channels of the
// organisation, contact persons, sources and proofs, outreach, manual documentation, timeline.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getAdminMe, getCrmOrg, getCrmOrgRecipients } from '@/lib/system-admin-api'
import { LifecycleBadge, leadStateLabel } from '@/components/system-admin/crm/LifecycleBadge'
import { OrgLeadActions } from '@/components/system-admin/crm/OrgLeadActions'
import { OrgEditForm } from '@/components/system-admin/crm/OrgEditForm'
import { OrgParentSection } from '@/components/system-admin/crm/OrgParentSection'
import { ChannelEditor, type ChannelMoveTarget } from '@/components/system-admin/crm/ChannelEditor'
import { OrgRelationSection } from '@/components/system-admin/crm/OrgRelationSection'
import { CardImageViewer } from '@/components/system-admin/crm/CardImageViewer'
import { OutreachComposer } from '@/components/system-admin/crm/OutreachComposer'
import { ManualInteractionForm } from '@/components/system-admin/crm/ManualInteractionForm'
import { InteractionTimeline } from '@/components/system-admin/crm/InteractionTimeline'
import { crmCan } from '@/components/system-admin/crm/crmAccess'
import { tierLabel } from '@/components/system-admin/crm/crmLabels'
import type { CrmOrgDetail, CrmOutreachRecipient } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface PageProps {
  params: Promise<{ id: string }>
}

/** Owners an org channel may be moved to (backend rule A-9): an active relation of this org, or its person. */
function orgChannelMoveTargets(org: CrmOrgDetail, tr: SysAdminTranslations): ChannelMoveTarget[] {
  const targets: ChannelMoveTarget[] = []
  const persons = new Set<number>()
  for (const relation of org.relations.filter((r) => r.active)) {
    const name = relation.person.display_name ?? `#${relation.person.id}`
    targets.push({ owner: { type: 'relation', id: relation.id }, label: tr.crm_move_target_relation.replace('{name}', name) })
    if (!persons.has(relation.person.id)) {
      persons.add(relation.person.id)
      targets.push({ owner: { type: 'person', id: relation.person.id }, label: tr.crm_move_target_person.replace('{name}', name) })
    }
  }
  return targets
}

function needsOwnerReview(org: CrmOrgDetail): boolean {
  if (org.open_review_count > 0) return true
  const channels = [...org.channels, ...org.relations.flatMap((r) => [...r.channels, ...r.person_channels])]
  return channels.some((c) => c.owner_review_pending)
}

export default async function CrmOrgDetailPage({ params }: PageProps) {
  const { id } = await params
  const orgId = Number(id)
  if (!Number.isInteger(orgId) || orgId < 1) notFound()

  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  let org: CrmOrgDetail
  try {
    org = await getCrmOrg(orgId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('API_ERROR:404')) notFound()
    throw err
  }

  const [me, recipients] = await Promise.all([
    getAdminMe(),
    // A failing recipient list must not break the page: the composer then says "no recipient".
    getCrmOrgRecipients(orgId).catch(() => [] as CrmOutreachRecipient[]),
  ])
  const canWrite = crmCan(me, 'crm:contacts:write')
  const canLifecycle = crmCan(me, 'crm:lifecycle:write')
  const stateLabel = leadStateLabel(tr, org.lead.state)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/crm/orgs" className="hover:text-gray-700">{tr.crm_orgs_title}</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{org.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-gray-900">{org.name}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {org.city && <span className="text-sm text-gray-600">{org.city}</span>}
            <LifecycleBadge state={org.lead.state} stateLabel={stateLabel} />
          </div>
        </div>
        <div className="text-xs text-gray-400">v{org.lead.version} · #{org.id}</div>
      </div>

      {needsOwnerReview(org) && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <span>{tr.crm_review_hint}</span>
          <Link href="/admin/crm/review?category=channel_owner" className="font-medium underline">{tr.crm_review_open_link}</Link>
        </div>
      )}
      {org.lead.state !== null && !org.reachable && (
        <div role="status" className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          {tr.crm_unreachable_hint}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-5">
          <section className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-800">{tr.crm_lead_section}</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">{tr.crm_col_lead_state}</dt>
              <dd className="text-gray-800">{stateLabel}</dd>
              <dt className="text-gray-500">{tr.crm_detail_legal_tier}</dt>
              <dd className="text-gray-800">{tierLabel(tr, org.lead.effective_legal_tier)}</dd>
              <dt className="text-gray-500">{tr.crm_detail_legal_basis}</dt>
              <dd className="text-gray-800">{tr[`crm_basis_${org.lead.effective_legal_basis}` as const] ?? org.lead.effective_legal_basis}</dd>
              {org.lead.primary_source && (
                <>
                  <dt className="text-gray-500">{tr.crm_detail_primary_source}</dt>
                  <dd className="text-gray-800">{org.lead.primary_source}</dd>
                </>
              )}
              <dt className="text-gray-500">{tr.crm_detail_needs_human}</dt>
              <dd className="text-gray-800">{org.lead.needs_human ? tr.yes : tr.no}</dd>
              <dt className="text-gray-500">{tr.crm_detail_agent_paused}</dt>
              <dd className="text-gray-800">{org.lead.agent_paused ? tr.yes : tr.no}</dd>
            </dl>
            <OrgLeadActions org={org} tr={tr} me={me} />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-800">{tr.crm_master_data}</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">{tr.name}</dt>
              <dd className="text-gray-800 font-medium">{org.name}</dd>
              {org.legal_name && (
                <>
                  <dt className="text-gray-500">{tr.crm_detail_legal_name}</dt>
                  <dd className="text-gray-800">{org.legal_name}</dd>
                </>
              )}
              {org.city && (
                <>
                  <dt className="text-gray-500">{tr.city}</dt>
                  <dd className="text-gray-800">{org.city}</dd>
                </>
              )}
              {org.region && (
                <>
                  <dt className="text-gray-500">{tr.crm_detail_region}</dt>
                  <dd className="text-gray-800">{org.region}</dd>
                </>
              )}
              {org.category && (
                <>
                  <dt className="text-gray-500">{tr.category}</dt>
                  <dd className="text-gray-800">{org.category}</dd>
                </>
              )}
              <dt className="text-gray-500">{tr.crm_detail_business_status}</dt>
              <dd className="text-gray-800">{org.business_status}</dd>
              {org.shop_id !== null && (
                <>
                  <dt className="text-gray-500">{tr.shop_id}</dt>
                  <dd className="text-gray-800">{org.shop_id}</dd>
                </>
              )}
              <dt className="text-gray-500">{tr.created_at}</dt>
              <dd className="text-gray-800 text-xs">{new Date(org.created_at).toLocaleString()}</dd>
              <dt className="text-gray-500">{tr.crm_col_updated}</dt>
              <dd className="text-gray-800 text-xs">{new Date(org.updated_at).toLocaleString()}</dd>
            </dl>
            {canWrite && <OrgEditForm org={org} tr={tr} />}
          </section>

          <OrgParentSection org={org} tr={tr} />

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_org_channels_title}</h2>
            <ChannelEditor
              owner={{ type: 'org', id: org.id }}
              channels={org.channels}
              tr={tr}
              canWrite={canWrite}
              canSetTier={canLifecycle}
              moveTargets={orgChannelMoveTargets(org, tr)}
            />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5" data-testid="crm-contact-persons">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_contact_persons_title}</h2>
            <OrgRelationSection org={org} tr={tr} canWrite={canWrite} canSetTier={canLifecycle} />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_sources_proofs_title}</h2>
            {org.sources.length === 0 ? (
              <p className="text-sm text-gray-400">{tr.no_items}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {org.sources.map((s) => (
                  <li key={s.id} className="flex flex-col gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                    <span>
                      <span className="font-medium">{s.source}</span>
                      {s.source_ref && <span className="text-gray-400"> — {s.source_ref}</span>}
                      <span className="text-gray-400"> · {s.legal_basis} · {new Date(s.observed_at).toLocaleDateString()}</span>
                    </span>
                    <CardImageViewer orgId={org.id} source={s} tr={tr} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">{tr.crm_outreach_title}</h2>
            <OutreachComposer
              org={{ id: org.id, lead: org.lead }}
              recipients={recipients}
              tr={tr}
              canSend={crmCan(me, 'crm:send')}
              canApprove={crmCan(me, 'crm:send_approve')}
            />
          </section>

          {canWrite && (
            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_doc_title}</h2>
              <ManualInteractionForm orgId={org.id} relations={org.relations} tr={tr} />
            </section>
          )}

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_timeline_title}</h2>
            <InteractionTimeline
              interactions={org.interactions}
              messages={org.messages}
              relations={org.relations}
              orgChannels={org.channels}
              tr={tr}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
