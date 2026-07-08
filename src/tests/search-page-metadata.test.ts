import { describe, it, expect, vi } from 'vitest'

// Top-level mock (hoisted by Vitest) — search page's generateMetadata() calls
// getBrandFromHeaders() to resolve the brand-aware og:image (B6400-005, Pattern B).
vi.mock('@/config/brands', () => ({
  getBrandFromHeaders: vi.fn().mockResolvedValue({
    slug: 'pundo',
    name: 'Pundo',
    assets: { ogImage: '/brands/pundo/logo.png' },
    meta: { siteUrl: 'https://pundo.cy' },
  }),
}))

describe('Search page SEO — og:image completeness (B6400-005)', () => {
  it('canonical /{lang}/search includes a fully-populated openGraph.images entry', async () => {
    const { generateMetadata } = await import('@/app/(customer)/[lang]/search/page')
    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'en' }),
      searchParams: Promise.resolve({}),
    })

    const openGraph = meta.openGraph as { images?: Array<{ url: string; width: number; height: number; alt: string }> } | undefined
    expect(openGraph?.images).toHaveLength(1)
    const image = openGraph!.images![0]
    expect(image.url).toBe('https://pundo.cy/brands/pundo/logo.png')
    expect(image.width).toBe(1200)
    expect(image.height).toBe(630)
    expect(image.alt).toBe('Pundo')
  })

  it('canonical /{lang}/search includes siteName and locale', async () => {
    const { generateMetadata } = await import('@/app/(customer)/[lang]/search/page')
    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'de' }),
      searchParams: Promise.resolve({}),
    })

    const openGraph = meta.openGraph as { siteName?: string; locale?: string } | undefined
    expect(openGraph?.siteName).toBe('Pundo')
    expect(openGraph?.locale).toBe('de')
  })

  it('canonical /{lang}/search includes a twitter summary_large_image card', async () => {
    const { generateMetadata } = await import('@/app/(customer)/[lang]/search/page')
    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'en' }),
      searchParams: Promise.resolve({}),
    })

    const twitter = meta.twitter as { card?: string; images?: string[] } | undefined
    expect(twitter?.card).toBe('summary_large_image')
    expect(twitter?.images).toEqual(['https://pundo.cy/brands/pundo/logo.png'])
  })

  it('still sets robots index:true on the canonical (unparametrised) branch', async () => {
    const { generateMetadata } = await import('@/app/(customer)/[lang]/search/page')
    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'en' }),
      searchParams: Promise.resolve({}),
    })

    expect((meta.robots as { index: boolean } | undefined)?.index).toBe(true)
  })

  it('parametrised ?q= URLs remain noindex and do NOT build openGraph (regression guard)', async () => {
    const { generateMetadata } = await import('@/app/(customer)/[lang]/search/page')
    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'en' }),
      searchParams: Promise.resolve({ q: 'shoes' }),
    })

    expect((meta.robots as { index: boolean; follow: boolean } | undefined)?.index).toBe(false)
    expect((meta.robots as { index: boolean; follow: boolean } | undefined)?.follow).toBe(true)
    expect(meta.openGraph).toBeUndefined()
  })

  it('parametrised ?category_id= URLs remain noindex (regression guard)', async () => {
    const { generateMetadata } = await import('@/app/(customer)/[lang]/search/page')
    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'en' }),
      searchParams: Promise.resolve({ category_id: '42' }),
    })

    expect((meta.robots as { index: boolean } | undefined)?.index).toBe(false)
  })
})
