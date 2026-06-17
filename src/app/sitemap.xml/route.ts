/**
 * Sitemap Index — replaces the monolithic sitemap.
 *
 * Returns a <sitemapindex> pointing at sub-sitemaps. The monolith exceeded
 * Google's 50,000-URL limit which caused Google to ignore it entirely
 * (ahrefs-seo-audit-remediation-20260616 §3.1).
 *
 * Sub-sitemaps:
 *   /sitemap-static.xml     ~78 URLs  (static routes × 6 langs)
 *   /sitemap-blog.xml       ~200 URLs (blog slugs × 6 langs)
 *   /sitemap-guides.xml     ~300 URLs (guide slugs × 6 langs)
 *   /sitemap-shops.xml      ~5000 URLs (shop slugs × 6 langs)
 *   /sitemap-products.xml?page=N  ≤38,256 URLs each (6,376 slugs × 6 langs)
 *
 * The product page count is computed dynamically so new slugs automatically
 * get covered without a code change.
 */
import { getSiteUrl, getSitemap } from '@/lib/seo'

// No automatic revalidation — regeneration is triggered deliberately by deploy.sh
// via POST /api/revalidate-sitemap.
export const revalidate = false

const PAGE_SIZE = 6376 // slugs per product sub-sitemap page; × 6 langs = 38,256 URLs ≤ 50K

export async function GET(): Promise<Response> {
  const siteUrl = getSiteUrl()

  // Determine how many product sub-sitemaps are needed
  let totalProductPages = 1
  try {
    const data = await getSitemap()
    totalProductPages = Math.max(1, Math.ceil(data.products.length / PAGE_SIZE))
  } catch {
    // Backend unreachable → emit at least page=1 so the index is still valid
  }

  const productEntries = Array.from({ length: totalProductPages }, (_, i) => {
    const page = i + 1
    return `  <sitemap><loc>${siteUrl}/sitemap-products.xml?page=${page}</loc></sitemap>`
  })

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <sitemap><loc>${siteUrl}/sitemap-static.xml</loc></sitemap>\n` +
    `  <sitemap><loc>${siteUrl}/sitemap-blog.xml</loc></sitemap>\n` +
    `  <sitemap><loc>${siteUrl}/sitemap-guides.xml</loc></sitemap>\n` +
    `  <sitemap><loc>${siteUrl}/sitemap-shops.xml</loc></sitemap>\n` +
    productEntries.join('\n') + '\n' +
    `</sitemapindex>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
