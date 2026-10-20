import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { OfferDetail } from '@/types/api'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

const baseOffer: OfferDetail = {
  shop_id: 1,
  shop_slug: 'test-shop',
  shop_name: 'Test Shop',
  shop_address: null,
  shop_location: null,
  price: null,
  currency: 'EUR',
  price_type: 'on_request',
  price_note: null,
  shop_phone: null,
  is_available: true,
  sku: null,
  url: null,
  crawled_at: '2026-05-01T10:00:00Z',
  shop_type: 'local',
  delivery_available: false,
}

describe('OfferList — Aktionspreis-Regression (Bug: 3€ statt 39,99€)', () => {
  it('zeigt promo_price prominent wenn gesetzt', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = {
      ...baseOffer,
      price: '39.9900',
      price_type: 'fixed',
      currency: 'EUR',
      standard_price: '50.0000',
      standard_currency: 'EUR',
      promo_price: '39.9900',
      promo_currency: 'EUR',
      promo_valid_until: '2026-06-19T00:00:00Z',
    }
    render(<OfferList offers={[offer]} lang="en" productName="Budgie Food" />)
    expect(screen.getByText('39.99 EUR')).toBeInTheDocument()
    expect(screen.getByText('50.00 EUR')).toBeInTheDocument()
  })

  it('zeigt standard_price durchgestrichen wenn promo aktiv', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = {
      ...baseOffer,
      price: '39.9900',
      price_type: 'fixed',
      currency: 'EUR',
      standard_price: '50.0000',
      standard_currency: 'EUR',
      promo_price: '39.9900',
      promo_currency: 'EUR',
      promo_valid_until: '2026-06-19T00:00:00Z',
    }
    const { container } = render(<OfferList offers={[offer]} lang="en" productName="Budgie Food" />)
    const strikethrough = container.querySelector('s')
    expect(strikethrough).not.toBeNull()
    expect(strikethrough?.textContent).toBe('50.00 EUR')
  })

  it('zeigt keinen Durchstreichpreis wenn kein promo_price', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = {
      ...baseOffer,
      price: '50.0000',
      price_type: 'fixed',
      currency: 'EUR',
      standard_price: '50.0000',
      standard_currency: 'EUR',
    }
    const { container } = render(<OfferList offers={[offer]} lang="en" productName="Budgie Food" />)
    expect(container.querySelector('s')).toBeNull()
    expect(screen.getByText('50.00 EUR')).toBeInTheDocument()
  })

  it('fällt auf offer.price zurück wenn standard_price fehlt (Legacy-Antwort)', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = {
      ...baseOffer,
      price: '7.9900',
      price_type: 'fixed',
      currency: 'EUR',
    }
    render(<OfferList offers={[offer]} lang="en" productName="Budgie Food" />)
    expect(screen.getByText('7.99 EUR')).toBeInTheDocument()
  })
})

describe('OfferList — URL sanitization', () => {
  it('does not render a link when url is a raw base64 token', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = { ...baseOffer, url: 'Sa7Puak8aJ4JLDsUdQi7Q==' }
    render(<OfferList offers={[offer]} lang="en" productName="Test Product" />)
    expect(document.querySelector('a[href="Sa7Puak8aJ4JLDsUdQi7Q=="]')).toBeNull()
  })

  it('renders a Website link when url is a valid https URL', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = { ...baseOffer, url: 'https://example.cy' }
    render(<OfferList offers={[offer]} lang="en" productName="Test Product" />)
    const links = screen.getAllByRole('link', { name: 'Website' })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('https://example.cy')
  })

  it('renders exactly one Website link when three offers have mixed urls (valid / token / null)', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offers: OfferDetail[] = [
      { ...baseOffer, shop_id: 1, shop_name: 'Shop A', url: 'https://valid.cy' },
      { ...baseOffer, shop_id: 2, shop_name: 'Shop B', url: 'Sa7Puak8aJ4JLDsUdQi7Q==' },
      { ...baseOffer, shop_id: 3, shop_name: 'Shop C', url: null },
    ]
    render(<OfferList offers={offers} lang="en" productName="Test Product" />)
    const websiteLinks = screen.getAllByRole('link', { name: 'Website' })
    expect(websiteLinks).toHaveLength(1)
    expect(websiteLinks[0].getAttribute('href')).toBe('https://valid.cy')
  })
})

