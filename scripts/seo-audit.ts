#!/usr/bin/env tsx
/**
 * SEO Audit Script — pundo_frontend
 *
 * Crawls a running frontend instance and checks each page for:
 *   - Title (default vs. own, length 50–60)
 *   - Description (length 110–160, missing)
 *   - Canonical link
 *   - H1 count + empty H1
 *   - HTML lang attribute
 *   - Open Graph completeness (all AC-40 required tags)
 *   - Images without alt (or empty alt on non-decorative images)
 *   - Internal links without visible anchor text
 *   - Internal link targets that return 4xx/5xx
 *   - External links with their HTTP status
 *   - [Global] Sitemap-vs-noindex cross-check
 *   - [Global] Orphan pages (in sitemap but no internal inlink)
 *   - [Global] Internal links pointing to 3xx redirects
 *
 * Usage:
 *   pnpm tsx scripts/seo-audit.ts
 *   SEO_AUDIT_BASE_URL=http://localhost:3500 pnpm tsx scripts/seo-audit.ts
 *   SEO_AUDIT_BASE_URL=https://naidivse.cy pnpm tsx scripts/seo-audit.ts
 *
 * Output: seo-audit-<date>.json + seo-audit-<date>.md in project root.
 *
 * Exit codes:
 *   0 = all checks passed thresholds
 *   1 = one or more threshold violations
 */

import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { auditConfig } from './seo-audit.config.js'
import { checkTitleLength, formatTitleLengthSection, type TitleLengthViolation } from './seo-audit/checks/title-length.js'
import { checkDescriptionLength, formatDescriptionLengthSection, type DescriptionLengthViolation } from './seo-audit/checks/description-length.js'
import { checkOgCompleteness, formatOgCompletenessSection, type OgGap } from './seo-audit/checks/og-completeness.js'
import { checkH1Empty, formatH1EmptySection, type EmptyH1 } from './seo-audit/checks/h1-empty.js'
import { formatSitemapVsNoindexSection, type SitemapNoindexEntry } from './seo-audit/checks/sitemap-vs-noindex.js'
import { computeOrphans, formatOrphanPagesSection, type OrphanPage } from './seo-audit/checks/orphan-pages.js'
import { checkInternalLink, formatInternalRedirectsSection, type InternalRedirect } from './seo-audit/checks/internal-redirects.js'

const BASE_URL = auditConfig.baseUrl
const BRAND_DEFAULT_TITLES = ['pundo', 'naidivse']
const TIMEOUT_MS = 15_000
const EXTERNAL_TIMEOUT_MS = 10_000

// Thresholds for exit code 1
const THRESHOLD_TITLE_DEFAULT_PCT = 5  // > 5% pages with default title
// Any indexable page with h1_count != 1 → fail

interface PageAuditResult {
  url: string
  status: number | null
  title: string | null
  title_is_default: boolean
  description: string | null
  canonical: string | null
  og_image: string | null
  og_tags: Record<string, string>
  h1_count: number
  h1_text_contents: string[]
  lang_attr: string | null
  is_indexable: boolean
  images_missing_alt: string[]
  hreflang_tags: Array<{ hreflang: string; href: string }>
  internal_links_missing_anchor: string[]
  internal_links_4xx_5xx: Array<{ href: string; status: number }>
  external_links: Array<{ href: string; status: number | null }>
  all_internal_links: string[]
}

async function fetchUrlStatus(url: string): Promise<number | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), EXTERNAL_TIMEOUT_MS)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)
    return res.status
  } catch {
    return null
  }
}

async function discoverUrls(baseUrl: string): Promise<string[]> {
  const urls: string[] = []

  // Static routes always included
  urls.push(baseUrl + '/')
  urls.push(baseUrl + '/search')
  urls.push(baseUrl + '/shops')
  urls.push(baseUrl + '/guides')

  // Try sitemap.xml
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(`${baseUrl}/sitemap.xml`, { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) {
      const xml = await res.text()
      const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g)
      for (const m of matches) {
        const u = m[1].trim()
        if (u && !urls.includes(u)) urls.push(u)
      }
    }
  } catch {
    console.warn('[seo-audit] Could not fetch sitemap.xml')
  }

  return urls
}

