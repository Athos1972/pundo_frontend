'use client'

// =============================================================================
// src/components/layout/BottomTabBar.tsx
//
// Mobile-only bottom tab bar. Rendered inside the customer layout.
// Currently provides a "Recently Viewed" tab for brands with
// features.recentlyViewed === 'drawer'.  Future tabs (naidivse nav) can be
// added here as brand-conditional branches.
// =============================================================================

import { useState } from 'react'
import { t } from '@/lib/translations'
import { RecentlyViewedList } from '@/components/recently-viewed/RecentlyViewedList'

interface BottomTabBarProps {
  lang: string
  /** Matches BrandConfig.features.recentlyViewed */
  recentlyViewed: 'hidden' | 'home' | 'drawer'
}

export function BottomTabBar({ lang, recentlyViewed }: BottomTabBarProps) {
  const tr = t(lang)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Only render when there is at least one visible tab
  if (recentlyViewed !== 'drawer') return null

  return (
    <>
      {/* Bar — mobile only */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border flex items-stretch"
        aria-label="Bottom navigation"
      >
        {/* Recently Viewed tab */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-text-muted hover:text-accent transition-colors"
          aria-label={tr.recently_viewed_heading}
        >
          {/* Clock icon */}
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .207.085.394.22.53l2.5 2.5a.75.75 0 101.06-1.06L10.75 9.69V5z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-[10px] leading-none font-medium">{tr.tab_recently_viewed}</span>
        </button>
      </nav>

      {/* Safe-area spacer so page content is not hidden behind the bar */}
      <div className="md:hidden h-14" aria-hidden="true" />

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={tr.recently_viewed_heading}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
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
                onClick={() => setDrawerOpen(false)}
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
