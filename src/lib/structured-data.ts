import type { ProductDetailResponse, ShopDetailResponse } from '@/types/api'
import { toRelativeImageUrl } from '@/lib/utils'

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

  const relativeImg = toRelativeImageUrl(product.thumbnail_url)
  const image = relativeImg ? `${siteUrl}${relativeImg}` : undefined

  const fixedOffers = product.offers.filter(
    (o) => o.price_type === 'fixed' && o.price != null,
  )

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
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(product.brand?.name
      ? { brand: { '@type': 'Brand', name: product.brand.name } }
      : {}),
    ...(schemaOffers.length > 0 ? { offers: schemaOffers } : {}),
  }
}

export function buildLocalBusinessSchema(
  shop: ShopDetailResponse,
  siteUrl: string,
): Record<string, unknown> {
  const openingHours = toOpeningHoursSpec(shop.opening_hours)

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: shop.name ?? 'Shop',
    url: `${siteUrl}/shops/${shop.slug}`,
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
