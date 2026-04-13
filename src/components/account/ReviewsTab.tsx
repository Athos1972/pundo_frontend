'use client'

import { useState } from 'react'
import { t } from '@/lib/translations'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import type { Review } from '@/types/api'

interface Props {
  reviews: Review[]
  lang: string
}

export function ReviewsTab({ reviews: initialReviews, lang }: Props) {
  const tr = t(lang)
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function handleDelete(id: number) {
    setDeleting(id)
    setError('')
    try {
      const res = await fetch(`/api/customer/customer/reviews/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? tr.error_generic)
      }
      setReviews((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.error_generic)
    } finally {
      setDeleting(null)
      setConfirmId(null)
    }
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-text-muted">{tr.reviews_no_reviews}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-xs text-red-500">{error}</p>}

      {reviews.map((review) => (
        <div key={review.id} className="relative">
          <ReviewCard review={review} tr={tr} lang={lang} />

          <div className="mt-2 flex justify-end">
            {confirmId === review.id ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">{tr.account_delete_review_confirm}</span>
                <button
                  onClick={() => handleDelete(review.id)}
                  disabled={deleting === review.id}
                  className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                >
                  {deleting === review.id ? '…' : tr.reviews_delete}
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="text-xs text-text-muted hover:underline"
                >
                  {tr.back}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmId(review.id)}
                className="text-xs text-red-500 hover:underline"
              >
                {tr.reviews_delete}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
