'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)
// nav_settings added 2026-06-05 (shop-delete-deactivate-20260605)

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { SHOP_REVIEWS_SEEN_EVENT } from './reviews/events'

interface NavItem {
  href: string
  label: string
  icon: string
  /** number of new items: shown as a badge (visible number + screen-reader text) */
  badge?: number
  badgeSrLabel?: string
}

interface NavLinksProps {
  items: NavItem[]
  pathname: string
  onNavigate: () => void
  ariaLabel: string
}

function NavLinks({ items, pathname, onNavigate, ariaLabel }: NavLinksProps) {
  return (
    <nav aria-label={ariaLabel}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-accent text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
                aria-current={active ? 'page' : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
                {item.badge ? (
                  <span className="ms-auto min-w-5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-xs text-center leading-none">
                    <span aria-hidden="true">{item.badge > 99 ? '99+' : item.badge}</span>
                    <span className="sr-only">{item.badgeSrLabel}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

interface AdminNavProps {
  tr: ShopAdminTranslations
  ownerName: string
  /** unseen reviews (F5930), loaded by the portal layout */
  reviewsNewCount?: number
}

export function AdminNav({ tr, ownerName, reviewsNewCount = 0 }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  // The count the user has already seen: derived state, so a changed server value shows the badge again
  const [clearedFor, setClearedFor] = useState<number | null>(null)
  const newReviews = clearedFor === reviewsNewCount ? 0 : reviewsNewCount

  // The layout does not re-render on client navigation: the review list tells us when it marked everything as seen.
  useEffect(() => {
    const clear = () => setClearedFor(reviewsNewCount)
    window.addEventListener(SHOP_REVIEWS_SEEN_EVENT, clear)
    return () => window.removeEventListener(SHOP_REVIEWS_SEEN_EVENT, clear)
  }, [reviewsNewCount])

  async function handleLogout() {
    await fetch('/api/shop-admin/logout', { method: 'POST' }).catch(() => {})
    router.push('/shop-admin/login')
  }

  const navItems: NavItem[] = [
    { href: '/shop-admin/dashboard', label: tr.nav_dashboard, icon: '⊞' },
    { href: '/shop-admin/profile', label: tr.nav_profile, icon: '🏪' },
    { href: '/shop-admin/hours', label: tr.nav_hours, icon: '🕐' },
    // nav_products removed — all product management is now in /offers (unified Item+Offer model)
    { href: '/shop-admin/offers', label: tr.nav_offers, icon: '🏷️' },
    { href: '/shop-admin/catalog-review', label: tr.nav_catalog_review, icon: '🧠' },
    { href: '/shop-admin/import', label: tr.nav_import, icon: '⬆' },
    { href: '/shop-admin/api-keys', label: tr.nav_api_keys, icon: '🔑' },
    {
      href: '/shop-admin/reviews',
      label: tr.nav_reviews,
      icon: '★',
      badge: newReviews,
      badgeSrLabel: tr.shop_reviews_nav_new_sr.replace('{n}', String(newReviews)),
    },
    { href: '/shop-admin/settings', label: tr.nav_settings ?? 'Settings', icon: '⚙️' },
    { href: '/shop-admin/help', label: tr.nav_help, icon: '?' },
  ]

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-e border-gray-200 min-h-screen p-4 gap-6">
        <div className="flex flex-col gap-1">
          {/* @i18n-allow-literal — Produktname */}
          <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Pundo Shop</span>
          <span className="text-sm font-semibold text-gray-800 truncate">{ownerName}</span>
        </div>
        <NavLinks items={navItems} pathname={pathname} onNavigate={closeMobile} ariaLabel={tr.nav_aria} />
        <div className="mt-auto">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-start px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            {tr.logout}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        {/* @i18n-allow-literal — Produktname */}
        <span className="font-semibold text-gray-800 text-sm">Pundo Shop</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={tr.nav_toggle_aria}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <span aria-hidden="true">{mobileOpen ? '✕' : '☰'}</span>
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={closeMobile}
        >
          <div
            className="absolute start-0 top-0 bottom-0 w-64 bg-white p-4 flex flex-col gap-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-semibold text-gray-800">{ownerName}</span>
            <NavLinks items={navItems} pathname={pathname} onNavigate={closeMobile} ariaLabel={tr.nav_aria} />
          </div>
        </div>
      )}
    </>
  )
}
