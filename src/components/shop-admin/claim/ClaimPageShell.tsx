// F5970 — shared chrome of the public claim pages (logo header, card). Server Component.
// Only imports from src/components/ui/ and shop-admin code (Clean Boundary).

import type { Lang } from '@/lib/lang'
import { localePath } from '@/lib/routing'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'

interface Props {
  lang: Lang
  title: string
  /** Slug of the shop: adds a link back to its public page. */
  shopSlug?: string | null
  children: React.ReactNode
}

export function ClaimPageShell({ lang, title, shopSlug, children }: Props) {
  const tr = tShopAdminClaim(lang)
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <a href={`/${lang}`} aria-label="pundo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brands/pundo/logo.svg" alt="pundo" className="h-10 w-auto" />
        </a>
        {shopSlug && (
          <a href={localePath(lang, `/shops/${shopSlug}`)} className="text-sm text-text-muted hover:text-text transition-colors">
            {tr.claim_back_to_shop}
          </a>
        )}
      </div>
      <main className="w-full max-w-md bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col gap-5">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {children}
      </main>
    </div>
  )
}
