import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { getPrivacyCases, getPrivacyMetrics } from '@/lib/system-admin-api'
import { tSysAdmin } from '@/lib/system-admin-translations'

export default async function PrivacyRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; right?: string; brand?: string }> }) {
  const filters = await searchParams
  const [lang, data, metrics] = await Promise.all([getLangServer(), getPrivacyCases(filters), getPrivacyMetrics()])
  const tr = tSysAdmin(lang)
  const signal = (value: 'green' | 'amber' | 'red' | null | undefined) => value === 'red' ? tr.privacy_signal_red : value === 'amber' ? tr.privacy_signal_amber : value === 'green' ? tr.privacy_signal_green : '—'
  return <div className="flex flex-col gap-5">
    <h1 className="text-xl font-semibold">{tr.privacy_requests_title}</h1>
    <div className="grid gap-3 sm:grid-cols-3"><p className="rounded border bg-white p-3">{tr.privacy_metrics_open}: {metrics.open}</p><p className="rounded border bg-white p-3">{tr.privacy_metrics_overdue}: {metrics.overdue}</p><p className="rounded border bg-white p-3">{tr.privacy_metrics_median}: {metrics.median_duration_hours ?? '—'}</p></div>
    <form className="flex flex-wrap gap-2" method="get"><select aria-label={tr.privacy_filter_status} name="status" defaultValue={filters.status ?? ''}><option value="">{tr.privacy_filter_all}</option><option value="open">open</option><option value="extended">extended</option><option value="closed">closed</option></select><select aria-label={tr.privacy_filter_right} name="right" defaultValue={filters.right ?? ''}><option value="">{tr.privacy_filter_all}</option><option value="access">access</option><option value="export">export</option><option value="erasure">erasure</option><option value="correction">correction</option></select><select aria-label={tr.privacy_filter_brand} name="brand" defaultValue={filters.brand ?? ''}><option value="">{tr.privacy_filter_all}</option><option value="pundo">Pundo</option><option value="naidivse">Naidivse</option></select><button className="rounded border px-3 py-1" type="submit">{tr.privacy_filter_apply}</button><Link className="rounded bg-slate-800 px-3 py-1 text-white" href="/admin/privacy-requests/new">{tr.privacy_case_new}</Link></form>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-start"><th className="p-3 text-start">{tr.privacy_case_number}</th><th className="p-3 text-start">{tr.privacy_case_right}</th><th className="p-3 text-start">{tr.privacy_case_status}</th><th className="p-3 text-start">{tr.privacy_case_deadline}</th><th className="p-3 text-start">{tr.privacy_case_signal}</th></tr></thead><tbody>{data.items.length === 0 ? <tr><td colSpan={5} className="p-3 text-gray-500">{tr.privacy_cases_empty}</td></tr> : data.items.map(item => <tr key={item.id} className="border-t"><td className="p-3"><Link className="font-medium hover:underline" href={`/admin/privacy-requests/${item.id}`}>{item.case_number}</Link></td><td className="p-3">{item.right}</td><td className="p-3">{item.status}</td><td className="p-3">{item.deadline_at ? new Date(item.deadline_at).toLocaleDateString() : '—'}</td><td className="p-3">{signal(item.deadline_signal)}</td></tr>)}</tbody></table></div>
  </div>
}
