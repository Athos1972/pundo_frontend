import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getScrapeRuns } from '@/lib/system-admin-api'

const LIMIT = 50

export default async function ScrapeRunsPage() {
  const tr = tSysAdmin(await getLangServer())
  const data = await getScrapeRuns({ limit: LIMIT }).catch(() => ({ items: [], total: 0, limit: LIMIT, offset: 0 }))
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.scrape_runs_title}</h1>
      {data.items.length === 0 ? <p className="text-sm text-gray-500">{tr.scrape_runs_empty}</p> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 bg-gray-50 text-start text-xs uppercase text-gray-500"><th className="px-4 py-3">{tr.scrape_run_type}</th><th className="px-4 py-3">{tr.scrape_run_status}</th><th className="px-4 py-3">{tr.scrape_run_target}</th><th className="px-4 py-3">{tr.scrape_run_started}</th></tr></thead>
            <tbody>{data.items.map((run) => <tr key={run.id} className="border-b border-gray-100 last:border-0"><td className="px-4 py-3"><Link href={`/admin/scrape-runs/${run.id}`} className="text-slate-700 hover:underline">{run.run_type}</Link></td><td className="px-4 py-3">{run.status}</td><td className="max-w-md break-all px-4 py-3 text-xs text-gray-600">{run.target_url}</td><td className="px-4 py-3 whitespace-nowrap">{new Date(run.started_at).toLocaleString('en-GB')}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
