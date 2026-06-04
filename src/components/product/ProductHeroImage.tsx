'use client'

import { useEffect, useState } from 'react'

interface Props {
  src: string       // detail-Variante (1024 px) — für den Hero-Container
  origSrc?: string  // orig — für den Fullscreen-Dialog (unveränderte Originalgröße)
  alt: string
}

export function ProductHeroImage({ src, origSrc, alt }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen])

  return (
    <>
      <div
        className="w-36 h-36 flex-shrink-0 bg-surface-alt rounded-xl flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => !failed && setIsOpen(true)}
        role="button"
        aria-label={alt}
        tabIndex={0}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !failed) setIsOpen(true) }}
      >
        {failed ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
          />
        )}
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setIsOpen(false)}
        >
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 text-white text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={origSrc ?? src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
