'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState } from 'react'
import type { AdminReview } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface Props {
  reviews: AdminReview[]
  tr: ShopAdminTranslations
}

const REASON_KEYS = ['spam', 'offensive', 'legal', 'other'] as const
type ReasonKey = typeof REASON_KEYS[number]

export function ReviewModerationTable({ reviews: initial, tr }: Props) {
  const [reviews, setReviews] = useState(initial)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [reason, setReason] = useState<ReasonKey>('spam')
  const [errorById, setErrorById] = useState<Record<number, string | null>>({})

  async function handleInvalidate(id: number) {
    if (!window.confirm(tr.reviews_confirm_invalidate)) return
    // T1: Use /api/admin/... proxy — attaches admin_token cookie, not customer_token.
    // This ensures the mutation reaches POST /api/v1/admin/reviews/{id}/invalidate on the backend,
    // consistent with the read path used by the SSR loader (reviews/page.tsx).
    // WARNING (R3): admin proxy only carries admin_token; shop_owner_token users may get 401.
    // See 02-architecture.md open question Q2 for follow-up.
    const res = await fetch(`/api/admin/reviews/${id}/invalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // T2: Send the key ('spam' | 'offensive' | 'legal' | 'other') instead of a
      // localised string so the backend stores a language-independent value.
      // TODO: confirm reason payload format with backend (see T5 in 02-architecture.md)
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) => r.id === id ? { ...r, is_visible: false } : r)
      )
      setErrorById((prev) => ({ ...prev, [id]: null }))
    } else {
      setErrorById((prev) => ({ ...prev, [id]: tr.reviews_action_failed }))
    }
    setPendingId(null)
  }

  async function handleRestore(id: number) {
    if (!window.confirm(tr.reviews_confirm_restore)) return
    // T1: Use /api/admin/... proxy — attaches admin_token cookie, not customer_token.
    const res = await fetch(`/api/admin/reviews/${id}/restore`, {
      method: 'POST',
    })
    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) => r.id === id ? { ...r, is_visible: true } : r)
      )
      setErrorById((prev) => ({ ...prev, [id]: null }))
    } else {
      setErrorById((prev) => ({ ...prev, [id]: tr.reviews_action_failed }))
    }
    // T3: reset pendingId after restore too (was missing before)
    setPendingId(null)
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-gray-500">{tr.reviews_no_items}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <article
          key={review.id}
          className={`bg-white border rounded-xl p-4 ${!review.is_visible ? 'opacity-60 border-dashed' : 'border-gray-200'}`}
        >
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-sm text-gray-900">{review.user_display_name}</p>
              <p className="text-xs text-gray-500">
                {review.entity_type === 'product' ? tr.reviews_entity_product : tr.reviews_entity_shop}{' '}
                #{review.entity_id} · {'★'.repeat(review.stars)}
              </p>
              {review.comment && (
                <p className="text-sm text-gray-700 mt-1">{review.comment}</p>
              )}
            </div>

            <div className="flex flex-col items-end gap-1 text-xs shrink-0">
              {!review.is_visible && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                  {tr.reviews_invalidated_badge}
                </span>
              )}
              {review.reporter_count > 0 && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                  {tr.reviews_reported_badge.replace('{n}', review.reporter_count.toString())}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            {review.is_visible ? (
              <>
                {pendingId === review.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value as ReasonKey)}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      {REASON_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {tr[`reviews_reason_${k}` as keyof ShopAdminTranslations] as string}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleInvalidate(review.id)}
                      className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      {tr.reviews_invalidate}
                    </button>
                    <button
                      onClick={() => setPendingId(null)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {tr.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingId(review.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    {tr.reviews_invalidate}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => handleRestore(review.id)}
                className="text-xs text-green-700 hover:underline"
              >
                {tr.reviews_restore}
              </button>
            )}

            <a
              href={`/shop-admin/reviews/${review.id}/audit-log`}
              className="text-xs text-gray-500 hover:underline ms-auto"
            >
              {tr.reviews_audit_log}
            </a>
          </div>

          {/* T3: Inline error feedback — shown per-review, no toast framework needed */}
          {errorById[review.id] && (
            <p className="text-xs text-red-600 mt-2">{errorById[review.id]}</p>
          )}
        </article>
      ))}
    </div>
  )
}
