import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getScrapeRun } from '@/lib/system-admin-api'

export default async function ScrapeRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tr = tSysAdmin(await getLangServer())
  const run = await getScrapeRun(id).catch(() => null)
  if (!run) notFound()
  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/scrape-runs" className="text-sm text-slate-700 hover:underline">← {tr.scrape_run_back}</Link>
      <div><h1 className="text-xl font-semibold text-gray-900">{tr.scrape_run_detail}</h1><p className="mt-1 break-all text-sm text-gray-500">{run.target_url}</p></div>
      {run.is_reconstructed && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{tr.scrape_run_reconstructed}</p>}
      <section className="rounded-xl border border-gray-200 bg-white p-4"><h2 className="font-semibold">{tr.scrape_run_metrics}</h2><pre className="mt-3 overflow-x-auto text-xs text-gray-700">{JSON.stringify(run.metrics, null, 2)}</pre></section>
      <section className="rounded-xl border border-gray-200 bg-white p-4"><h2 className="font-semibold">{tr.scrape_run_result}</h2><pre className="mt-3 overflow-x-auto text-xs text-gray-700">{JSON.stringify(run.result, null, 2)}</pre></section>
      <section className="rounded-xl border border-gray-200 bg-white p-4"><h2 className="font-semibold">{tr.scrape_run_events}</h2><ol className="mt-3 divide-y divide-gray-100">{run.events.map((event) => <li key={event.id} className="py-3"><p className="text-sm font-medium text-gray-800">{event.event_type} · {event.level}</p><p className="text-xs text-gray-500">{new Date(event.occurred_at).toLocaleString('en-GB')}</p><pre className="mt-2 overflow-x-auto text-xs text-gray-700">{JSON.stringify(event.payload, null, 2)}</pre></li>)}</ol></section>
    </div>
  )
}
