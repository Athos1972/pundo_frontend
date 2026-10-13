/**
 * Sub-sitemap: shop slugs × 6 languages.
 * Part of the sitemap-index split (ahrefs-seo-audit-remediation-20260616 T-07).
 */
import { getSiteUrl, getSitemap } from '@/lib/seo'
import { LANGS } from '@/lib/lang'

// Nicht beim Build prerendern: Der prod-Build-Container erreicht kein Backend,
// der catch unten lieferte dann eine leere Sitemap, die gecacht und bis zum
// naechsten Revalidate (bzw. Deploy) ausgeliefert wurde. Zur Laufzeit gerendert;
// Cache-Control (1 h) entlastet, die Slugs kommen aus dem Prozess-Cache
// von getSitemap() (lib/seo.ts).
export const dynamic = 'force-dynamic'

function buildXml(entries: { url: string; lastmod?: string }[]): string {
  const items = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''
      return `  <url>\n    <loc>${e.url}</loc>${lastmod}\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
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

  let entries: { url: string; lastmod?: string }[] = []
  try {
    const data = await getSitemap()
    entries = LANGS.flatMap((lang) =>
      data.shops.map(({ slug, lastModified }) => ({
        url: `${siteUrl}/${lang}/shops/${slug}`,
        lastmod: lastModified ? new Date(lastModified).toISOString().split('T')[0] : undefined,
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
