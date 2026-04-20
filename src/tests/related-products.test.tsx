import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))
vi.mock('@/components/auth/SessionProvider', () => ({
  useSession: () => ({ user: null, is_authenticated: false }),
}))
vi.mock('@/components/favorites/FavoritesProvider', () => ({
  useFavorites: () => ({ favoriteIds: new Set(), isFavorite: () => false, toggleFavorite: vi.fn(), isLoading: false }),
}))

// ─── getRelatedProducts — api.ts ──────────────────────────────────────────────

describe('getRelatedProducts', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })
    )
  })

  afterEach(() => { fetchSpy.mockRestore() })

  it('calls /products/{slug}/related', async () => {
    const { getRelatedProducts } = await import('@/lib/api')
    await getRelatedProducts('some-product', 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('/products/some-product/related')
  })

  it('includes default limit=8 in query string', async () => {
    const { getRelatedProducts } = await import('@/lib/api')
    await getRelatedProducts('some-product', 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('limit=8')
  })

  it('accepts custom limit', async () => {
    const { getRelatedProducts } = await import('@/lib/api')
    await getRelatedProducts('some-product', 'en', 12)
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('limit=12')
  })

  it('sends Accept-Language header', async () => {
    const { getRelatedProducts } = await import('@/lib/api')
    await getRelatedProducts('some-product', 'de')
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['Accept-Language']).toBe('de')
  })

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }))
    const { getRelatedProducts } = await import('@/lib/api')
    await expect(getRelatedProducts('some-product', 'en')).rejects.toThrow('API 500')
  })
})

// ─── RelatedProductsCarousel — component ─────────────────────────────────────

const makeItem = (slug: string, name: string) => ({
  id: Math.random(),
  slug,
  names: { en: name },
  brand: 'TestBrand',
  category_id: 1,
  thumbnail_url: null,
  images: null,
  best_offer: null,
})

describe('RelatedProductsCarousel', () => {
  it('renders nothing when items is empty', async () => {
    const { RelatedProductsCarousel } = await import('@/components/product/RelatedProductsCarousel')
    const { container } = render(
      <RelatedProductsCarousel items={[]} lang="en" title="Related products" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the section heading', async () => {
    const { RelatedProductsCarousel } = await import('@/components/product/RelatedProductsCarousel')
    render(
      <RelatedProductsCarousel
        items={[makeItem('product-b', 'Product B')]}
        lang="en"
        title="Related products"
      />
    )
    expect(screen.getByRole('heading', { name: 'Related products' })).toBeInTheDocument()
  })

  it('renders all product cards', async () => {
    const { RelatedProductsCarousel } = await import('@/components/product/RelatedProductsCarousel')
    render(
      <RelatedProductsCarousel
        items={[makeItem('prod-a', 'Alpha'), makeItem('prod-b', 'Beta'), makeItem('prod-c', 'Gamma')]}
        lang="en"
        title="Related products"
      />
    )
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  it('each card links to the correct product slug', async () => {
    const { RelatedProductsCarousel } = await import('@/components/product/RelatedProductsCarousel')
    render(
      <RelatedProductsCarousel
        items={[makeItem('my-product', 'My Product')]}
        lang="en"
        title="Related products"
      />
    )
    const link = screen.getByRole('link', { name: 'My Product' })
    expect(link.getAttribute('href')).toBe('/products/my-product')
  })

  it('uses the translated title passed as prop (DE)', async () => {
    const { RelatedProductsCarousel } = await import('@/components/product/RelatedProductsCarousel')
    render(
      <RelatedProductsCarousel
        items={[makeItem('prod-x', 'Produkt X')]}
        lang="de"
        title="Ähnliche Produkte"
      />
    )
    expect(screen.getByRole('heading', { name: 'Ähnliche Produkte' })).toBeInTheDocument()
  })

  it('scroll container has role=list and each card has role=listitem', async () => {
    const { RelatedProductsCarousel } = await import('@/components/product/RelatedProductsCarousel')
    render(
      <RelatedProductsCarousel
        items={[makeItem('p1', 'P1'), makeItem('p2', 'P2')]}
        lang="en"
        title="Related products"
      />
    )
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('has correct aria-label on the section', async () => {
    const { RelatedProductsCarousel } = await import('@/components/product/RelatedProductsCarousel')
    render(
      <RelatedProductsCarousel
        items={[makeItem('p1', 'P1')]}
        lang="en"
        title="Related products"
      />
    )
    expect(screen.getByRole('region', { name: 'Related products' })).toBeInTheDocument()
  })
})

// ─── translations — related_products key ─────────────────────────────────────

describe('translations: related_products key', () => {
  it('has related_products in all 6 languages', async () => {
    const { translations } = await import('@/lib/translations')
    const langs = ['en', 'de', 'ru', 'el', 'ar', 'he'] as const
    for (const lang of langs) {
      expect(translations[lang].related_products).toBeTruthy()
    }
  })

  it('translations differ per language (not all the same string)', async () => {
    const { translations } = await import('@/lib/translations')
    const values = new Set([
      translations.en.related_products,
      translations.de.related_products,
      translations.ru.related_products,
      translations.el.related_products,
      translations.ar.related_products,
      translations.he.related_products,
    ])
    expect(values.size).toBe(6)
  })
})