async function auditPage(
  page: import('@playwright/test').Page,
  url: string,
  baseUrl: string,
): Promise<PageAuditResult> {
  let status: number | null = null

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS })
    status = response?.status() ?? null
  } catch {
    return {
      url, status: null, title: null, title_is_default: false,
      description: null, canonical: null, og_image: null, og_tags: {},
      h1_count: 0, h1_text_contents: [],
      lang_attr: null, is_indexable: false,
      images_missing_alt: [], hreflang_tags: [],
      internal_links_missing_anchor: [], internal_links_4xx_5xx: [],
      external_links: [], all_internal_links: [],
    }
  }

  const result = await page.evaluate((args) => {
    const { brandDefaults, baseOrigin } = args
    const doc = document

    const title = doc.title ?? null
    const titleIsDefault = brandDefaults.some(
      (d: string) => title?.toLowerCase() === d.toLowerCase() || title === d,
    )

    const descEl = doc.querySelector('meta[name="description"]') as HTMLMetaElement | null
    const canonicalEl = doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    const ogImageEl = doc.querySelector('meta[property="og:image"]') as HTMLMetaElement | null
    const robotsEl = doc.querySelector('meta[name="robots"]') as HTMLMetaElement | null

    const h1s = doc.querySelectorAll('h1')
    const langAttr = doc.documentElement.getAttribute('lang')

    const robotsContent = robotsEl?.content?.toLowerCase() ?? ''
    const isIndexable = !robotsContent.includes('noindex')

    // Collect all OG meta tags (property + name attributes) for completeness check
    const ogTags: Record<string, string> = {}
    doc.querySelectorAll('meta[property]').forEach((el) => {
      const prop = el.getAttribute('property')
      const content = (el as HTMLMetaElement).content
      if (prop && content) ogTags[prop] = content
    })
    doc.querySelectorAll('meta[name^="twitter:"]').forEach((el) => {
      const name = el.getAttribute('name')
      const content = (el as HTMLMetaElement).content
      if (name && content) ogTags[name] = content
    })

    // Collect H1 text contents for empty-H1 check
    const h1TextContents: string[] = []
    h1s.forEach((h) => h1TextContents.push(h.textContent ?? ''))

    // Images missing alt
    const imgsMissingAlt: string[] = []
    doc.querySelectorAll('img').forEach((img) => {
      // Decorative: aria-hidden="true" or role="presentation" → skip
      if (img.getAttribute('aria-hidden') === 'true') return
      if (img.getAttribute('role') === 'presentation') return
      const alt = img.getAttribute('alt')
      if (alt === null || (alt === '' && img.getAttribute('aria-hidden') !== 'true')) {
        imgsMissingAlt.push(img.src || img.getAttribute('data-src') || '(unknown)')
      }
    })

    // hreflang tags
    const hreflangTags: Array<{ hreflang: string; href: string }> = []
    doc.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => {
      hreflangTags.push({
        hreflang: el.getAttribute('hreflang') ?? '',
        href: el.getAttribute('href') ?? '',
      })
    })

    // Internal links missing anchor text
    const internalMissingAnchor: string[] = []
    const internalLinks: string[] = []
    const externalLinks: string[] = []

    doc.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') ?? ''
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return

      const isInternal = href.startsWith('/') || href.startsWith(baseOrigin)
      const absHref = href.startsWith('/') ? baseOrigin + href : href

      // Check anchor text: text content OR img alt (for image links)
      const textContent = (a.textContent ?? '').trim()
      const imgAlt = (a.querySelector('img') as HTMLImageElement | null)?.alt?.trim() ?? ''
      const hasAnchorText = textContent.length > 0 || imgAlt.length > 0

      if (isInternal) {
        if (!hasAnchorText) internalMissingAnchor.push(absHref)
        if (!internalLinks.includes(absHref)) internalLinks.push(absHref)
      } else {
        if (!externalLinks.includes(absHref)) externalLinks.push(absHref)
      }
    })

    return {
      title,
      titleIsDefault,
      description: descEl?.content ?? null,
      canonical: canonicalEl?.href ?? null,
      ogImage: ogImageEl?.content ?? null,
      ogTags,
      h1Count: h1s.length,
      h1TextContents,
      langAttr,
      isIndexable,
      imgsMissingAlt,
      hreflangTags,
      internalMissingAnchor,
      internalLinks,
      externalLinks,
    }
  }, { brandDefaults: BRAND_DEFAULT_TITLES, baseOrigin: new URL(baseUrl).origin })

  // Check internal link targets (4xx/5xx) — limit to avoid too many requests
  const internalLinks4xx5xx: Array<{ href: string; status: number }> = []
  for (const link of result.internalLinks.slice(0, 30)) {
    const st = await fetchUrlStatus(link)
    if (st && st >= 400) {
      internalLinks4xx5xx.push({ href: link, status: st })
    }
  }

  // Check external link statuses — limit to 20
  const externalLinksChecked: Array<{ href: string; status: number | null }> = []
  for (const link of result.externalLinks.slice(0, 20)) {
    const st = await fetchUrlStatus(link)
    externalLinksChecked.push({ href: link, status: st })
  }

  return {
    url,
    status,
    title: result.title,
    title_is_default: result.titleIsDefault,
    description: result.description,
    canonical: result.canonical,
    og_image: result.ogImage,
    og_tags: result.ogTags,
    h1_count: result.h1Count,
    h1_text_contents: result.h1TextContents,
    lang_attr: result.langAttr,
    is_indexable: result.isIndexable,
    images_missing_alt: result.imgsMissingAlt,
    hreflang_tags: result.hreflangTags,
    internal_links_missing_anchor: result.internalMissingAnchor,
    internal_links_4xx_5xx: internalLinks4xx5xx,
    external_links: externalLinksChecked,
    all_internal_links: result.internalLinks,
  }
}

