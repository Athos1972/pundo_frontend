/**
 * B5200-001 — OfferForm: PATCH on an archived offer returns 409 `offer_archived`.
 *
 * - with active_offer_id → toast offer_archived_conflict + open the current offer's edit page
 * - without active_offer_id → toast offer_archived_readonly + back to the list
 * - other 409 → generic error, no navigation
 * - new keys exist in all 6 languages
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { AdminOffer } from '@/types/shop-admin'

const push = vi.fn()
const showToast = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock('@/components/shop-admin/Toast', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}))
vi.mock('@/components/shop-admin/PriceTierEditor', () => ({
  PriceTierEditor: () => <div />,
}))
vi.mock('@/components/shop-admin/ItemPickerModal', () => ({ ItemPickerModal: () => null }))
vi.mock('@/components/shop-admin/OfferItemPhotos', () => ({ OfferItemPhotos: () => <div /> }))

import { OfferForm } from '@/components/shop-admin/OfferForm'

const ARCHIVED_OFFER: AdminOffer = {
  id: 7153,
  shop_listing_id: 26920,
  title: null,
  description: null,
  price_type: 'fixed',
  price_tiers: [{ unit: 'piece', steps: [{ min_quantity: 1, price: '4.50', currency: 'EUR' }] }],
  currency: 'EUR',
  promo_price_type: null,
  promo_price_tiers: [],
  promo_valid_from: null,
  promo_valid_until: null,
  source: 'shop_manual',
  offer_url: null,
  archived: true,
  crawled_at: null,
  created_at: '2026-10-13T00:00:00Z',
}

function mockFetch409(detail: unknown) {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ detail }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    }),
  ) as unknown as typeof fetch
}

function submit() {
  const { container } = render(<OfferForm offer={ARCHIVED_OFFER} lang="de" />)
  fireEvent.submit(container.querySelector('form')!)
}

const realFetch = global.fetch
beforeEach(() => {
  push.mockReset()
  showToast.mockReset()
})
afterEach(() => {
  global.fetch = realFetch
})

describe('OfferForm — 409 offer_archived (B5200-001)', () => {
  it('opens the current offer when active_offer_id is given', async () => {
    mockFetch409({ code: 'offer_archived', message: 'x', active_offer_id: 7202 })
    submit()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/shop-admin/offers/7202/edit'))
    expect(showToast).toHaveBeenCalledWith(tAdmin('de').offer_archived_conflict, 'error')
  })

  it('goes back to the list when no offer is active', async () => {
    mockFetch409({ code: 'offer_archived', message: 'x', active_offer_id: null })
    submit()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/shop-admin/offers'))
    expect(showToast).toHaveBeenCalledWith(tAdmin('de').offer_archived_readonly, 'error')
  })

  it('shows the generic error for other 409s', async () => {
    mockFetch409('something else')
    submit()
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tAdmin('de').error_generic, 'error'))
    expect(push).not.toHaveBeenCalled()
  })
})

describe('shop-admin-translations — B5200-001 keys', () => {
  const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const
  it.each(LANGS)('lang=%s has offer_archived_conflict + offer_archived_readonly', (lang) => {
    expect(tAdmin(lang).offer_archived_conflict).toBeTruthy()
    expect(tAdmin(lang).offer_archived_readonly).toBeTruthy()
  })
})
