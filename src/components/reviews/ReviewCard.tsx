import type { Review } from '@/types/api'
import type { Translations } from '@/lib/translations'
import { StarRatingDisplay } from './StarRatingDisplay'
import { ReviewPhotoGrid } from './ReviewPhotoGrid'
import { ReportButton } from './ReportButton'

interface Props {
  review: Review
  tr: Translations
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function ReviewCard({ review, tr }: Props) {
  return (
    <article className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-sm text-text">{review.user_display_name}</p>
          <StarRatingDisplay stars={review.stars} size="sm" />
        </div>
        <time dateTime={review.created_at} className="text-xs text-text-muted shrink-0">
          {formatDate(review.created_at)}
        </time>
      </div>

      {review.comment && (
        <p className="text-sm text-text leading-relaxed">{review.comment}</p>
      )}

      <ReviewPhotoGrid photos={review.photos} />

      <div className="mt-3 flex justify-end">
        <ReportButton reviewId={review.id} tr={tr} />
      </div>
    </article>
  )
}
