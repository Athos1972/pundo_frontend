'use client'

import { useState } from 'react'

interface Props {
  value: number
  onChange: (stars: number) => void
  label: string
}

export function StarRatingInput({ value, onChange, label }: Props) {
  const [hovered, setHovered] = useState(0)

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-text mb-1">{label}</legend>
      <div className="flex gap-1" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = (hovered || value) >= star
          return (
            <button
              key={star}
              type="button"
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              aria-pressed={value === star}
              className={`text-2xl leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded ${
                active ? 'text-yellow-400' : 'text-gray-300'
              }`}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
            >
              ★
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
