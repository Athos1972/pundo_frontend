import { getSitemapSlugs } from '@/lib/api'

export function getSiteUrl(): string {
  return process.env.SITE_URL ?? 'https://pundo.cy'
}

export interface SlugEntry {
  slug: string
  lastModified?: string | null
}

export interface SitemapData {
  products: SlugEntry[]
  shops: SlugEntry[]
}

// Frueher paginierten wir hier ueber alle Products/Shops und feuerten ~320
// Backend-Requests parallel (Pool-Exhaustion-Incident 2026-04-22 21:21).
// Inzwischen liefert das Backend alle Slugs in einem einzigen Request —
// siehe ingestor/api/sitemap.py.
export async function getSitemap(): Promise<SitemapData> {
  const data = await getSitemapSlugs()
  return {
    products: data.products.map(p => ({ slug: p.slug, lastModified: null })),
    shops: data.shops.map(s => ({ slug: s.slug, lastModified: s.last_scraped ?? null })),
  }
}
