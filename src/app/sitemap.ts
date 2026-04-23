import type { MetadataRoute } from 'next'
import { getSiteUrl, getSitemap } from '@/lib/seo'

// Kein automatisches Revalidate. Die Sitemap-Regeneration zieht eine einzige
// grosse JSON-Response (alle Slugs) — das wollen wir kontrolliert per Deploy
// triggern, nicht zufaellig durch einen Bot-Crawl. deploy.sh ruft nach
// erfolgreichem Hochfahren POST /api/revalidate-sitemap (Header
// x-revalidate-secret) und holt /sitemap.xml einmal vor.
export const revalidate = false

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()

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

  return [...staticRoutes, ...shopRoutes, ...productRoutes]
}
