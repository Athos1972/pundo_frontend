import Link from 'next/link'
import { t } from '@/lib/translations'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { UserMenu } from '@/components/layout/UserMenu'
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
          <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
            {brand.nav.map((item) => (
              <Link
                key={item.href}
                href={localePath(lang, item.href)}
                className="text-sm text-text-muted hover:text-accent transition-colors font-medium"
              >
                {tr[item.key as keyof typeof tr] as string}
              </Link>
            ))}
          </nav>
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
        </div>

        <div className="flex items-center gap-3 md:ml-auto rtl:flex-row-reverse">
          <LanguageSwitcher current={lang} />
          <UserMenu lang={lang} />
        </div>
      </div>
    </header>
  )
}
