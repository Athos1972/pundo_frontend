'use client'
// ─── CRM review list (F7600, org cut) ─────────────────────────────────────────────────────────────────────────────────
// Entries of one review category (GET /admin/crm/review?category=…): legacy cases of the migration, "check channel
// assignment" (unclear or conflicting channel owner), relations without role, persons without name parts. Every entry
// links to its organisation and/or person. Stored entries (`id` set) can be closed as done or dismissed
// (POST /review/{id}/resolve); computed entries (`id` null) disappear by themselves once the cause is fixed.
// Legacy entries show the former name and title (payload), which the backend clears when the entry is closed.

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/components/system-admin/Toast'
import { crmPost } from './crmFetch'
import { crmPath } from './crmPaths'
import { channelKindLabel, reviewKindLabel } from './crmLabels'
import type { CrmReviewItemOut, CrmReviewResolveRequest } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface ReviewListProps {
  items: CrmReviewItemOut[]
  tr: SysAdminTranslations
  /** crm:contacts:write — close entries */
  canWrite: boolean
}

export function ReviewList({ items, tr, canWrite }: ReviewListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function resolve(id: number, status: CrmReviewResolveRequest['status']) {
    startTransition(async () => {
      const result = await crmPost<CrmReviewItemOut>(crmPath('reviewResolve', { item_id: id }), { status } satisfies CrmReviewResolveRequest, tr)
      if (result.ok) {
        showToast(tr.crm_review_resolved, 'success')
        router.refresh()
      }
    })
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-400">{tr.crm_review_empty}</p>
  }

  return (
    <ul className="flex flex-col gap-2" data-testid="crm-review-list">
      {items.map((item, index) => {
        const name = typeof item.payload?.display_name === 'string' ? item.payload.display_name : null
        const title = typeof item.payload?.role_title === 'string' ? item.payload.role_title : null
        return (
          <li
            key={item.id ?? `computed-${item.kind}-${item.relation_id ?? ''}-${item.person?.id ?? ''}-${index}`}
            className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-800">
                {reviewKindLabel(tr, item.kind)}
              </span>
              {item.org && (
                <Link href={`/admin/crm/orgs/${item.org.id}`} className="text-sm font-medium text-slate-700 underline">
                  {item.org.name}
                </Link>
              )}
              {item.person && (
                <Link href={`/admin/crm/persons/${item.person.id}`} className="text-sm text-slate-700 underline">
                  {item.person.display_name ?? `#${item.person.id}`}
                </Link>
              )}
              <span className="text-xs text-gray-400 ms-auto">{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            {item.channel && (
              <p className="text-xs text-gray-600">
                {channelKindLabel(tr, item.channel.kind)}: <span className="font-mono">{item.channel.value_normalized}</span>
              </p>
            )}
            {(name || title) && (
              <p className="text-xs text-gray-600">
                {tr.crm_review_payload.replace('{name}', name ?? '—').replace('{title}', title ?? '—')}
              </p>
            )}
            {item.id === null ? (
              <p className="text-xs text-gray-500">{tr.crm_review_computed_hint}</p>
            ) : canWrite && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => resolve(item.id as number, 'resolved')}
                  disabled={isPending}
                  className="px-3 py-1 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
                >
                  {tr.crm_review_resolve}
                </button>
                <button
                  type="button"
                  onClick={() => resolve(item.id as number, 'dismissed')}
                  disabled={isPending}
                  className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {tr.crm_review_dismiss}
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
