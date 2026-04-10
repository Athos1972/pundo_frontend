'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface NavItem {
  href: string
  label: string
  icon: string
}

interface NavLinksProps {
  items: NavItem[]
  pathname: string
  onNavigate: () => void
}

function NavLinks({ items, pathname, onNavigate }: NavLinksProps) {
  return (
    <nav aria-label="Shop admin navigation">
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
}

export function AdminNav({ tr, ownerName }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/shop-admin/logout', { method: 'POST' }).catch(() => {})
    router.push('/shop-admin/login')
  }

  const navItems: NavItem[] = [
    { href: '/shop-admin/dashboard', label: tr.nav_dashboard, icon: '⊞' },
    { href: '/shop-admin/profile', label: tr.nav_profile, icon: '🏪' },
    { href: '/shop-admin/hours', label: tr.nav_hours, icon: '🕐' },
    { href: '/shop-admin/products', label: tr.nav_products, icon: '📦' },
    { href: '/shop-admin/offers', label: tr.nav_offers, icon: '🏷️' },
    { href: '/shop-admin/import', label: tr.nav_import, icon: '⬆' },
    { href: '/shop-admin/api-keys', label: tr.nav_api_keys, icon: '🔑' },
  ]

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-e border-gray-200 min-h-screen p-4 gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Pundo Shop</span>
          <span className="text-sm font-semibold text-gray-800 truncate">{ownerName}</span>
        </div>
        <NavLinks items={navItems} pathname={pathname} onNavigate={closeMobile} />
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
        <span className="font-semibold text-gray-800 text-sm">Pundo Shop</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
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
            <NavLinks items={navItems} pathname={pathname} onNavigate={closeMobile} />
          </div>
        </div>
      )}
    </>
  )
}
