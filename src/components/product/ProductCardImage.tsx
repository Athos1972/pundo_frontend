'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useScrollRoot } from '@/lib/ScrollRootContext'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500

interface Props {
  src:           string | null | undefined
  src2x?:        string | null  // F4500: 640px Retina variant — sets srcSet="[src] 1x, [src2x] 2x"
  alt:           string
  sizes?:        string         // Hint for browser: how wide is the rendered image
  className?:    string
  fetchpriority?: 'high' | 'low' | 'auto'
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

// B2250-002/B2250-003: `loading="lazy"` checks the *document* viewport, not the
// nested overflow scroll container → images below the fold inside the list never load.
// Fix: IntersectionObserver with `root` set to the nearest scroll container
// (provided via ScrollRootContext). Retries transient network failures up to
// MAX_RETRIES times before falling back to the placeholder.
export function ProductCardImage({ src, src2x, alt, sizes, className, fetchpriority = 'auto' }: Props) {
  const scrollRoot = useScrollRoot()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible]     = useState(false)
  const [failed,  setFailed]      = useState(false)
  const [retries, setRetries]     = useState(0)
  const [retrySrc, setRetrySrc]   = useState<string | undefined>(undefined)

  // Step 1 — IntersectionObserver: only start loading when in/near the scroll viewport
  useEffect(() => {
    if (!src || visible) return
    const el = wrapperRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      {
        root: scrollRoot ?? null,   // scroll container root, or document viewport as fallback
        rootMargin: '300px',        // preload 300 px before entering view
        threshold: 0,
      }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [src, visible, scrollRoot])

  // Step 2 — Retry: on transient 4G timeout, flip retrySrc to bust the browser's
  // internal "this request failed" cache and trigger a fresh fetch.
  const handleError = useCallback(() => {
    if (retries < MAX_RETRIES) {
      const attempt = retries + 1
      setRetries(attempt)
      setTimeout(() => {
        // Append a cache-buster only for retries so normal hits stay cacheable
        setRetrySrc(`${src}${src?.includes('?') ? '&' : '?'}_r=${attempt}`)
      }, RETRY_DELAY_MS * attempt)
    } else {
      setFailed(true)
    }
  }, [retries, src])

  if (!src || failed) return <ImagePlaceholder />

  const effectiveSrc = retrySrc ?? src

  return (
    <div ref={wrapperRef} className={`contents`}>
      {visible ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={effectiveSrc}
          srcSet={src2x ? `${effectiveSrc} 1x, ${src2x} 2x` : undefined}
          sizes={src2x ? (sizes ?? '120px') : undefined}
          alt={alt}
          decoding="async"
          // @ts-expect-error — fetchpriority is a valid HTML attribute, not yet in React types
          fetchpriority={fetchpriority}
          className={className}
          onError={handleError}
        />
      ) : (
        <ImagePlaceholder />
      )}
    </div>
  )
}
