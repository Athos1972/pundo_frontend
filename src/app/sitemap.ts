import type { MetadataRoute } from 'next'
import { getSiteUrl, getAllProductSlugs, getAllShopSlugs } from '@/lib/seo'

// Kein automatisches Revalidate. Die Sitemap-Regeneration zieht ~125
// Backend-Requests (siehe seo.ts) — das wollen wir kontrolliert per Deploy
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

  const [productResult, shopResult] = await Promise.allSettled([
    getAllProductSlugs(),
    getAllShopSlugs(),
  ])

  const productRoutes: MetadataRoute.Sitemap =
    productResult.status === 'fulfilled'
      ? productResult.value.map(({ slug }) => ({
          url: `${siteUrl}/products/${slug}`,
          lastModified: now,
          changeFrequency: 'daily' as const,
          priority: 0.7,
        }))
      : []

  const shopRoutes: MetadataRoute.Sitemap =
    shopResult.status === 'fulfilled'
      ? shopResult.value.map(({ slug, lastModified }) => ({
          url: `${siteUrl}/shops/${slug}`,
          lastModified: lastModified ? new Date(lastModified) : now,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }))
      : []

  return [...staticRoutes, ...shopRoutes, ...productRoutes]
}
