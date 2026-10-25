// @seo-allow-default
// CRM organisation list (F7600, org cut; replaces the former contact list). Filters: search, lead status, "only acquisition targets".
import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getCrmOrgs } from '@/lib/system-admin-api'
import { OrgList } from '@/components/system-admin/crm/OrgList'
import { ALL_LIFECYCLE_STATES } from '@/components/system-admin/crm/transitions'
import type { CrmLeadState, CrmOrgListItem } from '@/types/system-admin'

const LIMIT = 50
/** Same minimum as the backend (422 org_search_too_short) and crmSearch.ts; crmSearch is a client module, hence no import. */
const ORG_SEARCH_MIN = 2

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; lead_state?: string; lead_only?: string }>
}

export default async function CrmOrgsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1) || 1)
  const q = (sp.q ?? '').trim()
  const leadState = ALL_LIFECYCLE_STATES.includes(sp.lead_state as CrmLeadState) ? (sp.lead_state as CrmLeadState) : ''
  const leadOnly = sp.lead_only === 'true'

  const data = await getCrmOrgs({
    // the backend refuses shorter terms (422 org_search_too_short); a too short term simply does not filter
    q: q.length >= ORG_SEARCH_MIN ? q : undefined,
    lead_state: leadState || undefined,
    lead_only: leadOnly || undefined,
    limit: LIMIT,
    offset: (page - 1) * LIMIT,
  }).catch(() => ({ items: [] as CrmOrgListItem[], total: 0, limit: LIMIT, offset: 0 }))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-gray-900">{tr.crm_orgs_title}</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/crm/persons" className="text-sm text-gray-500 hover:text-gray-700">{tr.crm_persons_title}</Link>
          <Link href="/admin/crm/review" className="text-sm text-gray-500 hover:text-gray-700">{tr.crm_review_title}</Link>
          <Link href="/admin/crm/settings" className="text-sm text-gray-500 hover:text-gray-700">{tr.crm_safety_link}</Link>
          <Link
            href="/admin/crm/orgs/new"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + {tr.crm_org_new}
          </Link>
        </div>
      </div>

      <form method="GET" className="flex gap-2 flex-wrap items-end">
        <input
          name="q"
          defaultValue={q}
          aria-label={tr.crm_org_search_list_placeholder}
          placeholder={tr.crm_org_search_list_placeholder}
          className="flex-1 min-w-48 max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
        {leadState && <input type="hidden" name="lead_state" value={leadState} />}
        {leadOnly && <input type="hidden" name="lead_only" value="true" />}
        <button type="submit" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg">
          {tr.crm_person_search}
        </button>
        {(q || leadState || leadOnly) && (
          <Link href="/admin/crm/orgs" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">{tr.clear}</Link>
        )}
      </form>

      <OrgList
        orgs={data.items}
        total={data.total}
        page={page}
        limit={LIMIT}
        q={q}
        leadState={leadState}
        leadOnly={leadOnly}
        tr={tr}
      />
    </div>
  )
}
