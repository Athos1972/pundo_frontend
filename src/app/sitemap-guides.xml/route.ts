/**
 * Sub-sitemap: guide slugs × 6 languages.
 * Part of the sitemap-index split (ahrefs-seo-audit-remediation-20260616 T-06).
 */
import { getSiteUrl } from '@/lib/seo'
import { LANGS } from '@/lib/lang'
import { getGuideSlugs } from '@/lib/guides'

export const revalidate = false

function buildXml(urls: string[]): string {
  const items = urls
    .map((url) => `  <url>\n    <loc>${url}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`)
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
  const slugs = getGuideSlugs()

  const urls = LANGS.flatMap((lang) =>
    slugs.map((slug) => `${siteUrl}/${lang}/guides/${slug}`),
  )

  return new Response(buildXml(urls), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
