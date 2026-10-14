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

// ─── Tests: Übernehmen-Button ─────────────────────────────────────────────────

describe('Shop-Admin OfferList — Übernehmen-Button', () => {
  beforeEach(() => mockFetch(true, ACTIVATED_OFFER))

  it('zeigt den Übernehmen-Button für auto_seeded Offers', async () => {
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

  it('zeigt keinen Übernehmen-Button für shop_manual Offers', async () => {
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

  it('Klick auf Übernehmen sendet PATCH mit archived:false', async () => {
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

  it('entfernt Draft-Badge nach erfolgreichem Übernehmen', async () => {
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

  it('Übernehmen-Button hat korrekten Tooltip', async () => {
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

describe('B5910-007 — Knopftext "Übernehmen"/"Keep"', () => {
  it('de/en Werte', () => {
    expect(tAdmin('de').offer_activate).toBe('Übernehmen')
    expect(tAdmin('en').offer_activate).toBe('Keep')
  })

  it('Tooltip verspricht keine öffentliche Sichtbarkeit', () => {
    expect(tAdmin('de').offer_activate_tooltip).not.toMatch(/sichtbar/i)
    expect(tAdmin('en').offer_activate_tooltip).not.toMatch(/visible/i)
  })
})

// ─── B5900-017: Übersetzungen + Zeilen-Layout ────────────────────────────────

const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

async function renderList(items: AdminOffer[], lang: string) {
  const { OfferList } = await import('@/components/shop-admin/OfferList')
  return render(<OfferList activeItems={items} expiredItems={[]} lang={lang} />)
}

describe('B5900-017 — OfferList übersetzt Preis, Datum, Toast', () => {
  it.each(LANGS)('on_request wird in %s übersetzt', async (lang) => {
    await renderList([{ ...BASE_OFFER, price_type: 'on_request' }], lang)
    const text = screen.getByTestId('offer-row').textContent ?? ''
    expect(text).toContain(tAdmin(lang).price_type_on_request)
    expect(text).not.toContain('on request')
  })

  it('free wird in de übersetzt', async () => {
    await renderList([{ ...BASE_OFFER, price_type: 'free' }], 'de')
    const text = screen.getByTestId('offer-row').textContent ?? ''
    expect(text).toContain('Kostenlos')
    expect(text).not.toMatch(/\bfree\b/)
  })

  it('nur from -> "Gültig ab", nur until -> "Gültig bis"', async () => {
    const a = await renderList([{ ...BASE_OFFER, promo_valid_from: '2026-10-14T00:00:00Z' }], 'de')
    expect(screen.getByTestId('offer-row').textContent).toContain('Gültig ab 2026-10-14')
    expect(screen.getByTestId('offer-row').textContent).not.toMatch(/from /)
    a.unmount()
    await renderList([{ ...BASE_OFFER, promo_valid_until: '2099-10-14T00:00:00Z' }], 'de')
    expect(screen.getByTestId('offer-row').textContent).toContain('Gültig bis 2099-10-14')
    expect(screen.getByTestId('offer-row').textContent).not.toMatch(/until /)
  })

  it('Archivieren zeigt übersetzten Toast', async () => {
    mockFetch(true, {})
    const { showToast } = await import('@/components/shop-admin/Toast')
    await renderList([BASE_OFFER], 'de')
    fireEvent.click(screen.getByRole('button', { name: tr.archive }))
    fireEvent.click(screen.getAllByRole('button', { name: tr.archive })[0])
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.offer_archive_success, 'success'))
    expect(tr.offer_archive_success).toBe('Angebot archiviert.')
  })

  it.each(LANGS)('Keys vorhanden in %s', (lang) => {
    const t = tAdmin(lang)
    expect(t.offer_archive_success).toBeTruthy()
    expect(t.price_type_on_request).toBeTruthy()
    expect(t.price_type_free).toBeTruthy()
  })
})

describe('B5900-017 — Zeilen-Struktur', () => {
  it('Aktionen liegen im Body, nicht direkt in der Zeile; kein rtl:flex-row-reverse', async () => {
    await renderList([AUTO_SEEDED_OFFER, BASE_OFFER], 'el')
    const rows = screen.getAllByTestId('offer-row')
    expect(rows).toHaveLength(2)
    const actions = screen.getAllByTestId('offer-row-actions')
    expect(actions).toHaveLength(2)
    expect(actions[0].parentElement).not.toBe(rows[0])
    expect(rows[0].contains(actions[0])).toBe(true)
    expect(actions[0]).toHaveTextContent(tAdmin('el').offer_activate)
    expect(actions[0].className).toContain('flex-wrap')
    expect(rows[0].className).toContain('px-4')
    expect(rows[0].className).toContain('py-3')
    expect(rows[0].className).not.toContain('rtl:flex-row-reverse')
  })
})
