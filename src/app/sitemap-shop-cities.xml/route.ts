/**
 * Sub-sitemap: shop city index pages (/shops/city/[slug]) × 6 languages.
 * B5900-007 — Städte-Index gegen Orphan-Shop-Pages.
 *
 * Only cities returned by GET /shops/cities are included — the backend
 * already applies the min-shop-count threshold (default 5) and the
 * garbage-value blocklist, so no additional thin-content filtering is
 * needed here (02-architecture.md §6.2).
 */
import { getSiteUrl } from '@/lib/seo'
import { getShopCities } from '@/lib/api'
import { LANGS } from '@/lib/lang'

export const revalidate = false

function buildXml(entries: { url: string }[]): string {
  const items = entries
    .map((e) => {
      return `  <url>\n    <loc>${e.url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`
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

export async function GET(): Promise<Response> {
  const siteUrl = getSiteUrl()

  let entries: { url: string }[] = []
  try {
    const { cities } = await getShopCities('en')
    entries = LANGS.flatMap((lang) =>
      cities.map(({ slug }) => ({
        url: `${siteUrl}/${lang}/shops/city/${slug}`,
      })),
    )
  } catch {
    // Backend unreachable → return empty but valid sitemap
  }

  return new Response(buildXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
