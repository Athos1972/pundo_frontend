import type { MetadataRoute } from 'next'
import { getSiteUrl, getSitemap } from '@/lib/seo'
import { isIndexable } from '@/lib/seo/metadata-defaults'
import { LANGS } from '@/lib/lang'
import { getBlogSlugs } from '@/lib/blog'
import { getGuideSlugs } from '@/lib/guides'

// Kein automatisches Revalidate. Die Sitemap-Regeneration zieht eine einzige
// grosse JSON-Response (alle Slugs) — das wollen wir kontrolliert per Deploy
// triggern, nicht zufaellig durch einen Bot-Crawl. deploy.sh ruft nach
// erfolgreichem Hochfahren POST /api/revalidate-sitemap (Header
// x-revalidate-secret) und holt /sitemap.xml einmal vor.
export const revalidate = false

// Static customer routes that should appear in sitemap (all ×6 langs)
const STATIC_PATHS = [
  '/',
  '/search',
  '/shops',
  '/guides',
  '/blog',
  '/about',
  '/help',
  '/for-shops',
  '/contact',
  '/legal/imprint',
  '/legal/privacy',
  '/legal/terms',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()

  // SECURITY/SEO NOTE: Auth routes (/auth/*), shop-admin routes (/shop-admin/*),
  // and system-admin routes (/admin/*) are intentionally excluded from the sitemap.
  // They are also covered by robots.txt/robots.ts noindex rules.
  // The /search entry is the plain page only — parametrised URLs (?q=...) must
  // NOT appear here (they are served with robots: noindex).

  // Static routes × all 6 languages
  const staticRoutes: MetadataRoute.Sitemap = LANGS.flatMap((lang) =>
    STATIC_PATHS.map((path) => {
      const suffix = path === '/' ? '/' : path
      return {
        url: `${siteUrl}/${lang}${suffix}`,
        lastModified: now,
        changeFrequency: (path === '/search' ? 'daily' : path === '/' ? 'weekly' : 'monthly') as MetadataRoute.Sitemap[number]['changeFrequency'],
        priority: path === '/' ? 1.0 : path === '/search' ? 0.9 : 0.5,
      }
    })
  )

  // Blog slugs × all 6 languages
  const blogSlugs = getBlogSlugs()
  const blogRoutes: MetadataRoute.Sitemap = LANGS.flatMap((lang) =>
    blogSlugs.map((slug) => ({
      url: `${siteUrl}/${lang}/blog/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  )

  // Guide slugs × all 6 languages
  const guideSlugs = getGuideSlugs()
  const guideRoutes: MetadataRoute.Sitemap = LANGS.flatMap((lang) =>
    guideSlugs.map((slug) => ({
      url: `${siteUrl}/${lang}/guides/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  )

  let data: Awaited<ReturnType<typeof getSitemap>>
  try {
    data = await getSitemap()
  } catch {
    // Backend nicht erreichbar → nur die statischen Routen ausliefern,
    // besser als gar keine Sitemap.
    return [...staticRoutes, ...blogRoutes, ...guideRoutes].filter(
      (entry) => isIndexable(entry.url).indexable
    )
  }

  // Products × all 6 languages
  const productRoutes: MetadataRoute.Sitemap = LANGS.flatMap((lang) =>
    data.products.map(({ slug }) => ({
      url: `${siteUrl}/${lang}/products/${slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))
  )

  // Shops × all 6 languages
  const shopRoutes: MetadataRoute.Sitemap = LANGS.flatMap((lang) =>
    data.shops.map(({ slug, lastModified }) => ({
      url: `${siteUrl}/${lang}/shops/${slug}`,
      lastModified: lastModified ? new Date(lastModified) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  )

  const allEntries = [...staticRoutes, ...blogRoutes, ...guideRoutes, ...shopRoutes, ...productRoutes]

  // AC-30: Filter out any URL that would be non-indexable.
  // This prevents noindex pages from leaking into the sitemap, keeping
  // Google's view consistent with our robots directives.
  // Pass the full URL so isIndexable can also check query-string params.
  return allEntries.filter((entry) => isIndexable(entry.url).indexable)
}
