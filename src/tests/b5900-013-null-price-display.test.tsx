/**
 * B5900-013 — Kundenseiten zeigen nie "null/None/NaN EUR".
 * Deckt ab: Helfer (parsePriceAmount, formatAmount, hasNumericPrice), formatPriceOrLabel,
 * ProductCard, ShopOfferCard, OfferList, buildProductSchema, FavoritesTab-Format.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { t } from '@/lib/translations'
import { LANGS } from '@/lib/lang'
import { parsePriceAmount, formatAmount, hasNumericPrice, formatPriceOrLabel } from '@/lib/utils'
import { buildProductSchema } from '@/lib/structured-data'
import { ShopOfferCard } from '@/components/shop/ShopOfferCard'
import { ProductCard } from '@/components/product/ProductCard'
import { OfferList } from '@/components/product/OfferList'
import type { OfferDetail, ShopOffer, ProductDetailResponse } from '@/types/api'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))
vi.mock('@/lib/seo', () => ({ getSiteUrl: () => 'https://example.com' }))
vi.mock('@/components/product/FavoriteButton', () => ({ FavoriteButton: () => null }))

afterEach(cleanup)

const BAD = /\b(null|undefined|NaN|None)\b/

describe('parsePriceAmount / formatAmount / hasNumericPrice', () => {
  it.each([null, undefined, '', 'None', 'null', 'NaN', 'abc', '-1', -3])('invalid %s -> null', v => {
    expect(parsePriceAmount(v as string | null | undefined)).toBeNull()
    expect(formatAmount(v as string | null | undefined, 'EUR')).toBeNull()
  })
  it('valid values', () => {
    expect(parsePriceAmount('0')).toBe(0)
    expect(parsePriceAmount('7.9900')).toBe(7.99)
    expect(parsePriceAmount(12.5)).toBe(12.5)
    expect(formatAmount('7.9900', 'EUR')).toBe('7.99 EUR')
    expect(formatAmount(0, 'EUR')).toBe('0.00 EUR')
  })
  it('hasNumericPrice', () => {
    expect(hasNumericPrice({ price_type: 'fixed', price: '3.00' })).toBe(true)
    expect(hasNumericPrice({ price_type: 'fixed', price: null })).toBe(false)
    expect(hasNumericPrice({ price_type: 'fixed', price: 'None' })).toBe(false)
    expect(hasNumericPrice({ price_type: 'on_request', price: '3.00' })).toBe(false)
  })
})

describe('formatPriceOrLabel fixed without valid price', () => {
  for (const lang of LANGS) {
    it(`${lang}: label instead of null EUR`, () => {
      const tr = t(lang)
      expect(tr.price_not_available).toBeTruthy()
      for (const p of [null, undefined, 'None', '']) {
        const r = formatPriceOrLabel(p as string | null, 'EUR', 'fixed', null, tr)
        expect(r.display).toBe(tr.price_not_available)
        expect(r.isNumeric).toBe(false)
        expect(r.display).not.toMatch(BAD)
      }
    })
  }
})

describe('ProductCard', () => {
  const mk = (price: string | null, price_type: string) => ({
    id: 1, slug: 'w', name: 'Widget', brand: null, category_id: null, thumbnail_url: null, images: null,
    best_offer: {
      price, currency: 'EUR', price_type, price_note: null, shop_id: 1, shop_name: 'S', shop_slug: 's',
      dist_km: null, is_available: true, crawled_at: '2026-01-01T00:00:00Z', url: null, shop_location: null,
    },
  })
  for (const variant of ['vertical', 'horizontal'] as const) {
    for (const p of [null, 'None', '']) {
      it(`${variant} fixed price=${JSON.stringify(p)} -> No price listed`, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { container } = render(<ProductCard item={mk(p, 'fixed') as any} lang="en" variant={variant} />)
        expect(screen.getByText('No price listed')).toBeInTheDocument()
        expect(container.textContent).not.toMatch(BAD)
      })
    }
  }
  it('de on_request / ar free labels', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ProductCard item={mk(null, 'on_request') as any} lang="de" />)
    expect(screen.getByText('Preis auf Anfrage')).toBeInTheDocument()
    cleanup()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ProductCard item={mk(null, 'free') as any} lang="he" />)
    expect(screen.getByText('חינם')).toBeInTheDocument()
  })
})

describe('ShopOfferCard', () => {
  const base: ShopOffer = {
    id: 1, item_name: 'X', item_slug: 'x', item_photo_url: null, item_brand: null, item_description: null,
    standard_price: null, standard_price_type: 'fixed', standard_currency: 'EUR',
    promo_price: null, promo_price_type: null, promo_currency: null, promo_valid_until: null,
  }
  it('fixed without price shows label, no null', () => {
    const { container } = render(<ShopOfferCard offer={base} lang="en" />)
    expect(screen.getByText('No price listed')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(BAD)
  })
  it('valid promo with null standard: promo shown, no strikethrough', () => {
    const { container } = render(
      <ShopOfferCard offer={{ ...base, promo_price: '4.99', promo_price_type: 'fixed', promo_currency: 'EUR', promo_valid_until: '2099-12-31T00:00:00Z' }} lang="en" />,
    )
    expect(screen.getByText('4.99 EUR')).toBeInTheDocument()
    expect(container.querySelector('s')).toBeNull()
  })
  it('promo "None" -> no promo block', () => {
    const { container } = render(
      <ShopOfferCard offer={{ ...base, promo_price: 'None', promo_price_type: 'fixed' }} lang="en" />,
    )
    expect(container.textContent).not.toMatch(BAD)
    expect(screen.getByText('No price listed')).toBeInTheDocument()
  })
})

describe('OfferList', () => {
  const mk = (o: Partial<OfferDetail>): OfferDetail => ({
    shop_id: 1, shop_slug: 'a', shop_name: 'A', shop_address: null, shop_location: null, price: null,
    currency: 'EUR', price_type: 'fixed', price_note: null, shop_phone: null, is_available: true,
    sku: null, url: null, crawled_at: '2026-01-01T00:00:00Z', shop_type: 'local', delivery_available: false, ...o,
  })
  it('valid price sorted before missing price; label visible', () => {
    const { container } = render(
      <OfferList lang="en" productName="p" offers={[mk({ shop_name: 'NoPrice', price: null }), mk({ shop_name: 'Cheap', price: '3.00' })]} />,
    )
    expect(screen.getByText('No price listed')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(BAD)
    const text = container.textContent ?? ''
    expect(text.indexOf('Cheap')).toBeLessThan(text.indexOf('NoPrice'))
  })
})

describe('buildProductSchema', () => {
  const offer = (price: string | null) => ({
    shop_id: 1, shop_slug: 'a', shop_name: 'A', shop_address: null, shop_location: null, price,
    currency: 'EUR', price_type: 'fixed', price_note: null, shop_phone: null, is_available: true,
    sku: null, url: null, crawled_at: '2026-01-01T00:00:00Z',
  })
  it('skips offers with null/None/empty price', () => {
    const product = {
      id: 1, slug: 'p', names: { en: 'P' }, descriptions: {}, brand: null, category: null,
      thumbnail_url: null, images: null, attributes: null, price_history: [],
      offers: [offer(null), offer('None'), offer(''), offer('2.50')],
    } as unknown as ProductDetailResponse
    const json = JSON.stringify(buildProductSchema(product, 'en', 'https://example.com'))
    expect(json).not.toMatch(/"price":(null|"None"|"")/)
    expect(json).toContain('"price":"2.50"')
  })
})

describe('F5200 Staffelpreise — nie null/undefined/NaN (AK12)', () => {
  const dirty = [
    { unit: 'per_hour', unit_label: null, steps: [] },
    { unit: 'piece', unit_label: null, steps: [
      { min_quantity: 1, max_quantity: null, price: '5.0000', currency: 'EUR' },
      { min_quantity: 6, max_quantity: null, price: 'None', currency: 'EUR' },
      { min_quantity: 12, max_quantity: null, price: '4.00', currency: 'EUR' },
    ] },
  ]
  it.each(LANGS)('OfferList + ShopOfferCard (%s)', (lang) => {
    const offer: OfferDetail = {
      shop_id: 1, shop_slug: 'a', shop_name: 'A', shop_address: null, shop_location: null, price: '5.00',
      currency: 'EUR', price_type: 'fixed', price_note: null, shop_phone: null, is_available: true,
      sku: null, url: null, crawled_at: '2026-01-01T00:00:00Z', shop_type: 'local', delivery_available: false, price_tiers: dirty, promo_price_tiers: null,
    }
    const a = render(<OfferList lang={lang} productName="p" offers={[offer]} />)
    expect(a.container.textContent).not.toMatch(BAD)
    cleanup()
    const card: ShopOffer = {
      id: 1, item_name: 'X', item_slug: 'x', item_photo_url: null, item_brand: null, item_description: null,
      standard_price: '5.00', standard_price_type: 'fixed', standard_currency: 'EUR',
      promo_price: '4.00', promo_price_type: 'fixed', promo_currency: 'EUR', promo_valid_until: '2099-12-31T00:00:00Z',
      price_tiers: dirty, promo_price_tiers: dirty,
    }
    const b = render(<ShopOfferCard offer={card} lang={lang} />)
    expect(b.container.textContent).not.toMatch(BAD)
  })
})
