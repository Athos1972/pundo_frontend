'use client'

import { useState, useCallback } from 'react'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500

interface Props {
  src:            string | null | undefined
  src2x?:         string | null  // F4500: 640px Retina variant — sets srcSet="[src] 1x, [src2x] 2x"
  alt:            string
  sizes?:         string         // Hint for browser: how wide is the rendered image
  className?:     string
  fetchPriority?: 'high' | 'low' | 'auto'
}

function ImagePlaceholder() {
  return (
    <div className="w-full h-full bg-surface-alt flex items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-8 h-8 text-text-muted/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  )
}

// loading="lazy" is intentionally omitted (B2250-002/B2250-003).
// Chrome's lazy-load intersection check runs against the document viewport,
// not the nested overflow-y-auto scroll container — images inside the list
// would never be fetched. Eager loading with ~20 items per page is the right
// trade-off (infinite scroll limits DOM size).
//
// Retry logic (B2250-004): transient 4G timeouts cause onError to fire.
// We retry up to MAX_RETRIES times with a cache-buster query param before
// showing the permanent placeholder.
export function ProductCardImage({ src, src2x, alt, sizes, className, fetchPriority = 'auto' }: Props) {
  const [failed,   setFailed]   = useState(false)
  const [retries,  setRetries]  = useState(0)
  const [retrySrc, setRetrySrc] = useState<string | undefined>(undefined)

  const handleError = useCallback(() => {
    if (retries < MAX_RETRIES) {
      const attempt = retries + 1
      setRetries(attempt)
      setTimeout(() => {
        // Cache-buster only on retries — normal requests stay cacheable
        setRetrySrc(`${src}${src?.includes('?') ? '&' : '?'}_r=${attempt}`)
      }, RETRY_DELAY_MS * attempt)
    } else {
      setFailed(true)
    }
  }, [retries, src])

  if (!src || failed) return <ImagePlaceholder />

  const effectiveSrc = retrySrc ?? src

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={effectiveSrc}
      srcSet={src2x ? `${effectiveSrc} 1x, ${src2x} 2x` : undefined}
      sizes={src2x ? (sizes ?? '120px') : undefined}
      alt={alt}
      decoding="async"
      fetchPriority={fetchPriority}
      className={className}
      onError={handleError}
    />
  )
}
