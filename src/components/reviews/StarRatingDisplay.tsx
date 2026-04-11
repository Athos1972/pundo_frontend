// Read-only star rating display

interface Props {
  stars: number    // 0–5, can be float (average)
  size?: 'sm' | 'md'
}

export function StarRatingDisplay({ stars, size = 'md' }: Props) {
  const full = Math.floor(stars)
  const half = stars - full >= 0.5
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <span className={`inline-flex items-center gap-0.5 ${sizeClass}`} aria-label={`${stars} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= full) return <span key={i} aria-hidden="true" className="text-yellow-400">★</span>
        if (i === full + 1 && half) return <span key={i} aria-hidden="true" className="text-yellow-400">½</span>
        return <span key={i} aria-hidden="true" className="text-gray-300">★</span>
      })}
    </span>
  )
}
