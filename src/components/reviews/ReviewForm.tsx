'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { t } from '@/lib/translations'
import type { CreateReviewRequest } from '@/types/api'
import { useSession } from '@/components/auth/SessionProvider'
import { StarRatingInput } from './StarRatingInput'
import { PhotoUploader } from './PhotoUploader'
import { ModerationBadge } from './ModerationBadge'

interface Props {
  entityType: 'product' | 'shop'
  entityId: number
  lang: string
}

export function ReviewForm({ entityType, entityId, lang }: Props) {
  const tr = t(lang)
  const session = useSession()
  const router = useRouter()
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submittedReviewId, setSubmittedReviewId] = useState<number | null>(null)
  const [photoUploaded, setPhotoUploaded] = useState(false)

  if (!session.is_authenticated) {
    return (
      <p className="text-sm text-text-muted">
        <Link href="/auth/login" className="text-accent hover:underline">{tr.auth_login}</Link>
        {' '}{tr.reviews_login_required.replace(tr.auth_login, '').trim()}
      </p>
    )
  }

  if (submittedReviewId !== null) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm text-green-800 font-medium">{tr.reviews_success}</p>
        <PhotoUploader
          reviewId={submittedReviewId}
          tr={tr}
          onUploaded={() => setPhotoUploaded(true)}
        />
        {photoUploaded && <ModerationBadge reviewId={submittedReviewId} tr={tr} />}
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (stars === 0) return
    setError('')
    setLoading(true)

    const body: CreateReviewRequest = {
      entity_type: entityType,
      entity_id: entityId,
      stars,
      comment: comment.trim() || undefined,
    }

    try {
      const res = await fetch('/api/customer/customer/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        setError(tr.reviews_already_reviewed)
        return
      }
      if (!res.ok) {
        setError(tr.error_generic)
        return
      }

      const data = await res.json() as { id: number }
      setSubmittedReviewId(data.id)
      router.refresh()
    } catch {
      setError(tr.error_generic)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <StarRatingInput value={stars} onChange={setStars} label={tr.reviews_stars} />

      <div>
        <label htmlFor="review_comment" className="block text-sm font-medium text-text mb-1">
          {tr.reviews_comment}
        </label>
        <textarea
          id="review_comment"
          rows={3}
          maxLength={2000}
          placeholder={tr.reviews_comment_placeholder}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || stars === 0}
        className="self-start px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-60"
      >
        {loading ? tr.reviews_saving : tr.reviews_submit}
      </button>
    </form>
  )
}
