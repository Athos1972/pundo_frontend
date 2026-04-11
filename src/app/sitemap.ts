import type { MetadataRoute } from 'next'
import { getSiteUrl, getAllProductSlugs, getAllShopSlugs } from '@/lib/seo'

export const revalidate = 86400

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
