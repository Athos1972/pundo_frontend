import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { AdminOffer } from '@/types/shop-admin'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

vi.mock('@/components/shop-admin/Toast', () => ({
  showToast: vi.fn(),
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const tr = tAdmin('de')

const BASE_OFFER: AdminOffer = {
  id: 1,
  shop_listing_id: 10,
  title: 'Test Offer',
  description: null,
  price_type: 'fixed',
  price_tiers: [],
  currency: 'EUR',
  promo_price_type: null,
  promo_price_tiers: [],
  promo_valid_from: null,
  promo_valid_until: null,
  source: 'shop_manual',
  offer_url: null,
  archived: false,
  crawled_at: null,
  created_at: '2024-01-01T00:00:00Z',
  item: undefined,
}

const AUTO_SEEDED_OFFER: AdminOffer = {
  ...BASE_OFFER,
  id: 2,
  title: 'Auto Offer',
  source: 'auto_seeded',
}

const ACTIVATED_OFFER: AdminOffer = {
  ...AUTO_SEEDED_OFFER,
  source: 'shop_manual',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(ok: boolean, responseBody: unknown = {}, status = ok ? 200 : 500) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => responseBody,
    })
  )
}

// ─── Tests: Draft badge ───────────────────────────────────────────────────────

describe('Shop-Admin OfferList — Draft badge', () => {
  beforeEach(() => mockFetch(true, ACTIVATED_OFFER))

  it('zeigt den Draft-Badge für auto_seeded Offers', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    render(
      <OfferList
        activeItems={[AUTO_SEEDED_OFFER]}
        expiredItems={[]}
        lang="de"
      />
    )
    expect(screen.getByText(tr.offer_status_draft)).toBeInTheDocument()
  })

  it('zeigt keinen Draft-Badge für shop_manual Offers', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    render(
      <OfferList
        activeItems={[BASE_OFFER]}
        expiredItems={[]}
        lang="de"
      />
    )
    expect(screen.queryByText(tr.offer_status_draft)).not.toBeInTheDocument()
  })
})

// ─── Tests: Aktivieren-Button ─────────────────────────────────────────────────

describe('Shop-Admin OfferList — Aktivieren-Button', () => {
  beforeEach(() => mockFetch(true, ACTIVATED_OFFER))

  it('zeigt den Aktivieren-Button für auto_seeded Offers', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    render(
      <OfferList
        activeItems={[AUTO_SEEDED_OFFER]}
        expiredItems={[]}
        lang="de"
      />
    )
    expect(screen.getByRole('button', { name: tr.offer_activate })).toBeInTheDocument()
  })

  it('zeigt keinen Aktivieren-Button für shop_manual Offers', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    render(
      <OfferList
        activeItems={[BASE_OFFER]}
        expiredItems={[]}
        lang="de"
      />
    )
    expect(screen.queryByRole('button', { name: tr.offer_activate })).not.toBeInTheDocument()
  })

  it('Klick auf Aktivieren sendet PATCH mit archived:false', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    render(
      <OfferList
        activeItems={[AUTO_SEEDED_OFFER]}
        expiredItems={[]}
        lang="de"
      />
    )

    const btn = screen.getByRole('button', { name: tr.offer_activate })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        `/api/shop-admin/offers/${AUTO_SEEDED_OFFER.id}`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ archived: false }),
        })
      )
    })
  })

  it('entfernt Draft-Badge nach erfolgreichem Aktivieren', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    render(
      <OfferList
        activeItems={[AUTO_SEEDED_OFFER]}
        expiredItems={[]}
        lang="de"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: tr.offer_activate }))

    await waitFor(() => {
      expect(screen.queryByText(tr.offer_status_draft)).not.toBeInTheDocument()
    })
  })

  it('Aktivieren-Button hat korrekten Tooltip', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    render(
      <OfferList
        activeItems={[AUTO_SEEDED_OFFER]}
        expiredItems={[]}
        lang="de"
      />
    )
    const btn = screen.getByRole('button', { name: tr.offer_activate })
    expect(btn).toHaveAttribute('title', tr.offer_activate_tooltip)
  })
})

// ─── Tests: Translations ──────────────────────────────────────────────────────

describe('Translations — offer_status_draft / offer_activate', () => {
  const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

  it.each(LANGS)('Sprache %s hat offer_status_draft', (lang) => {
    expect(tAdmin(lang).offer_status_draft).toBeTruthy()
  })

  it.each(LANGS)('Sprache %s hat offer_activate', (lang) => {
    expect(tAdmin(lang).offer_activate).toBeTruthy()
  })

  it.each(LANGS)('Sprache %s hat offer_activate_tooltip', (lang) => {
    expect(tAdmin(lang).offer_activate_tooltip).toBeTruthy()
  })

  it.each(LANGS)('Sprache %s hat offer_activate_success', (lang) => {
    expect(tAdmin(lang).offer_activate_success).toBeTruthy()
  })
})

// ─── Tests: resolveLocalizedName ─────────────────────────────────────────────

describe('resolveLocalizedName', () => {
  it('gibt bevorzugten Sprachnamen zurück', async () => {
    const { resolveLocalizedName } = await import('@/components/shop-admin/OfferItemHeader')
    expect(resolveLocalizedName({ de: 'Apfel', en: 'Apple' }, 'de')).toBe('Apfel')
  })

  it('fällt auf Englisch zurück wenn bevorzugte Sprache fehlt', async () => {
    const { resolveLocalizedName } = await import('@/components/shop-admin/OfferItemHeader')
    expect(resolveLocalizedName({ en: 'Apple' }, 'de')).toBe('Apple')
  })

  it('gibt ersten verfügbaren Namen zurück wenn en und bevorzugte fehlen', async () => {
    const { resolveLocalizedName } = await import('@/components/shop-admin/OfferItemHeader')
    expect(resolveLocalizedName({ el: 'Μήλο' }, 'de')).toBe('Μήλο')
  })

  it('gibt null zurück für leeres Objekt', async () => {
    const { resolveLocalizedName } = await import('@/components/shop-admin/OfferItemHeader')
    expect(resolveLocalizedName({}, 'de')).toBeNull()
  })
})
