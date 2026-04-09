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
