import type { MetadataRoute } from 'next'
import { getSiteUrl, getSitemap } from '@/lib/seo'
import { isIndexable } from '@/lib/seo/metadata-defaults'

// Kein automatisches Revalidate. Die Sitemap-Regeneration zieht eine einzige
// grosse JSON-Response (alle Slugs) — das wollen wir kontrolliert per Deploy
// triggern, nicht zufaellig durch einen Bot-Crawl. deploy.sh ruft nach
// erfolgreichem Hochfahren POST /api/revalidate-sitemap (Header
// x-revalidate-secret) und holt /sitemap.xml einmal vor.
export const revalidate = false

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()

  // SECURITY/SEO NOTE: Auth routes (/auth/*), shop-admin routes (/shop-admin/*),
  // and system-admin routes (/admin/*) are intentionally excluded from the sitemap.
  // They are also covered by robots.txt/robots.ts noindex rules.
  // The /search entry is the plain page only — parametrised URLs (?q=...) must
  // NOT appear here (they are served with robots: noindex).
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  let data: Awaited<ReturnType<typeof getSitemap>>
  try {
    data = await getSitemap()
  } catch {
    // Backend nicht erreichbar → nur die statischen Routen ausliefern,
    // besser als gar keine Sitemap.
    return staticRoutes
  }

  const productRoutes: MetadataRoute.Sitemap = data.products.map(({ slug }) => ({
    url: `${siteUrl}/products/${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  const shopRoutes: MetadataRoute.Sitemap = data.shops.map(({ slug, lastModified }) => ({
    url: `${siteUrl}/shops/${slug}`,
    lastModified: lastModified ? new Date(lastModified) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const allEntries = [...staticRoutes, ...shopRoutes, ...productRoutes]

  // AC-30: Filter out any URL that would be non-indexable.
  // This prevents noindex pages from leaking into the sitemap, keeping
  // Google's view consistent with our robots directives.
  // Pass the full URL so isIndexable can also check query-string params.
  return allEntries.filter((entry) => isIndexable(entry.url).indexable)
}
