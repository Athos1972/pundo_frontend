/**
 * Shared metadata builder for static customer pages (home, about, contact, ...).
 * Title is `<descriptive title> | <brand>` set as `absolute` so the root template
 * does not append the brand a second time.
 */
import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { buildHreflang } from '@/lib/routing'
import { getSiteUrl } from '@/lib/seo/metadata-defaults'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'

export interface StaticPageMetadataInput {
  lang: Lang
  /** Path without lang prefix, e.g. '/about'; '/' for the home page */
  path: string
  /** Descriptive title WITHOUT brand suffix */
  title: string
  description: string
  siteName: string
  /** Site URL override (brand-specific); defaults to getSiteUrl() */
  siteUrl?: string
  /** Canonical path (without lang) if different from `path` (alias pages) */
  canonicalPath?: string
  robots?: Metadata['robots']
}

export function buildStaticPageMetadata(input: StaticPageMetadataInput): Metadata {
  const siteUrl = input.siteUrl ?? getSiteUrl()
  const canonicalPath = input.canonicalPath ?? input.path
  const suffix = canonicalPath === '/' ? '' : canonicalPath
  const pageUrl = `${siteUrl}/${input.lang}${suffix}`
  const fullTitle = `${input.title} | ${input.siteName}`

  const { openGraph, twitter } = buildCompleteOpenGraph({
    title: fullTitle,
    description: input.description,
    url: pageUrl,
    type: 'website',
    locale: input.lang,
    siteName: input.siteName,
    image: {
      url: `${siteUrl}/og/shop-fallback-default.jpg`,
      width: 1200,
      height: 630,
      alt: `${input.siteName} — ${input.title}`,
    },
  })

  return {
    title: { absolute: fullTitle },
    description: input.description,
    alternates: {
      canonical: pageUrl,
      languages: buildHreflang(siteUrl, canonicalPath),
    },
    openGraph,
    twitter,
    ...(input.robots ? { robots: input.robots } : {}),
  }
}