describe('OfferList — Last checked (B4900-003)', () => {
  it('blendet "Last checked" aus, wenn crawled_at null ist (Shop-Admin-Offer)', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    render(<OfferList offers={[{ ...baseOffer, crawled_at: null }]} lang="en" productName="Catering" />)
    expect(screen.queryByText(/Last checked/)).toBeNull()
    expect(screen.queryByText(/days ago/)).toBeNull()
  })

  it('zeigt "Last checked" wenn crawled_at gesetzt ist', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-04T10:00:00Z'))
    try {
      const { OfferList } = await import('@/components/product/OfferList')
      render(<OfferList offers={[baseOffer]} lang="en" productName="Catering" />)
      expect(screen.getByText('Last checked: 3 days ago')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})

// ─── F5200 Staffelpreise & Einheiten ─────────────────────────────────────────
describe('OfferList — Staffelpreise (F5200)', () => {
  const tier = (steps: Array<[number, number | null, string]>, label: string | null = 'Stück', unit = 'per_piece') => ({
    unit,
    unit_label: label,
    steps: steps.map(([min_quantity, max_quantity, price]) => ({ min_quantity, max_quantity, price, currency: 'EUR' })),
  })
  const tiered: OfferDetail = {
    ...baseOffer,
    price: '4.5000',
    price_type: 'fixed',
    price_tiers: [tier([[1, 5, '4.5000'], [6, null, '4.0000']])],
    promo_price_tiers: null,
  }

  async function renderList(offer: OfferDetail, lang = 'de') {
    const { OfferList } = await import('@/components/product/OfferList')
    return render(<OfferList offers={[offer]} lang={lang} productName="Brot" />)
  }

  it('AK1: Hauptpreis, Suffix, eine Staffelzeile, kein Badge/Durchstreichung', async () => {
    const { container } = await renderList(tiered)
    expect(screen.getByText('4.50 EUR')).toBeInTheDocument()
    expect(screen.getAllByText('/ Stück').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByLabelText('Mengenpreise').textContent).toBe('ab 6: 4.00 EUR / Stück')
    expect(container.querySelector('s')).toBeNull()
    expect(container.textContent).not.toContain('Aktion bis')
  })

  it('AK2: Aktion zeigt nur Promo, Normalpreis durchgestrichen, keine Standard-Staffel', async () => {
    const { container } = await renderList({
      ...tiered,
      promo_price: '3.9000', promo_currency: 'EUR', standard_price: '4.5000', standard_currency: 'EUR',
      promo_valid_until: '2099-12-31T00:00:00Z',
      promo_price_tiers: [tier([[1, null, '3.9000']])],
    })
    expect(screen.getByText('3.90 EUR')).toBeInTheDocument()
    expect(container.querySelector('s')?.textContent).toBe('4.50 EUR')
    expect(screen.getByText(/Aktion bis/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Mengenpreise')).toBeNull()
    expect(container.textContent).not.toContain('4.00 EUR')
  })

  it('A2: andere Einheit → kein Durchstreichen, Badge bleibt', async () => {
    const { container } = await renderList({
      ...tiered,
      promo_price: '30.0000', promo_currency: 'EUR', standard_price: '4.5000', standard_currency: 'EUR',
      promo_valid_until: '2099-12-31T00:00:00Z',
      promo_price_tiers: [tier([[1, null, '30.0000']], 'm²', 'per_m2')],
    })
    expect(container.querySelector('s')).toBeNull()
    expect(screen.getByText(/Aktion bis/)).toBeInTheDocument()
  })

  it('AK6: mehrere Einheiten', async () => {
    await renderList({
      ...tiered,
      price_tiers: [tier([[1, null, '45']], 'Stunde', 'per_hour'), tier([[1, null, '30'], [50, null, '26']], 'm²', 'per_m2')],
    })
    expect(screen.getByText('45.00 EUR')).toBeInTheDocument()
    expect(screen.getByLabelText('Mengenpreise').textContent).toBe('30.00 EUR / m²ab 50: 26.00 EUR / m²')
  })

  it('AK7: 5 Zeilen → Alle Preise (5)', async () => {
    await renderList({
      ...tiered,
      price_tiers: [tier([[1, null, '9'], [2, null, '8'], [3, null, '7'], [4, null, '6'], [5, null, '5'], [6, null, '4']])],
    })
    expect(screen.getByText('Alle Preise (5)')).toBeInTheDocument()
  })

  it('AK9: Legacy-Tier ohne Label → kein Suffix, kein Block', async () => {
    const { container } = await renderList({ ...tiered, price: '9.99', price_tiers: [tier([[1, null, '9.99']], null, 'piece')] })
    expect(screen.getByText('9.99 EUR')).toBeInTheDocument()
    expect(container.textContent).not.toContain('/ ')
    expect(screen.queryByLabelText('Mengenpreise')).toBeNull()
  })

  it('AK10: custom-Label, fixed ohne Suffix', async () => {
    await renderList({ ...tiered, price_tiers: [tier([[1, null, '7']], 'Laib', 'custom')] })
    expect(screen.getByText('/ Laib')).toBeInTheDocument()
  })

  it('AK11: Mindestmenge', async () => {
    const { container } = await renderList({ ...tiered, price_tiers: [tier([[3, null, '4.5']])] })
    expect(container.textContent).toContain('ab 3 · 4.50 EUR')
  })

  it('AK12: nie null/undefined/NaN', async () => {
    const { container } = await renderList({
      ...tiered,
      price_tiers: [{ unit: 'per_hour', unit_label: null, steps: [] }, tier([[1, null, '5'], [6, null, 'x']], null)],
    })
    expect(container.textContent).not.toMatch(/null|undefined|NaN|None/)
  })

  it('on_request ignoriert Tiers', async () => {
    await renderList({ ...tiered, price_type: 'on_request' })
    expect(screen.queryByLabelText('Mengenpreise')).toBeNull()
    expect(screen.queryByText('/ Stück')).toBeNull()
  })
})
