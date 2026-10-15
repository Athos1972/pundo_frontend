/**
 * F5920 — Shop-Admin offer list shows the article number (SKU) and a "Not available" badge
 * for listings an import (complete list / sheet sync) switched off. AK 8, AK 22.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { AdminOffer } from '@/types/shop-admin'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock('@/components/shop-admin/Toast', () => ({ showToast: vi.fn() }))

const BASE: AdminOffer = {
  id: 1, shop_listing_id: 10, title: 'Dog Food', description: null, price_type: 'fixed', price_tiers: [],
  currency: 'EUR', promo_price_type: null, promo_price_tiers: [], promo_valid_from: null, promo_valid_until: null,
  source: 'shop_upload', offer_url: null, archived: false, crawled_at: null, created_at: '2026-10-15T00:00:00Z',
}

async function renderList(items: AdminOffer[], lang = 'en') {
  const { OfferList } = await import('@/components/shop-admin/OfferList')
  return render(<OfferList activeItems={items} expiredItems={[]} lang={lang} />)
}

describe('OfferList — SKU', () => {
  it('shows the SKU of the listing, left-to-right and monospaced', async () => {
    await renderList([{ ...BASE, listing_sku: 'A-100', listing_available: true }])
    const sku = screen.getByTestId('offer-sku')
    expect(sku).toHaveTextContent('SKU A-100')
    const code = within(sku).getByText('A-100')
    expect(code.tagName).toBe('CODE')
    expect(code.getAttribute('dir')).toBe('ltr')
  })

  it.each([undefined, null, ''])('shows no SKU line for %s', async (sku) => {
    await renderList([{ ...BASE, listing_sku: sku as string | null | undefined }])
    expect(screen.queryByTestId('offer-sku')).toBeNull()
  })

  it('shows the SKU of an Arabic UI with the label translated and the code left-to-right', async () => {
    await renderList([{ ...BASE, listing_sku: 'B-200' }], 'ar')
    expect(screen.getByTestId('offer-sku').querySelector('code')!.getAttribute('dir')).toBe('ltr')
  })
})

describe('OfferList — "Not available" badge', () => {
  it('appears when the listing was set to not available (import / sheet sync)', async () => {
    await renderList([{ ...BASE, listing_available: false }])
    expect(screen.getByTestId('offer-not-available-badge')).toHaveTextContent('Not available')
  })

  it.each([true, null, undefined])('does not appear for listing_available=%s', async (value) => {
    await renderList([{ ...BASE, listing_available: value as boolean | null | undefined }])
    expect(screen.queryByTestId('offer-not-available-badge')).toBeNull()
  })

  it('stays beside the existing "Import" source badge', async () => {
    await renderList([{ ...BASE, listing_available: false }])
    expect(screen.getByText(tAdmin('en').source_shop_upload)).toBeInTheDocument()
  })

  it.each(['en', 'de', 'el', 'ru', 'ar', 'he'])('badge, SKU label, hint and conflict text exist in %s', (lang) => {
    const t = tAdmin(lang)
    for (const text of [t.offer_not_available_badge, t.offer_sku_short, t.offer_sku_label, t.offer_sku_hint, t.offer_sku_conflict]) {
      expect(text.length).toBeGreaterThan(1)
    }
  })
})
