/**
 * SEO metadata helpers for pundo_frontend.
 *
 * Each helper returns a complete Next.js Metadata object for a specific
 * page type. Pages should spread these defaults and override specific fields.
 *
 * Usage:
 *   import { productMetadata } from '@/lib/seo/metadata-defaults'
 *   export async function generateMetadata(...) {
 *     return productMetadata({ name, price, slug, imageUrl })
 *   }
 */

import type { Metadata } from 'next'

export function getSiteUrl(): string {
  return process.env.SITE_URL ?? 'https://pundo.cy'
}

// ---------------------------------------------------------------------------
// Page-type helpers
// ---------------------------------------------------------------------------

export interface ProductMetadataArgs {
  name: string
  slug: string
  description?: string
  priceDisplay?: string
  imageUrl?: string
}

export function productMetadata(args: ProductMetadataArgs): Metadata {
  const siteUrl = getSiteUrl()
  const title = args.priceDisplay ? `${args.name} — ${args.priceDisplay}` : args.name
  const canonical = `${siteUrl}/products/${args.slug}`
  return {
    title,
    description: args.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title,
      description: args.description,
      url: canonical,
      images: args.imageUrl ? [{ url: args.imageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: args.description,
      images: args.imageUrl ? [args.imageUrl] : undefined,
    },
    robots: { index: true, follow: true },
  }
}

export interface ShopMetadataArgs {
  name: string
  slug: string
  description?: string
  logoUrl?: string
}

export function shopMetadata(args: ShopMetadataArgs): Metadata {
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/shops/${args.slug}`
  return {
    title: args.name,
    description: args.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: args.name,
      description: args.description,
      url: canonical,
      images: args.logoUrl ? [{ url: args.logoUrl }] : undefined,
    },
    twitter: {
      card: 'summary',
      title: args.name,
      description: args.description,
      images: args.logoUrl ? [args.logoUrl] : undefined,
    },
    robots: { index: true, follow: true },
  }
}

export interface GuideMetadataArgs {
  title: string
  slug: string
  description?: string
}

export function guideMetadata(args: GuideMetadataArgs): Metadata {
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/guides/${args.slug}`
  return {
    title: `${args.title} — pundo`,
    description: args.description,
    alternates: {
      // No hreflang: Pundo has no URL-based i18n (all languages share same URL).
      // Correct hreflang requires per-language URLs — see F6300.
      canonical,
    },
    openGraph: {
      type: 'article',
      title: args.title,
      description: args.description,
      url: canonical,
    },
    robots: { index: true, follow: true },
  }
}

/** Metadata for any page that should never be indexed (auth, account, etc.) */
export function noIndexMetadata(title?: string): Metadata {
  return {
    ...(title ? { title } : {}),
    robots: { index: false, follow: false },
  }
}

/** Metadata for parametrised/dynamic search URLs (e.g. /search?q=foo) */
export function searchResultsMetadata(): Metadata {
  return {
    robots: { index: false, follow: true },
  }
}

/** Metadata for the plain /search page (no query) */
export function searchPageMetadata(): Metadata {
  const siteUrl = getSiteUrl()
  return {
    title: 'Search',
    description: 'Search for products and shops near you in Cyprus.',
    alternates: { canonical: `${siteUrl}/search` },
    robots: { index: true, follow: true },
  }
}
