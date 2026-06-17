/**
 * Sub-sitemap: product slugs × 6 languages, paginated.
 *
 * Reads ?page=N from the request URL. Each page covers PAGE_SIZE slugs.
 * PAGE_SIZE = 6,376 → 6,376 × 6 langs = 38,256 URLs, safely under Google's 50K limit.
 *
 * The sitemap-index at /sitemap.xml generates entries for each ?page=N
 * dynamically based on the total slug count.
 *
 * Part of the sitemap-index split (ahrefs-seo-audit-remediation-20260616 T-08).
 */
import { getSiteUrl, getSitemap } from '@/lib/seo'
import { LANGS } from '@/lib/lang'

export const revalidate = false

const PAGE_SIZE = 6376

function buildXml(urls: string[]): string {
  const items = urls
    .map((url) => `  <url>\n    <loc>${url}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`)
    .join('\n')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    items +
    `\n</urlset>`
  )
}

export async function GET(request: Request): Promise<Response> {
  const siteUrl = getSiteUrl()
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  let urls: string[] = []
  try {
    const data = await getSitemap()
    const start = (page - 1) * PAGE_SIZE
    const pageslugs = data.products.slice(start, start + PAGE_SIZE)
    urls = LANGS.flatMap((lang) =>
      pageslugs.map(({ slug }) => `${siteUrl}/${lang}/products/${slug}`),
    )
  } catch {
    // Backend unreachable → return empty but valid sitemap
  }

  return new Response(buildXml(urls), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
