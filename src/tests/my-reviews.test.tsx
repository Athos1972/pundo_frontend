// B3700-002: Account-Tab "My reviews" rief GET /customer/reviews/mine ohne entity_type/entity_id auf
// (Backend: 422), der Tab zeigte immer "No reviews yet". Jetzt: /customer/reviews/mine/all (alle eigenen
// Reviews inkl. Produkt/Shop). Hier: Client-Funktion + Links im Tab.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'customer_token' ? { value: 'tok123' } : undefined) }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

import { getMyReviews } from '@/lib/customer-api'
import { ReviewsTab } from '@/components/account/ReviewsTab'
import type { MyReview } from '@/types/api'

// So liefert das Backend (MyReviewsPage), auch mit dem schmutzigen Fall: geloeschte Entity -> entity: null
const base = {
  user_id: 1,
  user_display_name: 'Test User',
  stars: 4 as const,
  photos: [],
  is_visible: true,
  created_at: '2026-10-01T10:00:00+00:00',
  updated_at: '2026-10-01T10:00:00+00:00',
}
const productReview: MyReview = {
  ...base, id: 1, entity_type: 'product', entity_id: 5, comment: 'Great product',
  entity: { type: 'product', id: 5, slug: 'olive-oil-1l', name: 'Olive Oil 1l' },
}
const shopReview: MyReview = {
  ...base, id: 2, entity_type: 'shop', entity_id: 9, comment: 'Nice shop',
  entity: { type: 'shop', id: 9, slug: 'corner-shop', name: 'Corner Shop' },
}
const orphanReview: MyReview = { ...base, id: 3, entity_type: 'product', entity_id: 777, comment: 'Gone', entity: null }

describe('getMyReviews', () => {
  const fetchMock = vi.fn()
  beforeEach(() => vi.stubGlobal('fetch', fetchMock))
  afterEach(() => { fetchMock.mockReset(); vi.unstubAllGlobals() })

  it('ruft /customer/reviews/mine/all mit Token und Sprache auf und liefert items', async () => {
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ items: [productReview, shopReview], total: 2, limit: 100, offset: 0 }),
    })
    const result = await getMyReviews('de')
    expect(result.map((r) => r.id)).toEqual([1, 2])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/customer\/reviews\/mine\/all\?limit=100&offset=0$/)
    expect(init.headers.Authorization).toBe('Bearer tok123')
    expect(init.headers['Accept-Language']).toBe('de')
  })

  it('ruft NICHT mehr /reviews/mine ohne Parameter auf (Regression: 422)', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [], total: 0, limit: 100, offset: 0 }) })
    await getMyReviews('en')
    expect(fetchMock.mock.calls[0][0]).not.toMatch(/reviews\/mine(\?|$)/)
  })

  it.each([401, 403, 422, 500])('Status %i gibt eine leere Liste, wirft nicht', async (status) => {
    fetchMock.mockResolvedValue({ ok: false, status, json: async () => ({}) })
    await expect(getMyReviews('en')).resolves.toEqual([])
  })

  it('Netzwerkfehler gibt eine leere Liste', async () => {
    fetchMock.mockRejectedValue(new Error('down'))
    await expect(getMyReviews('en')).resolves.toEqual([])
  })
})

describe('ReviewsTab: Verlinkung der bewerteten Entity', () => {
  it('verlinkt Produkt und Shop mit Sprachpraefix (localePath)', () => {
    render(<ReviewsTab reviews={[productReview, shopReview]} lang="de" />)
    expect(screen.getByRole('link', { name: 'Olive Oil 1l' })).toHaveAttribute('href', '/de/products/olive-oil-1l')
    expect(screen.getByRole('link', { name: 'Corner Shop' })).toHaveAttribute('href', '/de/shops/corner-shop')
    expect(screen.getByText('Great product')).toBeInTheDocument()
  })

  it('RTL-Sprache (ar): Praefix /ar', () => {
    render(<ReviewsTab reviews={[shopReview]} lang="ar" />)
    expect(screen.getByRole('link', { name: 'Corner Shop' })).toHaveAttribute('href', '/ar/shops/corner-shop')
  })

  it('geloeschte Entity (entity: null): Review sichtbar, kein Link', () => {
    render(<ReviewsTab reviews={[orphanReview]} lang="en" />)
    expect(screen.getByText('Gone')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /.+/ })).toBeNull()
  })

  it('ohne Reviews: Leer-Hinweis', () => {
    render(<ReviewsTab reviews={[]} lang="en" />)
    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument()
  })
})