function generateMarkdown(
  results: PageAuditResult[],
  dateStr: string,
  extra: {
    titleViolations: TitleLengthViolation[]
    descViolations: DescriptionLengthViolation[]
    ogGaps: OgGap[]
    emptyH1s: EmptyH1[]
    sitemapNoindex: SitemapNoindexEntry[]
    orphans: OrphanPage[]
    internalRedirects: InternalRedirect[]
  },
): string {
  const indexable = results.filter((r) => r.is_indexable)
  const defaultTitleCount = indexable.filter((r) => r.title_is_default).length
  const h1Issues = indexable.filter((r) => r.h1_count !== 1)
  const missingCanonical = indexable.filter((r) => !r.canonical)
  const missingDescription = indexable.filter((r) => !r.description)
  const missingAnchor = results.flatMap((r) => r.internal_links_missing_anchor.map((u) => ({ page: r.url, link: u })))
  const broken = results.flatMap((r) => r.internal_links_4xx_5xx.map((l) => ({ page: r.url, ...l })))

  const lines: string[] = [
    `# SEO Audit Report — ${dateStr}`,
    '',
    `**Base URL:** ${BASE_URL}`,
    `**Pages crawled:** ${results.length} (${indexable.length} indexable)`,
    '',
    '## Summary',
    '',
    `| Check | Count |`,
    `|---|---|`,
    `| Pages with default title | ${defaultTitleCount} / ${indexable.length} |`,
    `| Pages with H1 ≠ 1 | ${h1Issues.length} |`,
    `| Pages missing canonical | ${missingCanonical.length} |`,
    `| Pages missing description | ${missingDescription.length} |`,
    `| Internal links missing anchor | ${missingAnchor.length} |`,
    `| Internal broken links (4xx/5xx) | ${broken.length} |`,
    `| Title length violations | ${extra.titleViolations.length} |`,
    `| Description length violations | ${extra.descViolations.length} |`,
    `| OG completeness gaps | ${extra.ogGaps.length} |`,
    `| Empty H1 tags | ${extra.emptyH1s.length} |`,
    `| Sitemap entries with noindex | ${extra.sitemapNoindex.length} |`,
    `| Orphan pages | ${extra.orphans.length} |`,
    `| Internal links to redirects | ${extra.internalRedirects.length} |`,
    '',
  ]

  if (h1Issues.length > 0) {
    lines.push('## H1 Issues (count ≠ 1)')
    lines.push('')
    for (const p of h1Issues) {
      lines.push(`- [${p.url}](${p.url}) — H1 count: ${p.h1_count}`)
    }
    lines.push('')
  }

  if (defaultTitleCount > 0) {
    lines.push('## Pages with Default Title')
    lines.push('')
    for (const p of indexable.filter((r) => r.title_is_default)) {
      lines.push(`- [${p.url}](${p.url}) — title: "${p.title}"`)
    }
    lines.push('')
  }

  if (missingCanonical.length > 0) {
    lines.push('## Pages Missing Canonical')
    lines.push('')
    for (const p of missingCanonical) {
      lines.push(`- [${p.url}](${p.url})`)
    }
    lines.push('')
  }

  if (broken.length > 0) {
    lines.push('## Broken Internal Links')
    lines.push('')
    for (const b of broken) {
      lines.push(`- ${b.page} → [${b.href}](${b.href}) — HTTP ${b.status}`)
    }
    lines.push('')
  }

  if (missingAnchor.length > 0) {
    lines.push('## Internal Links Missing Anchor Text')
    lines.push('')
    for (const m of missingAnchor.slice(0, 50)) {
      lines.push(`- ${m.page} → ${m.link}`)
    }
    if (missingAnchor.length > 50) lines.push(`- … and ${missingAnchor.length - 50} more`)
    lines.push('')
  }

  // New check sections (F6400)
  const titleSection = formatTitleLengthSection(extra.titleViolations)
  if (titleSection) lines.push(titleSection)

  const descSection = formatDescriptionLengthSection(extra.descViolations)
  if (descSection) lines.push(descSection)

  const ogSection = formatOgCompletenessSection(extra.ogGaps)
  if (ogSection) lines.push(ogSection)

  const h1EmptySection = formatH1EmptySection(extra.emptyH1s)
  if (h1EmptySection) lines.push(h1EmptySection)

  lines.push(formatSitemapVsNoindexSection(extra.sitemapNoindex))
  lines.push(formatOrphanPagesSection(extra.orphans, auditConfig.acceptedOrphans))
  lines.push(formatInternalRedirectsSection(extra.internalRedirects, auditConfig.acceptedInternalRedirects))

  lines.push('## All Pages')
  lines.push('')
  lines.push('| URL | Status | Title | H1 | Canonical | Description | Indexable |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const r of results) {
    const titleShort = r.title ? r.title.slice(0, 40) + (r.title.length > 40 ? '…' : '') : '—'
    lines.push(
      `| ${r.url} | ${r.status ?? '?'} | ${titleShort} | ${r.h1_count} | ${r.canonical ? 'yes' : 'NO'} | ${r.description ? 'yes' : 'NO'} | ${r.is_indexable ? 'yes' : 'noindex'} |`,
    )
  }

  return lines.join('\n')
}

