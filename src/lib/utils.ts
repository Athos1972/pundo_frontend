import type { PriceType, ProductImages } from '@/types/api'
import type { Translations } from '@/lib/translations'

/**
 * Endlicher Betrag >= 0 oder null. Akzeptiert string|number;
 * "None", "null", "", "NaN", "abc" und negative Werte ergeben null (B5900-013).
 */
export function parsePriceAmount(price: string | number | null | undefined): number | null {
  if (price === null || price === undefined) return null
  const n = typeof price === 'number' ? price : /^\s*-?\d+(\.\d+)?\s*$/.test(price) ? parseFloat(price) : NaN
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** "7.99 EUR" oder null, wenn kein gueltiger Betrag vorliegt. */
export function formatAmount(price: string | number | null | undefined, currency: string): string | null {
  const n = parsePriceAmount(price)
  return n === null ? null : `${n.toFixed(2)} ${currency}`
}

/** true nur bei price_type 'fixed' UND gueltigem Betrag (Filter "Nur mit Preis"). */
export function hasNumericPrice(o: { price_type: PriceType; price: string | null }): boolean {
  return o.price_type === 'fixed' && parsePriceAmount(o.price) !== null
}

export function formatPriceOrLabel(
  price: string | null | undefined,
  currency: string,
  priceType: PriceType,
  priceNote: string | null,
  tr: Translations
): { display: string; isNumeric: boolean; note: string | null } {
  switch (priceType) {
    case 'fixed':
    {
      const amount = formatAmount(price, currency)
      if (amount === null) {
        return { display: tr.price_not_available, isNumeric: false, note: priceNote }
      }
      return { display: amount, isNumeric: true, note: priceNote }
    }
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
  return toRelativeImageUrl(images?.[variant]) ?? toRelativeImageUrl(fallback) ?? null
}

/**
 * Builds a wa.me WhatsApp link from an E.164 number and a pre-encoded message text.
 * Everything but digits is stripped as wa.me requires a plain international number
 * (B4900-002: some legacy rows are stored formatted, e.g. '+357 99 000 000').
 */
export function buildWhatsAppUrl(whatsapp: string, text: string): string {
  const number = whatsapp.replace(/\D/g, '')
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

/** Extracts hostname from a URL string, stripping www. Returns null on invalid input. */
export function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
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
