import Link from 'next/link'
import type { ShopListItem } from '@/types/api'
import { t } from '@/lib/translations'
import { StarRatingDisplay } from '@/components/reviews/StarRatingDisplay'
import { ShopAvatar } from '@/components/shop/ShopAvatar'

/** Short language code badges from community votes. Only shown when vote_count ≥ 1. */
function LanguageBadges({ shop, lang }: { shop: ShopListItem; lang: string }) {
  const spoken = shop.spoken_languages ?? []
  const votes = shop.language_votes ?? []
  if (spoken.length === 0) return null

  const badges = spoken
    .map(code => {
      const vote = votes.find(v => v.attribute_type === `language_${code}`)
      if (!vote || vote.vote_count < 1) return null
      return { code, avg: vote.weighted_avg }
    })
    .filter((b): b is { code: string; avg: number } => b !== null)

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-2 rtl:flex-row-reverse">
      {badges.map(({ code, avg }) => (
        <span
          key={code}
          className="inline-flex items-center gap-0.5 text-xs bg-surface-alt border border-border px-1.5 py-0.5 rounded-full text-text-muted"
        >
          <span className="uppercase font-semibold tracking-wide">{code}</span>
          <StarRatingDisplay stars={avg} size="sm" />
        </span>
      ))}
    </div>
  )
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

export function ShopCard({ shop, lang }: { shop: ShopListItem; lang: string }) {
  const tr = t(lang)

  // Shop type: prefer translated name, fall back to canonical
  const shopTypeName = shop.shop_type
    ? (shop.shop_type.translations[lang as keyof typeof shop.shop_type.translations] ?? shop.shop_type.canonical)
    : null

  const hasRating = shop.review_stats != null && shop.review_stats.total_count > 0

  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="block bg-surface border border-border rounded-xl p-4 hover:border-accent transition-colors"
    >
      <div className="flex gap-3 items-start">
        {/* Avatar (favicon or fallback initial) */}
        <ShopAvatar
          favicon_url={shop.favicon_url}
          name={shop.name}
          shopId={shop.id}
          size="md"
        />

        {/* Card content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + Distance */}
          <div className="flex items-start justify-between gap-2">
            <p
              className="font-bold text-text truncate"
              style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}
            >
              {shop.name ?? 'Shop'}
            </p>
            {shop.dist_km != null && (
              <span className="flex-shrink-0 text-sm font-medium text-accent">
                {formatDist(shop.dist_km)}
              </span>
            )}
          </div>

          {/* Row 2: Address */}
          {shop.address_raw && (
            <p className="text-sm text-text-muted truncate mt-0.5">{shop.address_raw}</p>
          )}

          {/* Row 3: Shop type + open/closed badge */}
          {(shopTypeName || shop.is_open_now != null) && (
            <div className="flex items-center flex-wrap gap-1.5 mt-1.5 rtl:flex-row-reverse">
              {shopTypeName && (
                <span className="text-xs bg-surface-alt border border-border text-text-muted px-2 py-0.5 rounded-full">
                  {shopTypeName}
                </span>
              )}
              {shop.is_open_now === true && (
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                  {tr.shop_open_now}
                </span>
              )}
              {shop.is_open_now === false && (
                <span className="text-xs bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {tr.closed}
                </span>
              )}
            </div>
          )}

          {/* Row 4: Rating + product count */}
          <div className="flex items-center justify-between gap-2 mt-1.5 rtl:flex-row-reverse">
            {hasRating ? (
              <div className="flex items-center gap-1.5">
                <StarRatingDisplay stars={shop.review_stats!.average_stars} size="sm" />
                <span className="text-xs text-text-muted">
                  {tr.shop_reviews_count(shop.review_stats!.total_count)}
                </span>
              </div>
            ) : (
              <span />
            )}
            <span className="text-xs text-text-light flex-shrink-0">
              {shop.product_count} {tr.products}
            </span>
          </div>

          {/* Row 5: Language badges */}
          <LanguageBadges shop={shop} lang={lang} />
        </div>
      </div>
    </Link>
  )
}
