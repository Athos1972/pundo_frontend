import type { ReviewStats as ReviewStatsType } from '@/types/api'
import type { Translations } from '@/lib/translations'
import { StarRatingDisplay } from './StarRatingDisplay'

interface Props {
  stats: ReviewStatsType
  tr: Translations
}

export function ReviewStats({ stats, tr }: Props) {
  if (stats.total_count === 0) return null

  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-2xl font-bold text-text">{stats.average_stars.toFixed(1)}</span>
      <div>
        <StarRatingDisplay stars={stats.average_stars} />
        <p className="text-xs text-text-muted mt-0.5">{tr.reviews_based_on(stats.total_count)}</p>
      </div>
    </div>
  )
}
