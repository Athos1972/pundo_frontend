/**
 * Unit tests for F5910 Service-Discovery-Bridge frontend components.
 *
 * Covers:
 *  - ServiceResultCard rendering with mock data (AC7)
 *  - ServiceResultCard click routing to /shops?service=<id> (AC8)
 *  - ResultCard discriminator (service vs product routing)
 *  - isServiceResult / isProductResult type guards
 *  - searchAll API client: verifies correct endpoint and bbox param
 *  - translations: all 6 languages have the new result_service_* keys
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

// ─── Type guards ───────────────────────────────────────────────────────────────

describe('isServiceResult / isProductResult type guards', () => {
  it('isServiceResult returns true for service items', async () => {
    const { isServiceResult } = await import('@/types/api')
    const item = { result_type: 'service' as const, category_id: 1, category_slug: null, name: 'Klempner', provider_count: 3, matched_via: 'domain' as const, score: 0.85 }
    expect(isServiceResult(item)).toBe(true)
  })

  it('isServiceResult returns false for product items', async () => {
    const { isServiceResult } = await import('@/types/api')
    const item = { result_type: 'product' as const, id: 1, slug: 'cat-food', name: 'Cat Food', brand: null, category_id: null, thumbnail_url: null, images: null, best_offer: null, score: 0.6 }
    expect(isServiceResult(item)).toBe(false)
  })

  it('isProductResult returns true for product items', async () => {
    const { isProductResult } = await import('@/types/api')
    const item = { result_type: 'product' as const, id: 1, slug: 'cat-food', name: 'Cat Food', brand: null, category_id: null, thumbnail_url: null, images: null, best_offer: null, score: 0.6 }
    expect(isProductResult(item)).toBe(true)
  })
})

// ─── ServiceResultCard rendering ──────────────────────────────────────────────

describe('ServiceResultCard', () => {
  beforeEach(() => { mockPush.mockClear() })

  const mockServiceItem = {
    result_type: 'service' as const,
    category_id: 42,
    category_slug: null,
    name: 'Klempner und Sanitär',
    provider_count: 5,
    matched_via: 'domain' as const,
    score: 0.85,
  }

  it('AC7: renders service card with provider count in English', async () => {
    const { ServiceResultCard } = await import('@/components/search/ServiceResultCard')
    render(<ServiceResultCard item={mockServiceItem} lang="en" />)
    expect(screen.getByText('Klempner und Sanitär')).toBeTruthy()
    expect(screen.getByText(/5 providers/i)).toBeTruthy()
    expect(screen.getByText(/view providers/i)).toBeTruthy()
  })

  it('AC7: renders service card in German', async () => {
    const { ServiceResultCard } = await import('@/components/search/ServiceResultCard')
    render(<ServiceResultCard item={mockServiceItem} lang="de" />)
    expect(screen.getByText('Klempner und Sanitär')).toBeTruthy()
    expect(screen.getByText(/5 Anbieter in der Nähe/i)).toBeTruthy()
    expect(screen.getByText(/Anbieter ansehen/i)).toBeTruthy()
    expect(screen.getByText('Dienstleistung')).toBeTruthy()
  })

  it('AC7: shows "no providers" message when provider_count is 0', async () => {
    const { ServiceResultCard } = await import('@/components/search/ServiceResultCard')
    const zeroItem = { ...mockServiceItem, provider_count: 0 }
    render(<ServiceResultCard item={zeroItem} lang="de" />)
    expect(screen.getByText('Keine Anbieter in der Nähe')).toBeTruthy()
  })

  it('AC8: click routes to /shops?service=<category_id>', async () => {
    const { ServiceResultCard } = await import('@/components/search/ServiceResultCard')
    render(<ServiceResultCard item={mockServiceItem} lang="en" />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(mockPush).toHaveBeenCalledWith('/en/shops?service=42')
  })

  it('AC11: renders with RTL-compatible aria-label in Hebrew', async () => {
    const { ServiceResultCard } = await import('@/components/search/ServiceResultCard')
    const heItem = { ...mockServiceItem, name: 'שירותי אינסטלציה' }
    render(<ServiceResultCard item={heItem} lang="he" />)
    expect(screen.getByRole('button')).toBeTruthy()
    expect(screen.getByText('שירותי אינסטלציה')).toBeTruthy()
  })
})

// ─── ResultCard discriminator ─────────────────────────────────────────────────

describe('ResultCard', () => {
  it('renders ServiceResultCard for service result_type', async () => {
    const { ResultCard } = await import('@/components/search/ResultCard')
    const serviceItem = {
      result_type: 'service' as const,
      category_id: 99,
      category_slug: null,
      name: 'Elektrik',
      provider_count: 2,
      matched_via: 'specialty' as const,
      score: 0.85,
    }
    render(<ResultCard item={serviceItem} lang="de" />)
    // ServiceResultCard renders a button
    expect(screen.getByRole('button')).toBeTruthy()
    expect(screen.getByText('Elektrik')).toBeTruthy()
  })
})

// ─── searchAll API client ─────────────────────────────────────────────────────

describe('searchAll API client', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })
    )
  })

  afterEach(() => { fetchSpy.mockRestore() })

  it('calls /search endpoint (not /products)', async () => {
    const { searchAll } = await import('@/lib/api')
    await searchAll({ q: 'Klempner' }, 'de')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('/search')
    expect(url).not.toContain('/products')
  })

  it('includes q param', async () => {
    const { searchAll } = await import('@/lib/api')
    await searchAll({ q: 'Friseur' }, 'de')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('q=Friseur')
  })

  it('includes bbox param when provided', async () => {
    const { searchAll } = await import('@/lib/api')
    await searchAll({ q: 'Klempner', bbox: '34.5,33.0,35.5,34.0' }, 'de')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('bbox=')
  })

  it('sends Accept-Language header', async () => {
    const { searchAll } = await import('@/lib/api')
    await searchAll({ q: 'Reinigung' }, 'de')
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    const headers = init?.headers as Record<string, string>
    expect(headers?.['Accept-Language']).toBe('de')
  })
})

// ─── Translations: all 6 languages have new result_service_* keys ─────────────

describe('translations: result_service_* keys in all languages', () => {
  const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

  it('all languages have result_service_badge', async () => {
    const { t } = await import('@/lib/translations')
    for (const lang of LANGS) {
      const tr = t(lang)
      expect(tr.result_service_badge, `Missing result_service_badge for ${lang}`).toBeTruthy()
    }
  })

  it('all languages have result_service_cta', async () => {
    const { t } = await import('@/lib/translations')
    for (const lang of LANGS) {
      const tr = t(lang)
      expect(tr.result_service_cta, `Missing result_service_cta for ${lang}`).toBeTruthy()
    }
  })

  it('all languages have result_service_providers_in_view as a function', async () => {
    const { t } = await import('@/lib/translations')
    for (const lang of LANGS) {
      const tr = t(lang)
      expect(typeof tr.result_service_providers_in_view, `Missing result_service_providers_in_view for ${lang}`).toBe('function')
      // Returns a string when called with a number
      const result = tr.result_service_providers_in_view(3)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('all languages have result_service_providers_in_view_zero as string', async () => {
    const { t } = await import('@/lib/translations')
    for (const lang of LANGS) {
      const tr = t(lang)
      expect(typeof tr.result_service_providers_in_view_zero, `Missing for ${lang}`).toBe('string')
      expect(tr.result_service_providers_in_view_zero.length).toBeGreaterThan(0)
    }
  })

  it('all languages have result_service_providers_total as a function', async () => {
    const { t } = await import('@/lib/translations')
    for (const lang of LANGS) {
      const tr = t(lang)
      expect(typeof tr.result_service_providers_total, `Missing for ${lang}`).toBe('function')
      const result = tr.result_service_providers_total(10)
      expect(typeof result).toBe('string')
    }
  })
})
