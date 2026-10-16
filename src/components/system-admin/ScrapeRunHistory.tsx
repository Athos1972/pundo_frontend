import Link from 'next/link'
import type { SysAdminScrapeRun } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

function displayTime(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export function ScrapeRunHistory({ runs, tr }: { runs: SysAdminScrapeRun[]; tr: SysAdminTranslations }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-base font-semibold text-gray-900">{tr.scrape_run_shop_history}</h2>
      {runs.length === 0 ? <p className="mt-3 text-sm text-gray-500">{tr.scrape_runs_empty}</p> : (
        <ul className="mt-3 divide-y divide-gray-100">
          {runs.map((run) => (
            <li key={run.id} className="py-3 text-sm">
              <Link href={`/admin/scrape-runs/${run.id}`} className="font-medium text-slate-700 hover:underline">
                {run.run_type} · {run.status}
              </Link>
              <p className="mt-1 break-all text-xs text-gray-500">{displayTime(run.started_at)} · {run.target_url}</p>
              {run.is_reconstructed && <p className="mt-1 text-xs text-amber-700">{tr.scrape_run_reconstructed}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