async function main() {
  console.log(`[seo-audit] Base URL: ${BASE_URL}`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'pundo-seo-audit/1.0 (+https://pundo.cy)',
  })
  const page = await context.newPage()

  const urls = await discoverUrls(BASE_URL)
  console.log(`[seo-audit] Discovered ${urls.length} URLs`)

  const results: PageAuditResult[] = []
  for (const url of urls) {
    console.log(`[seo-audit] Auditing: ${url}`)
    const result = await auditPage(page, url, BASE_URL)
    results.push(result)
  }

  await browser.close()

  // -------------------------------------------------------------------------
  // Per-page new checks
  // -------------------------------------------------------------------------
  const titleViolations: TitleLengthViolation[] = []
  const descViolations: DescriptionLengthViolation[] = []
  const ogGaps: OgGap[] = []
  const emptyH1s: EmptyH1[] = []

  for (const r of results.filter((r) => r.is_indexable)) {
    const tv = checkTitleLength(r.url, r.title)
    if (tv) titleViolations.push(tv)

    const dv = checkDescriptionLength(r.url, r.description)
    if (dv) descViolations.push(dv)

    const og = checkOgCompleteness(r.url, r.og_tags)
    if (og) ogGaps.push(og)

    const h1e = checkH1Empty(r.url, r.h1_text_contents)
    if (h1e) emptyH1s.push(h1e)
  }

  // -------------------------------------------------------------------------
  // Global checks
  // -------------------------------------------------------------------------

  // Collect all sitemap URLs (already discovered)
  const sitemapUrls = urls.filter((u) => !['/', '/search', '/shops', '/guides'].some((s) => u === BASE_URL + s))

  console.log('[seo-audit] Running global checks (sitemap-vs-noindex, orphans, redirects)...')

  // Sitemap vs noindex
  const { checkSitemapVsNoindex: runSitemapCheck } = await import('./seo-audit/checks/sitemap-vs-noindex.js')
  const sitemapNoindex = await runSitemapCheck(sitemapUrls, fetch)

  // Orphan detection: collect all internal links seen across all pages
  const allInternalLinks = new Set<string>()
  for (const r of results) {
    for (const link of r.all_internal_links) {
      allInternalLinks.add(link)
    }
  }
  const orphans = computeOrphans(sitemapUrls, allInternalLinks, auditConfig.acceptedOrphans)

  // Internal redirects: check internal links from crawled pages (limit to avoid long runs)
  const internalRedirects: InternalRedirect[] = []
  const checkedLinks = new Set<string>()
  for (const r of results) {
    for (const link of r.all_internal_links.slice(0, 20)) {
      if (checkedLinks.has(link)) continue
      checkedLinks.add(link)
      const redir = await checkInternalLink(r.url, link, fetch)
      if (redir) internalRedirects.push(redir)
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const jsonPath = path.join(process.cwd(), `seo-audit-${dateStr}.json`)
  const mdPath = path.join(process.cwd(), `seo-audit-${dateStr}.md`)

  fs.writeFileSync(jsonPath, JSON.stringify({ results, titleViolations, descViolations, ogGaps, emptyH1s, sitemapNoindex, orphans, internalRedirects }, null, 2), 'utf-8')
  fs.writeFileSync(mdPath, generateMarkdown(results, dateStr, {
    titleViolations,
    descViolations,
    ogGaps,
    emptyH1s,
    sitemapNoindex,
    orphans,
    internalRedirects,
  }), 'utf-8')

  console.log(`[seo-audit] Report written: ${jsonPath}`)
  console.log(`[seo-audit] Report written: ${mdPath}`)

  // Exit code check
  const indexable = results.filter((r) => r.is_indexable)
  const defaultTitlePct = indexable.length > 0
    ? (indexable.filter((r) => r.title_is_default).length / indexable.length) * 100
    : 0
  const h1Issues = indexable.filter((r) => r.h1_count !== 1).length
  const newViolations = titleViolations.length + descViolations.length + ogGaps.length +
    emptyH1s.length + sitemapNoindex.length + orphans.length + internalRedirects.length

  if (defaultTitlePct > THRESHOLD_TITLE_DEFAULT_PCT || h1Issues > 0 || newViolations > 0) {
    console.error(
      `[seo-audit] THRESHOLD VIOLATION: default title: ${defaultTitlePct.toFixed(1)}% (threshold: ${THRESHOLD_TITLE_DEFAULT_PCT}%), H1 issues: ${h1Issues}, new violations: ${newViolations}`,
    )
    process.exit(1)
  }

  console.log('[seo-audit] All thresholds passed.')
}

main().catch((err) => {
  console.error('[seo-audit] Fatal error:', err)
  process.exit(1)
})
