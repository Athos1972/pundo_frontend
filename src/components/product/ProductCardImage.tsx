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

// Replaces the broken onError/style.display='none' pattern (DOM mutation outside React).
// When the browser aborts an inflight request (fast scroll → connection queue full →
// net::ERR_ABORTED), the error event fires even for existing images. Using React state
// ensures the error is managed by React and resets on re-render with a new src.
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
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
