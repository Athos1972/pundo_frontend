/**
 * OG (Open Graph) builder — pundo_frontend
 *
 * buildCompleteOpenGraph() always produces a fully-populated OG + Twitter card,
 * guaranteeing AC-40: og:title, og:description, og:image (with dimensions and alt),
 * og:url, og:type, og:site_name, og:locale, plus twitter:card, twitter:title,
 * twitter:description, twitter:image.
 */

import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/seo/metadata-defaults'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OgType = 'website' | 'article' | 'product'

export interface OgImageInput {
  url: string       // absolute URL preferred; relative is accepted and will be resolved
  width?: number    // default 1200
  height?: number   // default 630
  alt: string
}

export interface OgInput {
  title: string
  description: string
  url: string           // absolute, including siteUrl
  type: OgType
  locale: string        // 'en' | 'de' | 'el' | 'ru' | 'ar' | 'he'
  siteName: string
  image: OgImageInput
  // Optional per-type fields
  publishedTime?: string        // ISO 8601, article only
  productPrice?: { amount: string; currency: string }  // product only
}

export interface OgOutput {
  openGraph: Metadata['openGraph']
  twitter: Metadata['twitter']
  other?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Fallback OG image pool for shops without a logo
// ---------------------------------------------------------------------------

/**
 * Pool size = 1 until the Designer delivers the full 20-image pool.
 * When assets are added as public/og/shop-fallback-01.jpg … shop-fallback-20.jpg,
 * increment FALLBACK_POOL_SIZE to match.
 */
const FALLBACK_POOL_SIZE = 1

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/**
 * Deterministically pick a fallback OG image for a shop.
 * Uses shopId % FALLBACK_POOL_SIZE so the image is stable across re-renders.
 * Pool size = 1 → always returns shop-fallback-default.jpg until pool is expanded.
 */
export function pickShopFallbackOgImage(
  shopId: number,
  siteUrl?: string,
): { url: string; width: 1200; height: 630; alt: string } {
  const base = siteUrl ?? getSiteUrl()
  const idx = FALLBACK_POOL_SIZE <= 1 ? 'default' : pad2(shopId % FALLBACK_POOL_SIZE)
  return {
    url: `${base}/og/shop-fallback-${idx}.jpg`,
    width: 1200,
    height: 630,
    alt: 'Pundo shop',
  }
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Build a complete Next.js openGraph + twitter metadata block.
 *
 * Guarantees all AC-40 required fields are present.
 * For article type: article:published_time goes into metadata.other
 * For product type: product:price:amount / product:price:currency go into metadata.other
 */
export function buildCompleteOpenGraph(input: OgInput): OgOutput {
  const imageWidth = input.image.width ?? 1200
  const imageHeight = input.image.height ?? 630

  const openGraph: Metadata['openGraph'] = {
    type: input.type === 'article' ? 'article' : 'website',
    title: input.title,
    description: input.description,
    url: input.url,
    siteName: input.siteName,
    locale: input.locale,
    images: [
      {
        url: input.image.url,
        width: imageWidth,
        height: imageHeight,
        alt: input.image.alt,
      },
    ],
  }

  const twitter: Metadata['twitter'] = {
    card: 'summary_large_image',
    title: input.title,
    description: input.description,
    images: [input.image.url],
  }

  const other: Record<string, string> = {}

  if (input.type === 'article' && input.publishedTime) {
    other['article:published_time'] = input.publishedTime
  }

  if (input.type === 'product' && input.productPrice) {
    other['product:price:amount'] = input.productPrice.amount
    other['product:price:currency'] = input.productPrice.currency
  }

  return {
    openGraph,
    twitter,
    ...(Object.keys(other).length > 0 ? { other } : {}),
  }
}
