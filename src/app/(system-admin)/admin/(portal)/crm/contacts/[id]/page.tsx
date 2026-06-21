// @seo-allow-default
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getCrmContact, getAdminMe } from '@/lib/system-admin-api'
import { LifecycleBadge } from '@/components/system-admin/crm/LifecycleBadge'
import { ChannelEditor } from '@/components/system-admin/crm/ChannelEditor'
import { ContactEditForm } from '@/components/system-admin/crm/ContactEditForm'
import { InteractionTimeline } from '@/components/system-admin/crm/InteractionTimeline'
import { ContactDetailActions } from '@/components/system-admin/crm/ContactDetailActions'
import { OutreachComposer } from '@/components/system-admin/crm/OutreachComposer'
import { CardImageViewer } from '@/components/system-admin/crm/CardImageViewer'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface PageProps {
  params: Promise<{ id: string }>
}

function stateLabel(tr: SysAdminTranslations, state: string): string {
  const key = `crm_state_${state}` as keyof SysAdminTranslations
  const val = tr[key]
  return (typeof val === 'string' ? val : null) ?? state
}

export default async function CrmContactDetailPage({ params }: PageProps) {
  const { id } = await params
  const contactId = parseInt(id, 10)
  if (isNaN(contactId)) notFound()

  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  let contact
  try {
    contact = await getCrmContact(contactId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('404') || msg.includes('API_ERROR:404')) notFound()
    throw err
  }

  // Load current admin profile for permission-gating (Stufe 1)
  const me = await getAdminMe()

  const canWrite = me.role === 'superadmin' || me.permissions == null || me.permissions.includes('crm:contacts:write')

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/crm/contacts" className="hover:text-gray-700">
          {tr.crm_title}
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">
          {contact.display_name ?? contact.org.name} #{contact.id}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-gray-900">
            {contact.display_name ?? '—'}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{contact.org.name}</span>
            {contact.role_title && (
              <span className="text-xs text-gray-400">· {contact.role_title}</span>
            )}
            <LifecycleBadge
              state={contact.lifecycle_state}
              stateLabel={stateLabel(tr, contact.lifecycle_state)}
            />
          </div>
        </div>
        <div className="text-xs text-gray-400">
          v{contact.version} · #{contact.id}
        </div>
      </div>

      {/* Action bar + Edit */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
        <ContactDetailActions contact={contact} tr={tr} me={me} />
        {canWrite && <ContactEditForm contact={contact} tr={tr} />}
      </div>

      {/* Stufe 2: Business card images (only rendered when card_image_front_url is set) */}
      {contact.card_image_front_url && (
        <CardImageViewer
          contactId={contact.id}
          frontKey={contact.card_image_front_url}
          backKey={contact.card_image_back_url ?? null}
          tr={tr}
        />
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Org details + Channels + Sources */}
        <div className="flex flex-col gap-5">
          {/* Organisation */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_detail_org}</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Name</dt>
              <dd className="text-gray-800 font-medium">{contact.org.name}</dd>
              {contact.org.legal_name && (
                <>
                  <dt className="text-gray-500">Legal name</dt>
                  <dd className="text-gray-800">{contact.org.legal_name}</dd>
                </>
              )}
              {contact.org.city && (
                <>
                  <dt className="text-gray-500">City</dt>
                  <dd className="text-gray-800">{contact.org.city}</dd>
                </>
              )}
              {contact.org.category && (
                <>
                  <dt className="text-gray-500">Category</dt>
                  <dd className="text-gray-800">{contact.org.category}</dd>
                </>
              )}
              <dt className="text-gray-500">Business status</dt>
              <dd className="text-gray-800">{contact.org.business_status}</dd>
              {contact.shop_id && (
                <>
                  <dt className="text-gray-500">Shop ID</dt>
                  <dd className="text-gray-800">{contact.shop_id}</dd>
                </>
              )}
            </dl>
          </section>

          {/* Legal */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_detail_legal}</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Legal tier</dt>
              <dd className="text-gray-800">{contact.effective_legal_tier}</dd>
              <dt className="text-gray-500">Legal basis</dt>
              <dd className="text-gray-800">{contact.effective_legal_basis}</dd>
            </dl>
          </section>

          {/* Flags */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_detail_flags}</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Needs human</dt>
              <dd className="text-gray-800">{contact.needs_human ? 'Yes' : 'No'}</dd>
              <dt className="text-gray-500">Agent paused</dt>
              <dd className="text-gray-800">{contact.agent_paused ? 'Yes' : 'No'}</dd>
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-800 text-xs">{new Date(contact.created_at).toLocaleString()}</dd>
              <dt className="text-gray-500">Updated</dt>
              <dd className="text-gray-800 text-xs">{new Date(contact.updated_at).toLocaleString()}</dd>
            </dl>
          </section>

          {/* Channels */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_channels_title}</h2>
            <ChannelEditor contact={contact} tr={tr} canWrite={canWrite} />
          </section>

          {/* Sources */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_sources_title}</h2>
            {contact.sources.length === 0 ? (
              <p className="text-sm text-gray-400">{tr.no_items}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {contact.sources.map((s) => (
                  <li key={s.id} className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-medium">{s.source}</span>
                    {s.source_ref && <span className="text-gray-400"> — {s.source_ref}</span>}
                    <span className="text-gray-400"> · {s.legal_basis} · {new Date(s.observed_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right: Outreach Composer + Timeline */}
        <div className="flex flex-col gap-5">
          {/* Outreach Composer */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Outreach</h2>
            <OutreachComposer contact={contact} tr={tr} />
          </section>

          {/* Interaction Timeline */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_timeline_title}</h2>
            <InteractionTimeline
              interactions={contact.interactions}
              messages={contact.messages}
              tr={tr}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
