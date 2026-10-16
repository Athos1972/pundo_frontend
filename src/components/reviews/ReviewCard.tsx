import type { Review } from '@/types/api'
import type { Translations } from '@/lib/translations'
import { StarRatingDisplay } from './StarRatingDisplay'
import { ReviewPhotoGrid } from './ReviewPhotoGrid'
import { ReportButton } from './ReportButton'

interface Props {
  review: Review
  tr: Translations
  lang: string
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function ReviewCard({ review, tr, lang }: Props) {
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

      {review.owner_reply && (
        <div className="mt-3 border-s-2 border-border ps-3" data-testid="owner-reply">
          <p className="text-xs font-semibold text-text">
            {tr.reviews_owner_reply_from(review.owner_reply.shop_name)}
          </p>
          <time dateTime={review.owner_reply.created_at} className="text-xs text-text-muted">
            {formatDate(review.owner_reply.created_at)}
          </time>
          <p dir="auto" className="text-sm text-text leading-relaxed mt-1 whitespace-pre-line">
            {review.owner_reply.body}
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <ReportButton reviewId={review.id} lang={lang} />
      </div>
    </article>
  )
}
