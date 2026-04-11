import type { Review } from '@/types/api'
import type { Translations } from '@/lib/translations'
import { ReviewCard } from './ReviewCard'

interface Props {
  reviews: Review[]
  tr: Translations
}

export function ReviewList({ reviews, tr }: Props) {
  if (reviews.length === 0) {
    return <p className="text-sm text-text-muted">{tr.reviews_no_reviews}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} tr={tr} />
      ))}
    </div>
  )
}
