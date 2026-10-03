'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface Props {
  caseId: number
  tr: ShopAdminTranslations
}

const FEEDBACK_MAX_LENGTH = 4000

export function ReviewActionBar({ caseId, tr }: Props) {
  const router = useRouter()
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function mapErrorStatus(status: number): string {
    if (status === 409) return tr.catalog_review_conflict_reload
    if (status === 404) return tr.catalog_review_not_found
    return tr.catalog_review_action_failed
  }

  function handleApprove() {
    if (!window.confirm(tr.catalog_review_approve_confirm)) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/shop-admin/catalog-cases/${caseId}/approve`, { method: 'POST' })
        if (res.ok) {
          router.push('/shop-admin/catalog-review')
          router.refresh()
        } else {
          setError(mapErrorStatus(res.status))
        }
      } catch {
        setError(tr.catalog_review_action_failed)
      }
    })
  }

  function handleReject() {
    if (!window.confirm(tr.catalog_review_reject_confirm)) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/shop-admin/catalog-cases/${caseId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback: feedback.trim() || undefined }),
        })
        if (res.ok) {
          router.push('/shop-admin/catalog-review')
          router.refresh()
        } else {
          setError(mapErrorStatus(res.status))
        }
      } catch {
        setError(tr.catalog_review_action_failed)
      }
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          {tr.catalog_review_approve}
        </button>

        {!showFeedback ? (
          <button
            type="button"
            onClick={() => setShowFeedback(true)}
            disabled={isPending}
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            {tr.catalog_review_reject}
          </button>
        ) : null}
      </div>

      {showFeedback && (
        <div className="flex flex-col gap-2 border-s-2 border-red-200 ps-3">
          {/* AC 12 / R3: Reject must never read as "delete" — explain the automatic rework loop. */}
          <p className="text-xs text-gray-600">{tr.catalog_review_reject_explains_rework}</p>
          <label className="text-xs font-medium text-gray-700" htmlFor="catalog-review-reject-feedback">
            {tr.catalog_review_reject_feedback_label}
          </label>
          <textarea
            id="catalog-review-reject-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value.slice(0, FEEDBACK_MAX_LENGTH))}
            maxLength={FEEDBACK_MAX_LENGTH}
            rows={4}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReject}
              disabled={isPending}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {tr.catalog_review_reject}
            </button>
            <button
              type="button"
              onClick={() => setShowFeedback(false)}
              disabled={isPending}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {tr.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
