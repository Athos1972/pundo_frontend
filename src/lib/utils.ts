import type { PriceType, ProductImages } from '@/types/api'
import type { Translations } from '@/lib/translations'

export function formatPriceOrLabel(
  price: string | null,
  currency: string,
  priceType: PriceType,
  priceNote: string | null,
  tr: Translations
): { display: string; isNumeric: boolean; note: string | null } {
  switch (priceType) {
    case 'fixed':
      return { display: `${fmtPrice(price!)} ${currency}`, isNumeric: true, note: priceNote }
    case 'free':
      return { display: tr.price_free, isNumeric: false, note: priceNote }
    case 'variable':
      return { display: tr.price_variable, isNumeric: false, note: priceNote }
    case 'on_request':
    default:
      return { display: tr.price_on_request, isNumeric: false, note: priceNote }
  }
}

export function formatCrawledAt(crawledAt: string, lang: string): string {
  const date = new Date(crawledAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const labels: Record<string, { today: string; daysAgo: (n: number) => string }> = {
    en: { today: 'today', daysAgo: n => `${n} days ago` },
    de: { today: 'heute', daysAgo: n => `vor ${n} Tagen` },
    ru: { today: 'сегодня', daysAgo: n => `${n} дней назад` },
    el: { today: 'σήμερα', daysAgo: n => `πριν ${n} μέρες` },
  }
  const l = labels[lang] ?? labels.en
  return diffDays === 0 ? l.today : l.daysAgo(diffDays)
}

/** Preis-String aus Backend (z.B. "7.9900") → "7.99" */
export function fmtPrice(price: string): string {
  const n = parseFloat(price)
  return isNaN(n) ? price : n.toFixed(2)
}

export function formatPrice(price: string, currency: string): string {
  return `${fmtPrice(price)} ${currency}`
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`
  return `${grams} g`
}

/**
 * Formatiert das `size`-Attribut aus dem Backend.
 * Mögliche Formen:
 *   { unit: "g",  value: 400.0 }  →  "400 g"  /  "1 kg"
 *   { unit: "ml", value: 100.0 }  →  "100 ml"
 *   "50 cm"                       →  "50 cm"   (Rohstring)
 */
/**
 * Strips an absolute backend origin (e.g. http://localhost:8001) from image URLs
 * so the relative path is served through Next.js rewrites and works on mobile too.
 */
export function toRelativeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname === 'localhost') return u.pathname
  } catch { /* already relative */ }
  return url
}

/**
 * Picks a variant URL from a ProductImages object with graceful fallback.
 * Falls back to toRelativeImageUrl(fallback) when the variant is null/missing.
 */
export function pickImg(
  images: ProductImages | null | undefined,
  variant: keyof ProductImages,
  fallback?: string | null,
): string | null {
  return images?.[variant] ?? toRelativeImageUrl(fallback) ?? null
}

export function formatSizeAttr(size: unknown): string | null {
  if (!size) return null

  // Objekt-Form: { unit, value }
  if (typeof size === 'object' && size !== null) {
    const s = size as Record<string, unknown>
    const value = typeof s.value === 'number' ? s.value : parseFloat(String(s.value))
    const unit = String(s.unit ?? '').toLowerCase()
    if (isNaN(value)) return null

    if (unit === 'g') return formatWeight(value)
    if (unit === 'kg') return formatWeight(value * 1000)
    if (unit === 'ml') return value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} l` : `${value} ml`
    if (unit === 'l') return `${value} l`
    return `${value} ${unit}`
  }

  // String-Form: "50 cm"
  if (typeof size === 'string' && size.trim()) return size.trim()

  return null
}
