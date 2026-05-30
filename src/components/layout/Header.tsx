import Link from 'next/link'
import { t } from '@/lib/translations'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { UserMenu } from '@/components/layout/UserMenu'
import { NavLinks, NavShopLink } from '@/components/layout/NavLinks'
import { getBrandFromHeaders } from '@/config/brands'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'

interface HeaderProps {
  lang: Lang
}

export async function Header({ lang }: HeaderProps) {
  const [brand, tr] = [await getBrandFromHeaders(), t(lang)]

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center gap-2 md:gap-4">
        <Link href={localePath(lang, '/')} aria-label={`${brand.name} — Zur Startseite`} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.assets.logoSvg} alt={brand.name} className="h-12 w-auto" />
        </Link>

        {brand.nav && brand.nav.length > 0 && (
          <NavLinks items={brand.nav} fallbackLang={lang} />
        )}

        {/* Mobile quick-access icons — search + shops */}
        <div className="flex md:hidden items-center gap-1 ml-auto rtl:ml-0 rtl:mr-auto rtl:flex-row-reverse">
          <Link
            href={localePath(lang, '/search')}
            aria-label={tr.search}
            className="p-2 rounded-lg text-text-muted hover:text-accent hover:bg-surface-alt transition-colors"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <span className="sr-only">{tr.search}</span>
          </Link>
          <NavShopLink fallbackLang={lang} />
        </div>

        <div className="flex items-center gap-3 md:ml-auto rtl:flex-row-reverse">
          <LanguageSwitcher current={lang} />
          <UserMenu lang={lang} />
        </div>
      </div>
    </header>
  )
}
