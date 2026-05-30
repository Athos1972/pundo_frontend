import { getBrandFromHeaders } from '@/config/brands'
import { FooterLinks, FooterCopyright } from '@/components/layout/FooterLinks'
import type { Lang } from '@/lib/lang'

interface FooterProps {
  lang: Lang
}

export async function Footer({ lang }: FooterProps) {
  const brand = await getBrandFromHeaders()
  const hasForShops = brand.nav?.some((item: { key: string }) => item.key === 'nav_for_shops') ?? false

  return (
    <footer className="border-t border-border bg-surface-alt mt-auto py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <FooterLinks fallbackLang={lang} hasForShops={hasForShops} />
        <div className="flex items-center gap-4 shrink-0">
          {brand.socialLinks?.map((link: { platform: string; url: string; label: string }) => (
            <a
              key={link.platform}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text transition-colors"
            >
              {link.platform === 'facebook' && (
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
              )}
              <span className="sr-only">{link.label}</span>
            </a>
          ))}
          <FooterCopyright fallbackLang={lang} />
        </div>
      </div>
    </footer>
  )
}
