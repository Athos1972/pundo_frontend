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

// Root cause of the missing-image bug (B2250-002):
// The search results list lives in an overflow-y-auto scroll container, not the document
// viewport. Native loading="lazy" fires its intersection check against the wrong root in
// this layout and triggers many images simultaneously when the user scrolls — flooding the
// browser's 6-connection-per-host queue. Aborted requests fire the error event even on
// intact images, leaving cards permanently empty.
//
// Fix: drop loading="lazy". Infinite scroll already limits the DOM to 20 items per page,
// so eager loading 20 card-sized images is fine. Requests start in DOM order at mount
// time rather than in a burst on scroll, which eliminates ERR_ABORTED cascades.
// onError is kept to show the placeholder for genuinely broken/missing images (HTTP 404).
export function ProductCardImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <ImagePlaceholder />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
