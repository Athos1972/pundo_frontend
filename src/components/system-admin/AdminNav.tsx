'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

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
    <nav aria-label="System admin navigation">
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-slate-800 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
                aria-current={active ? 'page' : undefined}
              >
                <span aria-hidden="true" className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

interface SysAdminNavProps {
  tr: SysAdminTranslations
  adminEmail: string
}

export function SysAdminNav({ tr, adminEmail }: SysAdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/admin/login')
  }

  const navItems: NavItem[] = [
    { href: '/admin/dashboard', label: tr.nav_dashboard, icon: '⊞' },
    { href: '/admin/shops', label: tr.nav_shops, icon: '🏪' },
    { href: '/admin/shop-types', label: tr.nav_shop_types, icon: '🏷' },
    { href: '/admin/shop-owners', label: tr.nav_shop_owners, icon: '👤' },
    { href: '/admin/products', label: tr.nav_products, icon: '📦' },
    { href: '/admin/categories', label: tr.nav_categories, icon: '🗂' },
    { href: '/admin/brands', label: tr.nav_brands, icon: '✦' },
    { href: '/admin/offers', label: tr.nav_offers, icon: '💰' },
    { href: '/admin/shop-owner-offers', label: tr.nav_so_offers, icon: '🛍' },
    { href: '/admin/api-keys', label: tr.nav_api_keys, icon: '🔑' },
    { href: '/admin/social-link-rules', label: tr.nav_social_link_rules, icon: '🛡' },
  ]

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-e border-gray-200 min-h-screen p-4 gap-4">
        <div className="flex flex-col gap-0.5 pb-2 border-b border-gray-100">
          <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Pundo Admin</span>
          <span className="text-xs text-gray-500 truncate">{adminEmail}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks items={navItems} pathname={pathname} onNavigate={closeMobile} />
        </div>
        <div className="pt-2 border-t border-gray-100">
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
        <span className="font-semibold text-gray-800 text-sm">Pundo Admin</span>
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
            className="absolute start-0 top-0 bottom-0 w-64 bg-white p-4 flex flex-col gap-4 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-gray-500 truncate">{adminEmail}</span>
            <NavLinks items={navItems} pathname={pathname} onNavigate={closeMobile} />
          </div>
        </div>
      )}
    </>
  )
}
