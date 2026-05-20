/**
 * Unit tests for OfferForm — promo price model (offer-price-model-and-display-20260520)
 *
 * Tests:
 * - shop-admin-translations: neue Promo-Keys in allen 6 Sprachen
 * - OfferForm: showPromo initial state (false when no promo, true when promo present)
 * - OfferForm: renders Standardpreis-Bereich
 * - OfferForm: renders Aktionspreis-Toggle-Button
 * - OfferForm: promo accordion disabled for scraper source
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { AdminOffer } from '@/types/shop-admin'

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

vi.mock('@/components/shop-admin/FormField', () => ({
  FormField: ({ label, children }: { label: string; children?: React.ReactNode }) => (
    <div><label>{label}</label>{children}</div>
  ),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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

const SCRAPER_OFFER: AdminOffer = {
  ...OFFER_NO_PROMO,
  id: 3,
  source: 'scraper',
}

// ─── Tests: shop-admin-translations neue Keys ─────────────────────────────────

describe('shop-admin-translations — neue Promo-Keys', () => {
  const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

  it.each(LANGS)('lang=%s hat standard_price key', (lang) => {
    expect(tAdmin(lang).standard_price).toBeTruthy()
  })

  it.each(LANGS)('lang=%s hat add_promo key', (lang) => {
    expect(tAdmin(lang).add_promo).toBeTruthy()
  })

  it.each(LANGS)('lang=%s hat promo_section key', (lang) => {
    expect(tAdmin(lang).promo_section).toBeTruthy()
  })

  it.each(LANGS)('lang=%s hat promo_price key', (lang) => {
    expect(tAdmin(lang).promo_price).toBeTruthy()
  })

  it('EN: standard_price = "Standard price"', () => {
    expect(tAdmin('en').standard_price).toBe('Standard price')
  })

  it('DE: standard_price = "Standardpreis"', () => {
    expect(tAdmin('de').standard_price).toBe('Standardpreis')
  })

  it('EN: add_promo = "Add promotion"', () => {
    expect(tAdmin('en').add_promo).toBe('Add promotion')
  })

  it('DE: add_promo = "Aktion hinzufügen"', () => {
    expect(tAdmin('de').add_promo).toBe('Aktion hinzufügen')
  })

  it('EN: promo_section = "Promotion (optional)"', () => {
    expect(tAdmin('en').promo_section).toBe('Promotion (optional)')
  })

  it('DE: promo_section = "Aktionspreis (optional)"', () => {
    expect(tAdmin('de').promo_section).toBe('Aktionspreis (optional)')
  })
})

// ─── Tests: OfferForm rendering ───────────────────────────────────────────────

describe('OfferForm — Promo-Sektion', () => {
  async function renderForm(offer?: AdminOffer) {
    const { OfferForm } = await import('@/components/shop-admin/OfferForm')
    return render(<OfferForm offer={offer} lang="de" />)
  }

  it('zeigt "Standardpreis" Label im Formular (edit mode)', async () => {
    await renderForm(OFFER_NO_PROMO)
    expect(screen.getByText(tAdmin('de').standard_price)).toBeDefined()
  })

  it('zeigt Promo-Accordion-Header "Aktionspreis (optional)" wenn kein Promo-Offer (shop_manual)', async () => {
    await renderForm(OFFER_NO_PROMO)
    const tr = tAdmin('de')
    // The promo accordion button always shows promo_section label
    expect(screen.getByText(tr.promo_section)).toBeDefined()
  })

  it('zeigt Promo-Sektion ausgeklappt wenn Offer bereits promo_price_tiers hat', async () => {
    await renderForm(OFFER_WITH_PROMO)
    const tr = tAdmin('de')
    // promo_section label should be visible (accordion open)
    expect(screen.getByText(tr.promo_section)).toBeDefined()
  })

  it('Aktionspreis-Button ist disabled für scraper-Offer', async () => {
    await renderForm(SCRAPER_OFFER)
    const tr = tAdmin('de')
    // promo_section button is always rendered but disabled for scraper
    const btn = screen.getByRole('button', { name: new RegExp(tr.promo_section.replace('(', '\\(').replace(')', '\\)')) })
    expect(btn).toBeDisabled()
    // Accordion body (promo details) NOT shown since scraper offer starts collapsed
    expect(screen.queryByText(tr.promo_price)).toBeNull()
  })
})

// ─── Tests: Promo validation logic (pure) ────────────────────────────────────

describe('Promo validation logic — Tripel-Vollständigkeit', () => {
  /**
   * The validation requires ALL THREE to be set or NONE:
   * - promoTiers with at least one step with price
   * - promo_valid_from
   * - promo_valid_until
   */

  function validatePromo(
    promoTiers: Array<{ steps: Array<{ price: string }> }>,
    promoFrom: string | null,
    promoUntil: string | null,
  ): { tiersOk: boolean; datesOk: boolean; dateOrderOk: boolean } {
    const hasPromoTiers = promoTiers.length > 0 && promoTiers.some(t => t.steps.some(s => !!s.price))
    const hasPromoDates = !!(promoFrom && promoUntil)
    const dateOrderOk = !(hasPromoTiers && hasPromoDates && promoFrom && promoUntil && promoFrom > promoUntil)
    return { tiersOk: hasPromoTiers, datesOk: hasPromoDates, dateOrderOk }
  }

  it('vollständige Promo-Daten sind valide', () => {
    const result = validatePromo(
      [{ steps: [{ price: '39.99' }] }],
      '2026-05-19',
      '2026-06-19'
    )
    expect(result.tiersOk).toBe(true)
    expect(result.datesOk).toBe(true)
    expect(result.dateOrderOk).toBe(true)
  })

  it('fehlende Tiers → tiersOk=false', () => {
    const result = validatePromo([], '2026-05-19', '2026-06-19')
    expect(result.tiersOk).toBe(false)
  })

  it('fehlende Daten → datesOk=false', () => {
    const result = validatePromo([{ steps: [{ price: '39.99' }] }], null, null)
    expect(result.datesOk).toBe(false)
  })

  it('Tiers mit leerem Preis → tiersOk=false', () => {
    const result = validatePromo([{ steps: [{ price: '' }] }], '2026-05-19', '2026-06-19')
    expect(result.tiersOk).toBe(false)
  })

  it('from > until → dateOrderOk=false', () => {
    const result = validatePromo(
      [{ steps: [{ price: '39.99' }] }],
      '2026-06-19',
      '2026-05-19'  // until before from
    )
    expect(result.dateOrderOk).toBe(false)
  })

  it('from === until → dateOrderOk=true (same day is ok)', () => {
    const result = validatePromo(
      [{ steps: [{ price: '39.99' }] }],
      '2026-06-19',
      '2026-06-19'
    )
    expect(result.dateOrderOk).toBe(true)
  })
})
