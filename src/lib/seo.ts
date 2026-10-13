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
//
// Die Antwort ist > 2 MB und wird vom Next.js-Data-Cache abgelehnt. Ohne eigenen
// Cache wuerde jeder Abruf von /sitemap-products.xml (dynamisch wegen ?page=N)
// die komplette Slug-Liste neu laden. Deshalb: Prozess-Cache mit 1 h TTL, geteilt
// von allen Sitemap-Routen. Fehlgeschlagene Loads werden nicht gecacht.
const SITEMAP_TTL_MS = 60 * 60 * 1000
let sitemapCache: { at: number; data: Promise<SitemapData> } | null = null

async function loadSitemap(): Promise<SitemapData> {
  const data = await getSitemapSlugs()
  return {
    products: data.products.map(p => ({ slug: p.slug, lastModified: null })),
    shops: data.shops.map(s => ({ slug: s.slug, lastModified: s.last_scraped ?? null })),
  }
}

export function getSitemap(): Promise<SitemapData> {
  if (sitemapCache && Date.now() - sitemapCache.at < SITEMAP_TTL_MS) {
    return sitemapCache.data
  }
  const data = loadSitemap()
  const entry = { at: Date.now(), data }
  sitemapCache = entry
  data.catch(() => {
    if (sitemapCache === entry) sitemapCache = null
  })
  return data
}
