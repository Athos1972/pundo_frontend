/**
 * Unit tests: buildCompleteOpenGraph, pickShopFallbackOgImage (F6400)
 */
import { describe, it, expect } from 'vitest'
import { buildCompleteOpenGraph, pickShopFallbackOgImage } from '@/lib/seo/og-defaults'
import type { OgInput } from '@/lib/seo/og-defaults'

const BASE_INPUT: OgInput = {
  title: 'Pundo — Local Price Comparison Cyprus',
  description: 'Find and compare prices at local shops in Cyprus. Discover the best deals near you.',
  url: 'https://pundo.cy',
  type: 'website',
  locale: 'en',
  siteName: 'Pundo',
  image: {
    url: 'https://pundo.cy/og/shop-fallback-default.jpg',
    width: 1200,
    height: 630,
    alt: 'Pundo',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// buildCompleteOpenGraph
// ─────────────────────────────────────────────────────────────────────────────

describe('buildCompleteOpenGraph', () => {
  describe('openGraph output', () => {
    it('always returns an openGraph object', () => {
      const { openGraph } = buildCompleteOpenGraph(BASE_INPUT)
      expect(openGraph).toBeDefined()
    })

    it('sets og:title', () => {
      const { openGraph } = buildCompleteOpenGraph(BASE_INPUT)
      expect((openGraph as { title?: string }).title).toBe(BASE_INPUT.title)
    })

    it('sets og:description', () => {
      const { openGraph } = buildCompleteOpenGraph(BASE_INPUT)
      expect((openGraph as { description?: string }).description).toBe(BASE_INPUT.description)
    })

    it('sets og:url', () => {
      const { openGraph } = buildCompleteOpenGraph(BASE_INPUT)
      expect((openGraph as { url?: string }).url).toBe(BASE_INPUT.url)
    })

    it('sets og:type = website for website type', () => {
      const { openGraph } = buildCompleteOpenGraph(BASE_INPUT)
      expect((openGraph as { type?: string }).type).toBe('website')
    })

    it('sets og:type = article for article type', () => {
      const { openGraph } = buildCompleteOpenGraph({ ...BASE_INPUT, type: 'article' })
      expect((openGraph as { type?: string }).type).toBe('article')
    })

    it('sets og:type = website for product type (Next.js limitation)', () => {
      // Next.js Metadata type only supports 'website' | 'article' in openGraph.type
      const { openGraph } = buildCompleteOpenGraph({ ...BASE_INPUT, type: 'product' })
      expect((openGraph as { type?: string }).type).toBe('website')
    })

    it('sets og:site_name', () => {
      const { openGraph } = buildCompleteOpenGraph(BASE_INPUT)
      expect((openGraph as { siteName?: string }).siteName).toBe('Pundo')
    })

    it('sets og:locale', () => {
      const { openGraph } = buildCompleteOpenGraph(BASE_INPUT)
      expect((openGraph as { locale?: string }).locale).toBe('en')
    })

    it('sets og:image with url, width, height, alt', () => {
      const { openGraph } = buildCompleteOpenGraph(BASE_INPUT)
      const images = (openGraph as { images?: Array<{ url: string; width?: number; height?: number; alt?: string }> }).images
      expect(images).toHaveLength(1)
      expect(images![0].url).toBe(BASE_INPUT.image.url)
      expect(images![0].width).toBe(1200)
      expect(images![0].height).toBe(630)
      expect(images![0].alt).toBe('Pundo')
    })
  })

  describe('twitter output', () => {
    it('always returns a twitter object', () => {
      const { twitter } = buildCompleteOpenGraph(BASE_INPUT)
      expect(twitter).toBeDefined()
    })

    it('sets twitter:card = summary_large_image', () => {
      const { twitter } = buildCompleteOpenGraph(BASE_INPUT)
      expect((twitter as { card?: string }).card).toBe('summary_large_image')
    })

    it('sets twitter:title', () => {
      const { twitter } = buildCompleteOpenGraph(BASE_INPUT)
      expect((twitter as { title?: string }).title).toBe(BASE_INPUT.title)
    })

    it('sets twitter:description', () => {
      const { twitter } = buildCompleteOpenGraph(BASE_INPUT)
      expect((twitter as { description?: string }).description).toBe(BASE_INPUT.description)
    })

    it('sets twitter:image', () => {
      const { twitter } = buildCompleteOpenGraph(BASE_INPUT)
      const images = (twitter as { images?: string[] }).images
      expect(images).toContain(BASE_INPUT.image.url)
    })
  })

  describe('article type extras', () => {
    it('adds article:published_time to other when publishedTime is set', () => {
      const iso = '2026-05-16T00:00:00.000Z'
      const { other } = buildCompleteOpenGraph({ ...BASE_INPUT, type: 'article', publishedTime: iso })
      expect(other?.['article:published_time']).toBe(iso)
    })

    it('does not add article:published_time when not set', () => {
      const { other } = buildCompleteOpenGraph({ ...BASE_INPUT, type: 'article' })
      expect(other?.['article:published_time']).toBeUndefined()
    })
  })

  describe('product type extras', () => {
    it('adds product:price:amount and product:price:currency when provided', () => {
      const { other } = buildCompleteOpenGraph({
        ...BASE_INPUT,
        type: 'product',
        productPrice: { amount: '9.99', currency: 'EUR' },
      })
      expect(other?.['product:price:amount']).toBe('9.99')
      expect(other?.['product:price:currency']).toBe('EUR')
    })
  })

  describe('image defaults', () => {
    it('defaults width to 1200 when not provided', () => {
      const { openGraph } = buildCompleteOpenGraph({
        ...BASE_INPUT,
        image: { url: 'https://pundo.cy/img.jpg', alt: 'test' },
      })
      const images = (openGraph as { images?: Array<{ width?: number }> }).images
      expect(images![0].width).toBe(1200)
    })

    it('defaults height to 630 when not provided', () => {
      const { openGraph } = buildCompleteOpenGraph({
        ...BASE_INPUT,
        image: { url: 'https://pundo.cy/img.jpg', alt: 'test' },
      })
      const images = (openGraph as { images?: Array<{ height?: number }> }).images
      expect(images![0].height).toBe(630)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// pickShopFallbackOgImage
// ─────────────────────────────────────────────────────────────────────────────

describe('pickShopFallbackOgImage', () => {
  it('returns an image object with required fields', () => {
    const img = pickShopFallbackOgImage(42, 'https://pundo.cy')
    expect(img.url).toBeDefined()
    expect(img.width).toBe(1200)
    expect(img.height).toBe(630)
    expect(img.alt).toBeDefined()
  })

  it('returns the fallback image URL (pool size = 1)', () => {
    const img = pickShopFallbackOgImage(1, 'https://pundo.cy')
    expect(img.url).toContain('/og/shop-fallback-')
    expect(img.url).toContain('pundo.cy')
  })

  it('is deterministic for the same shopId', () => {
    const a = pickShopFallbackOgImage(7, 'https://pundo.cy')
    const b = pickShopFallbackOgImage(7, 'https://pundo.cy')
    expect(a.url).toBe(b.url)
  })

  it('uses siteUrl when provided', () => {
    const img = pickShopFallbackOgImage(1, 'https://naidivse.cy')
    expect(img.url).toContain('naidivse.cy')
  })
})
