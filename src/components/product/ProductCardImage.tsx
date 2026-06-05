'use client'

import { useState } from 'react'

interface Props {
  src: string | null | undefined
  alt: string
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

// Fast-scroll fix: the browser aborts inflight requests (net::ERR_ABORTED) when the
// connection queue fills up, firing the error event even for intact images. A permanent
// `failed` flag (previous approach) left cards blank for the rest of the session.
// Instead we retry up to MAX_RETRIES times. key={retryCount} forces a fresh img element
// (new DOM node, new fetch) on each retry. After MAX_RETRIES real failures the
// placeholder is shown permanently — preventing retry storms on actual 404s.
const MAX_RETRIES = 2

export function ProductCardImage({ src, alt, className }: Props) {
  const [retryCount, setRetryCount] = useState(0)

  if (!src || retryCount >= MAX_RETRIES) {
    return <ImagePlaceholder />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={retryCount}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setRetryCount(c => c + 1)}
    />
  )
}
