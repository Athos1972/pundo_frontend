'use client'

interface Props {
  value: number | null  // 1–5, null = no vote
  onChange: (v: number) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

// Star rating input: 1–5 filled stars, tap to set, tap same to deselect to null
export function VoteSlider({ value, onChange, disabled, size = 'md' }: Props) {
  const starSize = size === 'sm' ? 'text-lg' : 'text-2xl'

  return (
    <div className="flex gap-1" role="group" aria-label="Rating 1–5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          aria-pressed={value === star}
          onClick={() => onChange(value === star ? 0 : star)}
          className={[
            starSize,
            'leading-none transition-transform active:scale-110',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110',
            value != null && star <= value ? 'text-amber-400' : 'text-gray-300',
          ].join(' ')}
        >
          ★
        </button>
      ))}
    </div>
  )
}
