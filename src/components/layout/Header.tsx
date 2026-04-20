import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { UserMenu } from '@/components/layout/UserMenu'
import { getBrandFromHeaders } from '@/config/brands'

export async function Header() {
  const [lang, brand] = await Promise.all([getLangServer(), getBrandFromHeaders()])
  const tr = t(lang)

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
        <Link href="/" aria-label={`${brand.name} — Zur Startseite`} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.assets.logoSvg} alt={brand.name} className="h-12 w-auto" />
        </Link>

        {brand.nav && brand.nav.length > 0 && (
          <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
            {brand.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-text-muted hover:text-accent transition-colors font-medium"
              >
                {tr[item.key as keyof typeof tr] as string}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3 ml-auto">
          <LanguageSwitcher current={lang} />
          <UserMenu lang={lang} />
        </div>
      </div>
    </header>
  )
}
