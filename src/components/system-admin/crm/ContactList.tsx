'use client'
// ─── CRM Contact List (F7600) ─────────────────────────────────────────────────

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CrmContactListItem, CrmLifecycleState } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { LifecycleBadge } from './LifecycleBadge'
import { ALL_LIFECYCLE_STATES } from './transitions'

interface ContactListProps {
  contacts: CrmContactListItem[]
  total: number
  page: number
  limit: number
  q: string
  lifecycleState: string
  tr: SysAdminTranslations
}

export function ContactList({
  contacts,
  total,
  page,
  limit,
  q,
  lifecycleState,
  tr,
}: ContactListProps) {
  const router = useRouter()

  function stateLabel(state: string): string {
    const key = `crm_state_${state}` as keyof SysAdminTranslations
    const val = tr[key]
    return (typeof val === 'string' ? val : null) ?? state
  }

  const totalPages = Math.ceil(total / limit)

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (lifecycleState) params.set('lifecycle_state', lifecycleState)
    params.set('page', String(p))
    return `/admin/crm/contacts?${params.toString()}`
  }

  function filterHref(state: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (state) params.set('lifecycle_state', state)
    return `/admin/crm/contacts?${params.toString()}`
  }

  function handleRowClick(id: number) {
    router.push(`/admin/crm/contacts/${id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={filterHref('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !lifecycleState
              ? 'bg-slate-800 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {tr.crm_filter_all}
        </Link>
        {ALL_LIFECYCLE_STATES.map((state) => (
          <Link
            key={state}
            href={filterHref(state)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              lifecycleState === state
                ? 'bg-slate-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {stateLabel(state)}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-start font-medium text-gray-600 w-8">#</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.crm_col_name}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.crm_col_org}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.crm_col_email}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.crm_col_state}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.crm_col_updated}</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">
                  {tr.no_items}
                </td>
              </tr>
            )}
            {contacts.map((c) => (
              <tr
                key={c.id}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleRowClick(c.id)}
              >
                <td className="px-4 py-3 text-gray-400 text-xs">{c.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {c.display_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">{c.org_name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                  {c.primary_email ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <LifecycleBadge
                    state={c.lifecycle_state}
                    stateLabel={stateLabel(c.lifecycle_state)}
                  />
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(c.updated_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {page > 1 && (
            <a href={pageHref(page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
              {tr.prev}
            </a>
          )}
          <span>
            {tr.showing} {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {tr.of} {total}
          </span>
          {page < totalPages && (
            <a href={pageHref(page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
              {tr.next}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// Keep type reference for transitions
export type { CrmLifecycleState }
