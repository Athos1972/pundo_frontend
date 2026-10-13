/** B5900-010: price-type options are translated (no English literals) */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { AdminOffer } from '@/types/shop-admin'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

vi.mock('@/components/shop-admin/Toast', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/components/shop-admin/PriceTierEditor', () => ({
  PriceTierEditor: ({ label }: { label: string }) => <div data-testid="price-tier-editor">{label}</div>,
}))

vi.mock('@/components/shop-admin/ItemPickerModal', () => ({
  ItemPickerModal: () => null,
}))

vi.mock('@/components/shop-admin/OfferItemPhotos', () => ({
  OfferItemPhotos: () => <div data-testid="offer-item-photos-mock" />,
}))

vi.mock('@/components/shop-admin/FormField', () => ({
  FormField: ({ label, children }: { label: string; children?: React.ReactNode }) => (
    <div><label>{label}</label>{children}</div>
  ),
}))

// ─── Fixtures

const OFFER_NO_PROMO: AdminOffer = {
  id: 1,
  shop_listing_id: 10,
  title: 'Test',
  description: null,
  price_type: 'fixed',
  price_tiers: [{ unit: 'piece', steps: [{ min_quantity: 1, price: '49.9900', currency: 'EUR' }] }],
  currency: 'EUR',
  promo_price_type: null,
  promo_price_tiers: [],
  promo_valid_from: null,
  promo_valid_until: null,
  source: 'shop_manual',
  offer_url: null,
  archived: false,
  crawled_at: null,
  created_at: '2026-01-01T00:00:00Z',
}

const OFFER_WITH_PROMO: AdminOffer = {
  ...OFFER_NO_PROMO,
  id: 2,
  promo_price_type: 'fixed',
  promo_price_tiers: [{ unit: 'piece', steps: [{ min_quantity: 1, price: '39.9900', currency: 'EUR' }] }],
  promo_valid_from: '2026-05-19',
  promo_valid_until: '2026-06-19',
}


describe('OfferForm price-type i18n', () => {
  for (const lang of ['de', 'el', 'ar']) {
    it(`${lang}: standard and promo selects use translated option labels`, async () => {
      const { OfferForm } = await import('@/components/shop-admin/OfferForm')
      const tr = tAdmin(lang)
      const { container } = render(<OfferForm offer={OFFER_WITH_PROMO} lang={lang} />)
      const selects = Array.from(container.querySelectorAll('select')).filter((sel) =>
        Array.from(sel.options).some((o) => o.value === 'on_request'),
      )
      expect(selects.length).toBe(2)
      const expected = [tr.price_type_fixed, tr.price_type_on_request, tr.price_type_free, tr.price_type_variable]
      for (const sel of selects) {
        expect(Array.from(sel.options).map((o) => o.value)).toEqual(['fixed', 'on_request', 'free', 'variable'])
        expect(Array.from(sel.options).map((o) => o.textContent)).toEqual(expected)
      }
      if (lang !== 'en') {
        expect(container.textContent).not.toMatch(/On request|Variable\b/)
      }
    })
  }
})
