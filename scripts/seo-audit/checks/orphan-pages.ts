/**
 * Global check: Orphan pages — in sitemap but no internal inlink (AC-31)
 *
 * Algorithm:
 *   1. Collect all internal <a href> URLs seen across all crawled pages
 *   2. Orphan = Sitemap-URLs minus Σ(all internal links)
 */

export interface OrphanPage {
  url: string
}

/**
 * Compute orphan pages.
 *
 * @param sitemapUrls     All URLs in sitemap.xml
 * @param internalLinkSet Set of all internal href values seen across all pages
 * @param acceptedOrphans Paths/URLs whitelisted as intentionally orphaned
 */
export function computeOrphans(
  sitemapUrls: string[],
  internalLinkSet: Set<string>,
  acceptedOrphans: string[] = [],
): OrphanPage[] {
  const accepted = new Set(acceptedOrphans.map((o) => o.toLowerCase().replace(/\/$/, '')))
  return sitemapUrls
    .filter((url) => {
      // Normalize: strip trailing slash and lowercase for comparison
      const normalised = url.toLowerCase().replace(/\/$/, '')
      if (internalLinkSet.has(url) || internalLinkSet.has(normalised)) return false
      // Also check without origin (just pathname)
      try {
        const { pathname } = new URL(url)
        const normPath = pathname.toLowerCase().replace(/\/$/, '')
        if (internalLinkSet.has(pathname) || internalLinkSet.has(normPath)) return false
        if (accepted.has(normalised) || accepted.has(normPath)) return false
      } catch {
        if (accepted.has(normalised)) return false
      }
      return true
    })
    .map((url) => ({ url }))
}

export function formatOrphanPagesSection(orphans: OrphanPage[], accepted: string[]): string {
  const lines = [
    '## Orphan pages (no internal inlinks)',
    '',
  ]
  if (orphans.length === 0) {
    lines.push('> No orphan pages found.')
  } else {
    lines.push(`> ${orphans.length} page(s) in sitemap but not linked from any other page.`)
    lines.push('')
    for (const o of orphans) {
      lines.push(`- ${o.url}`)
    }
  }
  if (accepted.length > 0) {
    lines.push('')
    lines.push(`> Accepted orphans (whitelisted): ${accepted.join(', ')}`)
  }
  lines.push('')
  return lines.join('\n')
}
