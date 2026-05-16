import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'

export async function Footer() {
  const lang = await getLangServer()
  const tr = t(lang)

  return (
    <footer className="border-t border-border bg-surface-alt mt-auto py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="legal" className="flex flex-row flex-wrap gap-x-4 gap-y-2 text-sm text-text-muted">
          <Link href="/blog" className="hover:text-text transition-colors">
            {tr.footer_blog}
          </Link>
          <Link href="/guides" className="hover:text-text transition-colors">
            {tr.footer_guides}
          </Link>
          <Link href="/about" className="hover:text-text transition-colors">
            {tr.footer_about}
          </Link>
          <Link href="/help" className="hover:text-text transition-colors">
            {tr.footer_help}
          </Link>
          <Link href="/for-shops" className="hover:text-text transition-colors">
            {tr.footer_for_shops}
          </Link>
          <Link href="/contact" className="hover:text-text transition-colors">
            {tr.footer_contact}
          </Link>
          <Link href="/nostalgia" className="hover:text-text transition-colors">
            {tr.footer_nostalgia}
          </Link>
          <Link href="/homesick" className="hover:text-text transition-colors">
            {tr.footer_homesick}
          </Link>
          <Link href="/legal/imprint" className="hover:text-text transition-colors">
            {tr.footer_imprint}
          </Link>
          <Link href="/legal/privacy" className="hover:text-text transition-colors">
            {tr.footer_privacy}
          </Link>
          <Link href="/legal/terms" className="hover:text-text transition-colors">
            {tr.footer_terms}
          </Link>
        </nav>
        <p className="text-sm text-text-muted rtl:text-right shrink-0">
          {tr.footer_copyright(new Date().getFullYear())}
        </p>
      </div>
    </footer>
  )
}
