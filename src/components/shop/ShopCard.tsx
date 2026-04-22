'use client'

import Link from 'next/link'
import type { ShopListItem } from '@/types/api'
import { t } from '@/lib/translations'
import { StarRatingDisplay } from '@/components/reviews/StarRatingDisplay'
import { ShopAvatar } from '@/components/shop/ShopAvatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { ReviewsPopover } from '@/components/ui/ReviewsPopover'

function ParkingIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </svg>
  )
}

function DeliveryIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

const LANG_NAME_KEYS: Record<string, keyof ReturnType<typeof t>> = {
  en: 'community_vote_language_en',
  de: 'community_vote_language_de',
  el: 'community_vote_language_el',
  ru: 'community_vote_language_ru',
  ar: 'community_vote_language_ar',
  he: 'community_vote_language_he',
}

/** Language badges with tooltips showing full language name */
function LanguageBadges({ shop, lang }: { shop: ShopListItem; lang: string }) {
  const tr = t(lang)
  const spoken = shop.spoken_languages ?? []
  const votes = shop.language_votes ?? []
  if (spoken.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-2 rtl:flex-row-reverse">
      {spoken.map(code => {
        const vote = votes.find(v => v.attribute_type === `language_${code.toLowerCase()}`)
        const hasVote = vote && vote.vote_count >= 1
        const nameKey = LANG_NAME_KEYS[code.toLowerCase()]
        const fullName = nameKey ? (tr[nameKey] as string) : undefined
        return (
          <Tooltip key={code} content={fullName ?? code}>
            <span className="inline-flex items-center gap-0.5 text-xs bg-surface-alt border border-border px-1.5 py-0.5 rounded-full text-text-muted cursor-default">
              <span className="uppercase font-semibold tracking-wide">{code}</span>
              {hasVote && <StarRatingDisplay stars={vote!.weighted_avg} size="sm" />}
            </span>
          </Tooltip>
        )
      })}
    </div>
  )
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

export function ShopCard({ shop, lang }: { shop: ShopListItem; lang: string }) {
  const tr = t(lang)

  const shopTypeName = shop.shop_type
    ? (shop.shop_type.translations[lang as keyof typeof shop.shop_type.translations] ?? shop.shop_type.canonical)
    : null

  const hasRating = shop.review_stats != null && shop.review_stats.total_count > 0
  const showAttrs = shop.has_parking === true || shop.has_own_delivery === true || shop.is_online_only === true

  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="block bg-surface border border-border rounded-xl p-4 hover:border-accent transition-colors"
    >
      <div className="flex gap-3 items-start">
        <ShopAvatar name={shop.name} shopId={shop.id} size="md" />

        <div className="flex-1 min-w-0">
          {/* Row 1: Name + Distance */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-text truncate font-heading">{shop.name ?? 'Shop'}</p>
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

          {/* Row 4: Rating (with Reviews Popover) + product count */}
          <div className="flex items-center justify-between gap-2 mt-1.5 rtl:flex-row-reverse">
            {hasRating ? (
              <ReviewsPopover
                shopId={shop.id}
                shopSlug={shop.slug}
                lang={lang}
                trigger={
                  <button
                    type="button"
                    onClick={e => e.preventDefault()}
                    className="flex items-center gap-1.5 cursor-pointer"
                    aria-label={tr.shop_reviews_count(shop.review_stats!.total_count)}
                  >
                    <StarRatingDisplay stars={shop.review_stats!.average_stars} size="sm" />
                    <span className="text-xs text-text-muted">
                      {tr.shop_reviews_count(shop.review_stats!.total_count)}
                    </span>
                  </button>
                }
              />
            ) : (
              <span />
            )}
            <span className="text-xs text-text-light flex-shrink-0">
              {shop.product_count} {tr.products}
            </span>
          </div>

          {/* Row 5: Parking / Delivery / Online-only icons with tooltips */}
          {showAttrs && (
            <div className="flex items-center gap-2 mt-1.5 text-text-muted rtl:flex-row-reverse">
              {shop.has_parking === true && (
                <Tooltip content={tr.filter_has_parking}>
                  <span className="cursor-default"><ParkingIcon /></span>
                </Tooltip>
              )}
              {shop.has_own_delivery === true && (
                <Tooltip content={tr.filter_has_delivery}>
                  <span className="cursor-default"><DeliveryIcon /></span>
                </Tooltip>
              )}
              {shop.is_online_only === true && (
                <Tooltip content={tr.filter_online_only}>
                  <span className="cursor-default"><GlobeIcon /></span>
                </Tooltip>
              )}
            </div>
          )}

          {/* Row 6: Language badges */}
          <LanguageBadges shop={shop} lang={lang} />
        </div>
      </div>
    </Link>
  )
}
