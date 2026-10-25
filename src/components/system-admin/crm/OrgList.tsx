'use client'
// ─── CRM organisation list (F7600, org cut; replaces ContactList) ──────────────────────────────────────────────────────
// One row per organisation: name, city, lead status (empty = "no acquisition target"), number of contact persons,
// primary email, last update. Filters: lead status chips and "only acquisition targets" (AC 26). No "—" names any more:
// the organisation name is mandatory.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CrmOrgListItem } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { LifecycleBadge, leadStateLabel } from './LifecycleBadge'
import { ALL_LIFECYCLE_STATES } from './transitions'

export const ORG_LIST_PATH = '/admin/crm/orgs'

interface OrgListProps {
  orgs: CrmOrgListItem[]
  total: number
  page: number
  limit: number
  q: string
  leadState: string
  leadOnly: boolean
  tr: SysAdminTranslations
}

function listHref(params: { q: string; leadState: string; leadOnly: boolean; page?: number }): string {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.leadState) sp.set('lead_state', params.leadState)
  if (params.leadOnly) sp.set('lead_only', 'true')
  if (params.page) sp.set('page', String(params.page))
  const qs = sp.toString()
  return qs ? `${ORG_LIST_PATH}?${qs}` : ORG_LIST_PATH
}

const chip = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
    active ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`

export function OrgList({ orgs, total, page, limit, q, leadState, leadOnly, tr }: OrgListProps) {
  const router = useRouter()
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-col gap-4">
      {/* Filters: lead status chips and "only acquisition targets" */}
      <div className="flex flex-wrap gap-2" data-testid="crm-org-filters">
        <Link href={listHref({ q, leadState: '', leadOnly })} className={chip(!leadState)}>
          {tr.crm_filter_all}
        </Link>
        {ALL_LIFECYCLE_STATES.map((state) => (
          <Link key={state} href={listHref({ q, leadState: state, leadOnly })} className={chip(leadState === state)}>
            {leadStateLabel(tr, state)}
          </Link>
        ))}
        <Link
          href={listHref({ q, leadState, leadOnly: !leadOnly })}
          className={`${chip(leadOnly)} ms-auto`}
          aria-pressed={leadOnly}
        >
          {tr.crm_filter_lead_only}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.crm_col_org}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.city}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.crm_col_lead_state}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.crm_contact_persons_title}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.crm_col_email}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.crm_col_updated}</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">{tr.no_items}</td>
              </tr>
            )}
            {orgs.map((org) => (
              <tr
                key={org.id}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`${ORG_LIST_PATH}/${org.id}`)}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`${ORG_LIST_PATH}/${org.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {org.name}
                  </Link>
                  {org.parent && (
                    <span className="block text-xs text-gray-400">
                      {tr.crm_org_branch_of.replace('{name}', org.parent.name)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{org.city ?? ''}</td>
                <td className="px-4 py-3">
                  <LifecycleBadge state={org.lead_state} stateLabel={leadStateLabel(tr, org.lead_state)} />
                </td>
                <td className="px-4 py-3 text-gray-700">{org.contact_count}</td>
                <td className="px-4 py-3 text-gray-500 text-xs font-mono">{org.primary_email ?? ''}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(org.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {page > 1 && (
            <a href={listHref({ q, leadState, leadOnly, page: page - 1 })} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
              {tr.prev}
            </a>
          )}
          <span>
            {tr.showing} {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {tr.of} {total}
          </span>
          {page < totalPages && (
            <a href={listHref({ q, leadState, leadOnly, page: page + 1 })} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
              {tr.next}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
