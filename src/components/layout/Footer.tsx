import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'

export async function Footer() {
  const lang = await getLangServer()
  const tr = t(lang)

  return (
    <footer className="border-t border-gray-200 mt-auto py-8 px-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="legal" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-2 text-sm text-gray-500">
          <Link href="/about" className="hover:text-gray-900 transition-colors">
            {tr.footer_about}
          </Link>
          <Link href="/contact" className="hover:text-gray-900 transition-colors">
            {tr.footer_contact}
          </Link>
          <Link href="/legal/imprint" className="hover:text-gray-900 transition-colors">
            {tr.footer_imprint}
          </Link>
          <Link href="/legal/privacy" className="hover:text-gray-900 transition-colors">
            {tr.footer_privacy}
          </Link>
          <Link href="/legal/terms" className="hover:text-gray-900 transition-colors">
            {tr.footer_terms}
          </Link>
        </nav>
        <p className="text-sm text-gray-400 rtl:text-right">
          {tr.footer_copyright(new Date().getFullYear())}
        </p>
      </div>
    </footer>
  )
}
