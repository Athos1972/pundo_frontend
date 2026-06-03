/**
 * Custom sitemap Route Handler — replaces src/app/sitemap.ts (MetadataRoute.Sitemap).
 *
 * Reason for custom handler: Next.js MetadataRoute.Sitemap provides no hook to inject
 * an <?xml-stylesheet?> processing instruction. A Route Handler gives full XML control
 * while keeping the same caching / revalidation semantics (revalidate = false,
 * triggered by POST /api/revalidate-sitemap).
 *
 * SEO-feedback-review-20260603 M7
 */
import { getSiteUrl, getSitemap } from '@/lib/seo'
import { isIndexable } from '@/lib/seo/metadata-defaults'
import { LANGS } from '@/lib/lang'
import { getBlogSlugs } from '@/lib/blog'
import { getGuideSlugs } from '@/lib/guides'

// No automatic revalidation — regeneration is triggered deliberately by deploy.sh
// via POST /api/revalidate-sitemap (same behaviour as the previous sitemap.ts).
export const revalidate = false

// ---------------------------------------------------------------------------
// Static customer routes (all × 6 langs)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// XML generation
// ---------------------------------------------------------------------------

interface SitemapEntry {
  url: string
  lastModified?: Date | string
  changeFrequency?: string
  priority?: number
}

function entriesToXml(entries: SitemapEntry[]): string {
  const items = entries
    .map((e) => {
      const lastmod = e.lastModified
        ? `\n    <lastmod>${new Date(e.lastModified).toISOString().split('T')[0]}</lastmod>`
        : ''
      const changefreq = e.changeFrequency
        ? `\n    <changefreq>${e.changeFrequency}</changefreq>`
        : ''
      const priority =
        e.priority != null
          ? `\n    <priority>${e.priority.toFixed(1)}</priority>`
          : ''
      return `  <url>\n    <loc>${e.url}</loc>${lastmod}${changefreq}${priority}\n  </url>`
    })
    .join('\n')

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    items +
    `\n</urlset>`
  )
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(): Promise<Response> {
  const siteUrl = getSiteUrl()
  const now = new Date()

  // SECURITY/SEO NOTE: Auth routes (/auth/*), shop-admin routes (/shop-admin/*),
  // and system-admin routes (/admin/*) are intentionally excluded.
  // The /search entry is the plain page only — parametrised URLs (?q=...) are noindex.

  // Static routes × 6 languages
  const staticRoutes: SitemapEntry[] = LANGS.flatMap((lang) =>
    STATIC_PATHS.map((path) => {
      // Root path has no trailing slash (Next trailingSlash=false default)
      const suffix = path === '/' ? '' : path
      return {
        url: `${siteUrl}/${lang}${suffix}`,
        lastModified: now,
        changeFrequency: path === '/search' ? 'daily' : path === '/' ? 'weekly' : 'monthly',
        priority: path === '/' ? 1.0 : path === '/search' ? 0.9 : 0.5,
      }
    })
  )

  // Blog slugs × 6 languages
  const blogSlugs = getBlogSlugs()
  const blogRoutes: SitemapEntry[] = LANGS.flatMap((lang) =>
    blogSlugs.map((slug) => ({
      url: `${siteUrl}/${lang}/blog/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))
  )

  // Guide slugs × 6 languages
  const guideSlugs = getGuideSlugs()
  const guideRoutes: SitemapEntry[] = LANGS.flatMap((lang) =>
    guideSlugs.map((slug) => ({
      url: `${siteUrl}/${lang}/guides/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))
  )

  let dynamicRoutes: SitemapEntry[] = []
  try {
    const data = await getSitemap()

    // Products × 6 languages
    const productRoutes: SitemapEntry[] = LANGS.flatMap((lang) =>
      data.products.map(({ slug }) => ({
        url: `${siteUrl}/${lang}/products/${slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      }))
    )

    // Shops × 6 languages
    const shopRoutes: SitemapEntry[] = LANGS.flatMap((lang) =>
      data.shops.map(({ slug, lastModified }) => ({
        url: `${siteUrl}/${lang}/shops/${slug}`,
        lastModified: lastModified ? new Date(lastModified) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
    )

    dynamicRoutes = [...productRoutes, ...shopRoutes]
  } catch {
    // Backend unreachable → serve static routes only (better than no sitemap)
  }

  const allEntries = [...staticRoutes, ...blogRoutes, ...guideRoutes, ...dynamicRoutes].filter(
    (entry) => isIndexable(entry.url).indexable
  )

  const xml = entriesToXml(allEntries)

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Cache-Control mirrors the revalidate=false semantics for CDN/proxies
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
