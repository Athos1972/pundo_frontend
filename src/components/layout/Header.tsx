import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { UserMenu } from '@/components/layout/UserMenu'

export async function Header() {
  const lang = await getLangServer()

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" aria-label="pundo — Zur Startseite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pundo-logo.svg" alt="Pundo" className="h-12 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher current={lang} />
          <UserMenu lang={lang} />
        </div>
      </div>
    </header>
  )
}
