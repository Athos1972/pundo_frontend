/**
 * Sub-sitemap: static customer routes × 6 languages.
 * Part of the sitemap-index split (ahrefs-seo-audit-remediation-20260616 T-04).
 */
import { getSiteUrl } from '@/lib/seo'
import { LANGS } from '@/lib/lang'

export const revalidate = false

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

function buildXml(entries: { url: string; changeFrequency: string; priority: number }[]): string {
  const items = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${e.url}</loc>\n    <changefreq>${e.changeFrequency}</changefreq>\n    <priority>${e.priority.toFixed(1)}</priority>\n  </url>`,
    )
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

  const entries = LANGS.flatMap((lang) =>
    STATIC_PATHS.map((path) => {
      const suffix = path === '/' ? '' : path
      return {
        url: `${siteUrl}/${lang}${suffix}`,
        changeFrequency: path === '/search' ? 'daily' : path === '/' ? 'weekly' : 'monthly',
        priority: path === '/' ? 1.0 : path === '/search' ? 0.9 : 0.5,
      }
    }),
  )

  return new Response(buildXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
