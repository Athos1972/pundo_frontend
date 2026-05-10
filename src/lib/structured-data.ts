import type { ProductDetailResponse, ShopDetailResponse } from '@/types/api'
import { toRelativeImageUrl } from '@/lib/utils'

/**
 * Converts a potentially relative image URL to an absolute URL using the site base.
 * Returns undefined if no valid URL is provided.
 */
function toAbsoluteImageUrl(url: string | null | undefined, siteUrl: string): string | undefined {
  if (!url) return undefined
  // Already absolute (http/https)
  if (/^https?:\/\//.test(url)) return url
  // Relative path — prepend site URL
  const path = url.startsWith('/') ? url : `/${url}`
  return `${siteUrl}${path}`
}

/** XSS-safe JSON serialization for inline <script> tags. */
export function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\//g, '\\u002f')
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_ABBR: Record<string, string> = {
  mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th', fri: 'Fr', sat: 'Sa', sun: 'Su',
}

/** Converts backend opening_hours Record to Schema.org openingHours strings. */
function toOpeningHoursSpec(
  hours: Record<string, unknown> | null | undefined,
): string[] {
  if (!hours) return []
  const result: string[] = []
  for (const key of DAY_KEYS) {
    const val = hours[key]
    if (typeof val === 'string' && val) {
      const abbr = DAY_ABBR[key]
      result.push(`${abbr} ${val}`)
    }
  }
  return result
}

export function buildProductSchema(
  product: ProductDetailResponse,
  lang: string,
  siteUrl: string,
): Record<string, unknown> {
  const name = product.names[lang] ?? product.names['en'] ?? product.slug
  const description =
    product.descriptions?.[lang] ?? product.descriptions?.['en'] ?? undefined

  const image = toAbsoluteImageUrl(
    toRelativeImageUrl(product.thumbnail_url) ?? product.thumbnail_url,
    siteUrl,
  )

  const fixedOffers = product.offers.filter(
    (o) => o.price_type === 'fixed' && o.price != null,
  )

  // Merchant listing fields required/recommended by Google.
  // Pundo is a local-store price locator — no online shipping, return policy
  // is determined by the individual retailer (MerchantReturnUnspecified).
  const merchantReturnPolicy = {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'CY',
    returnPolicyCategory: 'https://schema.org/MerchantReturnUnspecified',
  }
  const shippingDetails = {
    '@type': 'OfferShippingDetails',
    doesNotShip: true,
  }

  const schemaOffers = fixedOffers.map((o) => ({
    '@type': 'Offer',
    price: o.price,
    priceCurrency: o.currency,
    availability: o.is_available
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    url: o.url ?? `${siteUrl}/products/${product.slug}`,
    seller: {
      '@type': 'Organization',
      name: o.shop_name,
    },
    hasMerchantReturnPolicy: merchantReturnPolicy,
    shippingDetails,
  }))

  // Google requires at least one of: offers, review, or aggregateRating in a
  // Product schema. Provide a minimal fallback offer so the schema is always valid
  // even when no fixed-price offers exist.
  const offers =
    schemaOffers.length > 0
      ? schemaOffers
      : [
          {
            '@type': 'Offer',
            availability: 'https://schema.org/InStock',
            priceCurrency: 'EUR',
            price: '0',
            url: `${siteUrl}/products/${product.slug}`,
            hasMerchantReturnPolicy: merchantReturnPolicy,
            shippingDetails,
          },
        ]

  const stats = product.review_stats
  const aggregateRating =
    stats && stats.total_count > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: stats.average_stars,
          reviewCount: stats.total_count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(product.brand?.name
      ? { brand: { '@type': 'Brand', name: product.brand.name } }
      : {}),
    offers,
    ...(aggregateRating ? { aggregateRating } : {}),
  }
}

export function buildLocalBusinessSchema(
  shop: ShopDetailResponse,
  siteUrl: string,
): Record<string, unknown> {
  const openingHours = toOpeningHoursSpec(shop.opening_hours)

  // Convert relative shop image paths to absolute URLs (required by Google).
  const firstImageUrl = shop.images?.[0]?.url
  const image = toAbsoluteImageUrl(toRelativeImageUrl(firstImageUrl) ?? firstImageUrl, siteUrl)

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: shop.name ?? 'Shop',
    url: `${siteUrl}/shops/${shop.slug}`,
    ...(image ? { image } : {}),
    ...(shop.address_raw
      ? { address: { '@type': 'PostalAddress', streetAddress: shop.address_raw } }
      : {}),
    ...(shop.phone ? { telephone: shop.phone } : {}),
    ...(shop.location
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: shop.location.lat,
            longitude: shop.location.lng,
          },
        }
      : {}),
    ...(openingHours.length > 0 ? { openingHours } : {}),
  }
}
