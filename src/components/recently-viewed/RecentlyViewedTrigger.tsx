'use client'

// =============================================================================
// src/components/recently-viewed/RecentlyViewedTrigger.tsx
//
// Trigger + inline drawer for recently-viewed (pundo 'drawer' mode).
// A small footer link that opens a slide-up panel with the full list.
// =============================================================================

import { useState } from 'react'
import { t } from '@/lib/translations'
import { RecentlyViewedList } from './RecentlyViewedList'

interface RecentlyViewedTriggerProps {
  lang: string
}

export function RecentlyViewedTrigger({ lang }: RecentlyViewedTriggerProps) {
  const tr = t(lang)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-text-muted hover:text-text transition-colors"
      >
        {tr.recently_viewed_heading}
      </button>

      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={tr.recently_viewed_heading}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="relative bg-surface rounded-t-2xl px-4 pt-4 pb-8 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-text">
                {tr.recently_viewed_heading}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-text-muted hover:text-text p-1"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <RecentlyViewedList variant="drawer" lang={lang} />
          </div>
        </div>
      )}
    </>
  )
}
