'use client'

import { useState } from 'react'

interface Props {
  src:      string | null | undefined
  src2x?:   string | null  // F4500: 640px Retina variant — sets srcSet="[src] 1x, [src2x] 2x"
  alt:      string
  sizes?:   string         // Hint for browser: how wide is the rendered image
  className?: string
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
// Playwright measurement confirmed: Chrome's lazy-load intersection check runs against
// the document viewport, not the nested overflow-y-auto scroll container used by the
// search results list. Images below the document fold but within the scroll container
// stay permanently in complete=false state and are never fetched. Forcing loading=eager
// on those same images makes all 83/83 load immediately with HTTP 200.
// Infinite scroll already limits the DOM to ~20 items per page, so eager loading
// 20 card-sized images is the right trade-off here.
// onError shows the placeholder only for genuinely broken images (HTTP 404 / expired
// token). The token-TTL bug is fixed separately in core/config.py (B2250-003).
export function ProductCardImage({ src, src2x, alt, sizes, className }: Props) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <ImagePlaceholder />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={src2x ? `${src} 1x, ${src2x} 2x` : undefined}
      sizes={src2x ? (sizes ?? '120px') : undefined}
      alt={alt}
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
