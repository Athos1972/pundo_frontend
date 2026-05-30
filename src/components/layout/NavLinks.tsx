'use client'
import Link from 'next/link'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { useLang } from '@/lib/useLang'
import { localePath } from '@/lib/routing'

interface NavItem {
  key: string
  href: string
}

/** Desktop nav — hidden on mobile, visible md+. */
export function NavLinks({ items, fallbackLang }: { items: NavItem[]; fallbackLang: Lang }) {
  const lang = useLang(fallbackLang)
  const tr = t(lang)

  return (
    <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
      {items.map(item => (
        <Link
          key={item.href}
          href={localePath(lang, item.href)}
          className="text-sm text-text-muted hover:text-accent transition-colors font-medium"
        >
          {tr[item.key as keyof typeof tr] as string}
        </Link>
      ))}
    </nav>
  )
}

/** Mobile shops icon — visible only below md breakpoint. */
export function NavShopLink({ fallbackLang }: { fallbackLang: Lang }) {
  const lang = useLang(fallbackLang)
  const tr = t(lang)

  return (
    <Link
      href={localePath(lang, '/shops')}
      aria-label={tr.nav_shops}
      className="p-2 rounded-lg text-text-muted hover:text-accent hover:bg-surface-alt transition-colors"
    >
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
      </svg>
      <span className="sr-only">{tr.nav_shops}</span>
    </Link>
  )
}
