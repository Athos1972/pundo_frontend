import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getClaimRequests, getClaimSummary, getMatchingChecks } from '@/lib/system-admin-api'
import type { SysAdminClaimListItem, SysAdminClaimSummary, SysAdminMatchingCheck } from '@/types/system-admin'
import { ClaimQueueTable } from '@/components/system-admin/claims/ClaimQueueTable'
import { MatchingChecksTable } from '@/components/system-admin/claims/MatchingChecksTable'

// F5970 — claim queue: tab "Applications" and tab "Matching checks" (pending shop_claim_checks).
const LIMIT = 50

interface PageProps {
  searchParams: Promise<{ tab?: string; status?: string; kind?: string; sort?: string; page?: string }>
}

export default async function ClaimsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const tab = sp.tab === 'matching' ? 'matching' : 'requests'
  const status = sp.status ?? '' // '' = open + checked (the work list)
  const kind = sp.kind ?? ''
  const sort = sp.sort === 'proof' ? 'proof' : 'age'
  const page = Math.max(1, Number(sp.page ?? 1))

  let summary: SysAdminClaimSummary | null = null
  try { summary = await getClaimSummary() } catch { /* tabs render without counters */ }

  let items: SysAdminClaimListItem[] = []
  let total = 0
  let checks: SysAdminMatchingCheck[] = []
  let loadFailed = false

  if (tab === 'requests') {
    try {
      if (status === '') {
        const base = { kind: kind || undefined, sort, limit: 100 } as const
        const [open, verified] = await Promise.all([
          getClaimRequests({ ...base, status: 'open' }),
          getClaimRequests({ ...base, status: 'verified' }),
        ])
        items = [...open.items, ...verified.items].sort((a, b) =>
          sort === 'proof'
            ? Number(a.status !== 'verified') - Number(b.status !== 'verified') || a.created_at.localeCompare(b.created_at)
            : a.created_at.localeCompare(b.created_at),
        )
        total = items.length
      } else {
        const data = await getClaimRequests({
          status: status === 'all' ? undefined : status, kind: kind || undefined, sort, limit: LIMIT, offset: (page - 1) * LIMIT,
        })
        items = data.items
        total = data.total
      }
    } catch { loadFailed = true }
  } else {
    try { checks = (await getMatchingChecks({ status: 'pending', limit: 100 })).items } catch { loadFailed = true }
  }

  const tabHref = (t: string) => `/admin/claims?tab=${t}`
  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 ${active ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`
  const pages = Math.max(1, Math.ceil(total / LIMIT))
  const pageHref = (p: number) => `/admin/claims?${new URLSearchParams({ tab, status, kind, sort, page: String(p) }).toString()}`

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{tr.claims_title}</h1>
        {summary && (
          <p className="mt-1 text-sm text-gray-500" data-testid="claims-summary">
            {tr.claims_summary_line.replace('{open}', String(summary.open)).replace('{verified}', String(summary.verified)).replace('{disputes}', String(summary.disputes_open))}
          </p>
        )}
      </div>

      <nav className="flex border-b border-gray-200" aria-label={tr.claims_title}>
        <Link href={tabHref('requests')} className={tabClass(tab === 'requests')} data-testid="tab-requests">{tr.claims_tab_requests}</Link>
        <Link href={tabHref('matching')} className={tabClass(tab === 'matching')} data-testid="tab-matching">
          {tr.claims_tab_matching}{summary ? ` (${summary.matching_pending})` : ''}
        </Link>
      </nav>

      {loadFailed && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{tr.claims_load_error}</p>}

      {tab === 'requests' ? (
        <>
          <form method="GET" className="flex flex-wrap gap-2" data-testid="claims-filter">
            <input type="hidden" name="tab" value="requests" />
            <select name="status" defaultValue={status} aria-label={tr.claims_col_state} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">{tr.claims_filter_status_active}</option>
              <option value="all">{tr.claims_filter_status_all}</option>
              <option value="open">{tr.claims_status_open}</option>
              <option value="verified">{tr.claims_status_verified}</option>
              <option value="accepted">{tr.claims_status_accepted}</option>
              <option value="rejected">{tr.claims_status_rejected}</option>
            </select>
            <select name="kind" defaultValue={kind} aria-label={tr.claims_col_type} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">{tr.claims_filter_kind_all}</option>
              <option value="claim">{tr.claims_kind_claim}</option>
              <option value="dispute">{tr.claims_kind_dispute}</option>
            </select>
            <select name="sort" defaultValue={sort} aria-label={tr.claims_sort_label} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="age">{tr.claims_sort_age}</option>
              <option value="proof">{tr.claims_sort_proof}</option>
            </select>
            <button type="submit" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">↵</button>
          </form>

          <ClaimQueueTable items={items} tr={tr} />

          {status !== '' && pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              {page > 1 && <Link href={pageHref(page - 1)} className="underline">←</Link>}
              <span className="text-gray-500">{page} / {pages}</span>
              {page < pages && <Link href={pageHref(page + 1)} className="underline">→</Link>}
            </div>
          )}
        </>
      ) : (
        <MatchingChecksTable checks={checks} tr={tr} />
      )}
    </div>
  )
}
