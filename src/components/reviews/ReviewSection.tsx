import { Suspense } from 'react'
import type { Translations } from '@/lib/translations'
import { getReviews, getReviewStats } from '@/lib/customer-api'
import { ReviewList } from './ReviewList'
import { ReviewStats } from './ReviewStats'
import { ReviewForm } from './ReviewForm'

interface Props {
  entityType: 'product' | 'shop'
  entityId: number
  lang: string
  tr: Translations
}

export async function ReviewSection({ entityType, entityId, lang, tr }: Props) {
  return (
    <section className="bg-surface border border-border rounded-xl p-4 mt-4" aria-label={tr.reviews_title}>
      <h2
        className="font-bold text-sm text-text mb-4"
        style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}
      >
        {tr.reviews_title}
      </h2>

      <Suspense fallback={<ReviewStatsSkeleton />}>
        <ReviewStatsLoader entityType={entityType} entityId={entityId} lang={lang} tr={tr} />
      </Suspense>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-text mb-3">{tr.reviews_write}</h3>
        <ReviewForm entityType={entityType} entityId={entityId} lang={lang} />
      </div>

      <Suspense fallback={<ReviewListSkeleton />}>
        <ReviewListLoader entityType={entityType} entityId={entityId} lang={lang} tr={tr} />
      </Suspense>
    </section>
  )
}

async function ReviewStatsLoader({ entityType, entityId, lang, tr }: Props) {
  const stats = await getReviewStats(entityType, entityId, lang)
  if (!stats || stats.total_count === 0) return null
  return <ReviewStats stats={stats} tr={tr} />
}

async function ReviewListLoader({ entityType, entityId, lang, tr }: Props) {
  const reviews = await getReviews(entityType, entityId, lang)
  return <ReviewList reviews={reviews} tr={tr} lang={lang} />
}

function ReviewStatsSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-4 animate-pulse">
      <div className="w-10 h-8 bg-surface-alt rounded" />
      <div className="space-y-1">
        <div className="w-24 h-4 bg-surface-alt rounded" />
        <div className="w-16 h-3 bg-surface-alt rounded" />
      </div>
    </div>
  )
}

function ReviewListSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="bg-surface-alt rounded-xl p-4 h-20" />
      ))}
    </div>
  )
}
