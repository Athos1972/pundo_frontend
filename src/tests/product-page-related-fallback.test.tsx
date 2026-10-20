// B8950-016 T19 (B14): "page loads without crash when /related returns 500" used to be an E2E test with page.route(). The
// product page fetches /related on the SERVER (page.tsx: Promise.allSettled), a browser route never sees that request,
// so the E2E test passed without ever exercising the fallback. Tested here where the failure can really be injected.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

const getProduct = vi.fn()
const getRelatedProducts = vi.fn()
const getRelatedCategories = vi.fn()
const getCustomerSession = vi.fn()

vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND') } }))
vi.mock('@/lib/api', () => ({
  getProduct: (...a: unknown[]) => getProduct(...a),
  getRelatedProducts: (...a: unknown[]) => getRelatedProducts(...a),
  getRelatedCategories: (...a: unknown[]) => getRelatedCategories(...a),
}))
vi.mock('@/lib/customer-api', () => ({ getCustomerSession: (...a: unknown[]) => getCustomerSession(...a) }))
vi.mock('@/lib/seo', () => ({ getSiteUrl: () => 'https://pundo.test' }))

// client components are not the subject: stubs that expose what the page hands them
const { stub } = vi.hoisted(() => ({
  stub: (name: string) => () => ({ type: 'div', props: { 'data-testid': name }, key: null, ref: null, $$typeof: Symbol.for('react.transitional.element') }),
}))
vi.mock('@/components/product/OfferList', () => ({ OfferList: stub('offers') }))
vi.mock('@/components/product/ProductHeroImage', () => ({ ProductHeroImage: stub('hero') }))
vi.mock('@/components/product/RelatedProductsCarousel', () => ({
  RelatedProductsCarousel: (p: { items: unknown[] }) => React.createElement('div', { 'data-testid': 'related', 'data-count': String(p.items.length) }),
}))
vi.mock('@/components/ui/PriceHistory', () => ({ PriceHistory: stub('price-history') }))
vi.mock('@/components/ui/BackButton', () => ({ BackButton: stub('back') }))
vi.mock('@/components/ui/PriceFilterToggle', () => ({ PriceFilterToggle: stub('price-filter') }))
vi.mock('@/components/reviews/ReviewSection', () => ({ ReviewSection: stub('reviews') }))
vi.mock('@/components/recently-viewed/TrackProductView', () => ({ TrackProductView: stub('track') }))
vi.mock('@/components/ui/Breadcrumb', () => ({ Breadcrumb: stub('breadcrumb') }))
vi.mock('@/components/product/RelatedCategoriesCard', () => ({ RelatedCategoriesCard: stub('related-categories') }))
vi.mock('@/components/product/FavoriteButton', () => ({ FavoriteButton: stub('favorite') }))
vi.mock('@/components/consent/PixelViewContent', () => ({ PixelViewContent: stub('pixel') }))

import ProductPage from '@/app/(customer)/[lang]/products/[slug]/page'

const product = {
  id: 5, slug: 'milk', names: { en: 'Milk 1L' }, descriptions: { en: 'Fresh milk' }, brand: null, category: null,
  attributes: null, offers: [], images: null, thumbnail_url: null, price_history: [], review_stats: null,
}
const relatedItem = (slug: string) => ({ id: slug.length, slug, name: slug, brand: null, category_id: null, thumbnail_url: null })

const renderPage = async () =>
  render(await ProductPage({ params: Promise.resolve({ lang: 'en', slug: 'milk' }), searchParams: Promise.resolve({}) } as never))

beforeEach(() => {
  vi.clearAllMocks()
  getProduct.mockResolvedValue(product)
  getRelatedCategories.mockResolvedValue({ items: [] })
  getCustomerSession.mockResolvedValue({ is_authenticated: false })
})

describe('product page: /related', () => {
  it('shows the related carousel with the items of the backend (without the product itself)', async () => {
    getRelatedProducts.mockResolvedValue({ items: [relatedItem('cheese'), relatedItem('milk'), relatedItem('butter')] })
    await renderPage()
    expect(screen.getByTestId('related').getAttribute('data-count')).toBe('2')
  })

  it.each([
    ['a 500 from the backend', () => new Error('API error: 500')],
    ['a network failure', () => new TypeError('fetch failed')],
  ])('renders the page with an empty carousel on %s (the real carousel renders nothing for 0 items)', async (_name, error) => {
    getRelatedProducts.mockRejectedValue(error())
    await renderPage()
    expect(screen.getByTestId('related').getAttribute('data-count')).toBe('0')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Milk 1L')
  })

  it('still fails (not-found) when the PRODUCT itself is missing, whatever /related says', async () => {
    getProduct.mockRejectedValue(Object.assign(new Error('API error: 404'), { status: 404 }))
    getRelatedProducts.mockResolvedValue({ items: [] })
    await expect(renderPage()).rejects.toThrow()
  })
})
