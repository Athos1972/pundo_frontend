'use client'
import Link from 'next/link'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { useLang } from '@/lib/useLang'
import { localePath } from '@/lib/routing'

/** Footer nav links — left column. */
export function FooterLinks({ fallbackLang, hasForShops }: { fallbackLang: Lang; hasForShops: boolean }) {
  const lang = useLang(fallbackLang)
  const tr = t(lang)

  return (
    <nav aria-label="legal" className="flex flex-row flex-wrap gap-x-4 gap-y-2 text-sm text-text-muted">
      <Link href={localePath(lang, '/blog')} className="hover:text-text transition-colors">
        {tr.footer_blog}
      </Link>
      <Link href={localePath(lang, '/guides')} className="hover:text-text transition-colors">
        {tr.footer_guides}
      </Link>
      <Link href={localePath(lang, '/about')} className="hover:text-text transition-colors">
        {tr.footer_about}
      </Link>
      <Link href={localePath(lang, '/help')} className="hover:text-text transition-colors">
        {tr.footer_help}
      </Link>
      {hasForShops && (
        <Link href={localePath(lang, '/for-shops')} className="hover:text-text transition-colors">
          {tr.footer_for_shops}
        </Link>
      )}
      <Link href={localePath(lang, '/contact')} className="hover:text-text transition-colors">
        {tr.footer_contact}
      </Link>
      <Link href={localePath(lang, '/legal/imprint')} className="hover:text-text transition-colors">
        {tr.footer_imprint}
      </Link>
      <Link href={localePath(lang, '/legal/privacy')} className="hover:text-text transition-colors">
        {tr.footer_privacy}
      </Link>
      <Link href={localePath(lang, '/legal/terms')} className="hover:text-text transition-colors">
        {tr.footer_terms}
      </Link>
    </nav>
  )
}

/** Copyright text — right column, alongside social links. */
export function FooterCopyright({ fallbackLang }: { fallbackLang: Lang }) {
  const lang = useLang(fallbackLang)
  const tr = t(lang)
  return (
    <p className="text-sm text-text-muted rtl:text-right">
      {tr.footer_copyright(new Date().getFullYear())}
    </p>
  )
}
