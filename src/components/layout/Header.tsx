import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export async function Header() {
  const lang = await getLangServer()

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" aria-label="pundo — Zur Startseite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pundo-logo.svg" alt="Pundo" className="h-12 w-auto" />
        </Link>
        <LanguageSwitcher current={lang} />
      </div>
    </header>
  )
}
