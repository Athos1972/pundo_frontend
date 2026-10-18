import type { Lang } from '@/lib/lang'
import { tShop } from '@/lib/i18n/shop'

interface Props {
  slug: string
  /** From the public shop API (F5970 A8): an approved, non-system owner is attached. */
  isClaimed: boolean
  lang: Lang
}

/**
 * F5970 -- claim entry on the public shop page (Server Component, no JS).
 *
 * Unclaimed shop: a card with the button "This is my shop". Claimed shop: only a quiet text link for owners who
 * find somebody else managing their shop (dispute path). Both lead to `/shop-admin/claim?shop=<slug>`.
 *
 * Deliberately a plain `<a rel="nofollow">`, not `next/link`: the claim page lives under the shop-admin root layout,
 * so a `Link` would prefetch across the root-layout boundary on every shop page view. `/shop-admin` is an i18n bypass
 * path, hence no `localePath`. No heading level 1 (the shop name is the page's only h1).
 */
export function ShopClaimCta({ slug, isClaimed, lang }: Props) {
  const tr = tShop(lang)
  const href = `/shop-admin/claim?shop=${encodeURIComponent(slug)}`

  if (isClaimed) {
    return (
      <p className="text-xs text-text-muted" data-testid="shop-claim-report">
        <a href={href} rel="nofollow" className="underline hover:text-accent">
          {tr.shop_claim_report_link}
        </a>
      </p>
    )
  }

  return (
    <div
      className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="shop-claim-cta"
    >
      <div className="min-w-0">
        <h2 className="font-bold text-sm text-text font-heading">{tr.shop_claim_cta_title}</h2>
        <p className="text-sm text-text-muted mt-1">{tr.shop_claim_cta_text}</p>
      </div>
      <a
        href={href}
        rel="nofollow"
        className="shrink-0 inline-flex items-center justify-center bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors"
      >
        {tr.shop_claim_cta_button}
      </a>
    </div>
  )
}
