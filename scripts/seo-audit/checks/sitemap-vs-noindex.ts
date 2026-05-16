/**
 * Global check: Sitemap entries that have noindex (AC-30)
 *
 * Crawls each sitemap URL and checks:
 *   1. X-Robots-Tag response header
 *   2. <meta name="robots"> in the HTML (first 2 KB)
 */

export interface SitemapNoindexEntry {
  url: string
  source: 'X-Robots-Tag' | 'meta-robots'
  value: string
}

export function parseRobotsHeader(header: string | null): boolean {
  if (!header) return false
  return header.toLowerCase().includes('noindex')
}

export function parseRobotsMetaFromHtml(html: string): string | null {
  const match = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)
  return match?.[1] ?? null
}

export async function checkSitemapVsNoindex(
  sitemapUrls: string[],
  fetchFn: (url: string, opts?: RequestInit) => Promise<Response>,
  timeoutMs = 10_000,
): Promise<SitemapNoindexEntry[]> {
  const entries: SitemapNoindexEntry[] = []

  for (const url of sitemapUrls) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetchFn(url, { method: 'HEAD', signal: controller.signal })
      clearTimeout(timer)

      const xRobots = res.headers.get('X-Robots-Tag')
      if (parseRobotsHeader(xRobots)) {
        entries.push({ url, source: 'X-Robots-Tag', value: xRobots! })
        continue
      }

      // Fallback: partial GET to check meta robots
      const controller2 = new AbortController()
      const timer2 = setTimeout(() => controller2.abort(), timeoutMs)
      const res2 = await fetchFn(url, {
        method: 'GET',
        signal: controller2.signal,
        headers: { Range: 'bytes=0-4096' },
      })
      clearTimeout(timer2)
      const partial = await res2.text()
      const metaRobots = parseRobotsMetaFromHtml(partial)
      if (metaRobots && metaRobots.toLowerCase().includes('noindex')) {
        entries.push({ url, source: 'meta-robots', value: metaRobots })
      }
    } catch {
      // Network error — skip this URL
    }
  }

  return entries
}

export function formatSitemapVsNoindexSection(entries: SitemapNoindexEntry[]): string {
  if (entries.length === 0) return ''
  const lines = [
    '## Sitemap entries with noindex',
    '',
    '> These URLs appear in sitemap.xml but have a noindex directive.',
    '',
    '| URL | Source | Value |',
    '|---|---|---|',
  ]
  for (const e of entries) {
    lines.push(`| ${e.url} | ${e.source} | ${e.value} |`)
  }
  lines.push('')
  return lines.join('\n')
}
