import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { UserMenu } from '@/components/layout/UserMenu'
import { getBrandFromHeaders } from '@/config/brands'

export async function Header() {
  const [lang, brand] = await Promise.all([getLangServer(), getBrandFromHeaders()])

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" aria-label={`${brand.name} — Zur Startseite`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.assets.logoSvg} alt={brand.name} className="h-12 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher current={lang} />
          <UserMenu lang={lang} />
        </div>
      </div>
    </header>
  )
}
