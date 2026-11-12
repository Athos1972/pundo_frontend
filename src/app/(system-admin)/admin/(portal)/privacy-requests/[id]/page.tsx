import Link from 'next/link'
import { PrivacyCaseActions } from '@/components/system-admin/privacy/PrivacyCaseActions'
import { getLangServer } from '@/lib/lang'
import { getAdminMe, getPrivacyCase } from '@/lib/system-admin-api'
import { tSysAdmin } from '@/lib/system-admin-translations'

export default async function PrivacyRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [lang, data, admin] = await Promise.all([getLangServer(), getPrivacyCase(id), getAdminMe()])
  const tr = tSysAdmin(lang)
  const closed = data.case.status === 'closed' || data.case.status === 'rejected'
  // Privacy permissions are opt-in for editors; unlike generic admin permissions, NULL grants none.
  const canWrite = admin.role === 'superadmin' || admin.permissions?.includes('privacy:write') === true
  return <div className="flex flex-col gap-5"><Link className="text-sm underline" href="/admin/privacy-requests">{tr.privacy_requests_title}</Link><h1 className="text-xl font-semibold">{data.case.case_number}</h1><dl className="grid gap-1 text-sm"><div><dt className="font-medium">{tr.privacy_case_status}</dt><dd>{data.case.status}</dd></div><div><dt className="font-medium">{tr.privacy_case_identity}</dt><dd>{data.case.identity_state}</dd></div><div><dt className="font-medium">{tr.privacy_case_email}</dt><dd>{data.contact ?? '—'}</dd></div><div><dt className="font-medium">{tr.privacy_case_deadline}</dt><dd>{data.case.deadline_at ?? '—'}</dd></div>{data.case.extended_deadline_at ? <div><dt className="font-medium">{tr.privacy_case_extended_deadline}</dt><dd>{data.case.extended_deadline_at}</dd></div> : null}</dl>{closed ? <p>{tr.privacy_case_closed}</p> : data.case.identity_state === 'verified' && canWrite ? <PrivacyCaseActions caseId={id} tr={tr} right={data.case.right} status={data.case.status} canWrite={canWrite} canExecuteErasure={admin.role === 'superadmin'} canExtend={data.case.extended_deadline_at === null} /> : data.case.identity_state !== 'verified' ? <p>{tr.privacy_case_pending_identity}</p> : null}<section><h2 className="font-semibold">{tr.privacy_case_preview}</h2><ul className="mt-2 list-disc ps-5">{data.categories.map(category => <li key={category.id}>{category.id}: {category.count ?? category.state} · {category.strategy}</li>)}</ul></section>{data.correction_note ? <section><h2 className="font-semibold">{tr.privacy_case_correct}</h2><p>{data.correction_note}</p><p className="text-sm text-slate-600">{data.correction_noted_by ?? '—'} · {data.correction_noted_at ?? '—'}</p></section> : null}<section><h2 className="font-semibold">{tr.privacy_case_actions}</h2><ol className="mt-2 list-decimal ps-5">{data.events.map(event => <li key={event.sequence}>{event.action} · {event.outcome} · {tr.privacy_case_actor} {event.actor_id ?? '—'} · {event.occurred_at}</li>)}</ol></section></div>
}
