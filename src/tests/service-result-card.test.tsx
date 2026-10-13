/**
 * F2970 T12: ServiceResultCard shows an "are you a provider?" hint when a service
 * category has no providers (O2: cards without providers are shown, with an
 * onboarding CTA). The link is a sibling of the card button, never inside it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

import { ServiceResultCard } from '@/components/search/ServiceResultCard'
import { tSearch } from '@/lib/translations'

const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

function item(provider_count: number, name = 'Friseur & Barbier') {
  return {
    result_type: 'service' as const,
    category_id: 7,
    category_slug: null,
    name,
    provider_count,
    matched_via: 'synonym' as const,
    score: 0.9,
  }
}

describe('ServiceResultCard provider hint (F2970)', () => {
  beforeEach(() => mockPush.mockClear())

  it('shows the hint with an onboarding link when there are no providers', () => {
    render(<ServiceResultCard item={item(0)} lang="de" />)
    const hint = screen.getByTestId('service-provider-hint')
    expect(hint.textContent).toContain('Du bietest das an?')
    const link = screen.getByRole('link', { name: 'Kostenlos eintragen' })
    // bypass path: no language prefix, no localePath
    expect(link.getAttribute('href')).toBe('/shop-admin/onboarding')
  })

  it('does not show the hint when providers exist', () => {
    render(<ServiceResultCard item={item(375)} lang="de" />)
    expect(screen.queryByTestId('service-provider-hint')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('keeps the link outside of the card button (no interactive element in a button)', () => {
    render(<ServiceResultCard item={item(0)} lang="en" />)
    const link = screen.getByRole('link')
    expect(link.closest('button')).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('card click still routes to the localized provider list', () => {
    render(<ServiceResultCard item={item(0)} lang="en" />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockPush).toHaveBeenCalledWith('/en/shops?service=7')
  })

  it('the hint link does not trigger the card navigation', () => {
    render(<ServiceResultCard item={item(0)} lang="en" />)
    fireEvent.click(screen.getByRole('link'))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it.each(LANGS)('has non-empty hint texts in %s', (lang) => {
    const tr = tSearch(lang)
    expect(tr.result_service_provider_prompt.length).toBeGreaterThan(3)
    expect(tr.result_service_become_provider.length).toBeGreaterThan(3)
  })

  it('renders the Hebrew hint with RTL text alignment classes (he)', () => {
    render(
      <div dir="rtl">
        <ServiceResultCard item={item(0, 'מספרה וברבר')} lang="he" />
      </div>,
    )
    const hint = screen.getByTestId('service-provider-hint')
    expect(hint.closest('[dir="rtl"]')).not.toBeNull()
    expect(hint.className).toContain('rtl:text-end')
    expect(hint.textContent).toContain('הוסיפו את העסק שלכם בחינם')
    expect(screen.getByRole('link').getAttribute('href')).toBe('/shop-admin/onboarding')
  })

  it('renders the Arabic and Greek hint texts', () => {
    const { unmount } = render(<ServiceResultCard item={item(0)} lang="ar" />)
    expect(screen.getByTestId('service-provider-hint').textContent).toContain('سجّل نشاطك مجانًا')
    unmount()
    render(<ServiceResultCard item={item(0)} lang="el" />)
    expect(screen.getByTestId('service-provider-hint').textContent).toContain('Καταχωρίστε δωρεάν')
  })
})
