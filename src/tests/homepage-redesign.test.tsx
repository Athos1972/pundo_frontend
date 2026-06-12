// src/tests/homepage-redesign.test.tsx
// Unit tests for the 2026-06-04-homepage-redesign feature (T10)
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomepageStatsStrip } from '@/components/home/HomepageStatsStrip'
import { HomepageCategoryGrid } from '@/components/home/HomepageCategoryGrid'
import { ForBusinessesBand } from '@/components/home/ForBusinessesBand'
import { HomepageHeroVisual } from '@/components/home/HomepageHeroVisual'
import { homeTranslations } from '@/lib/i18n/home'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/en',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

// ─── HomepageStatsStrip ───────────────────────────────────────────────────────

describe('HomepageStatsStrip', () => {
  it('renders 4 stat numbers', () => {
    const { container } = render(<HomepageStatsStrip lang="en" />)
    // Each stat value is rendered as text — 340+, 12k, 30+, 6
    expect(container.textContent).toContain('340+')
    expect(container.textContent).toContain('12k')
    expect(container.textContent).toContain('30+')
    // stats_languages value
    expect(container.textContent).toContain('6')
  })

  it('renders 4 stat labels', () => {
    const { container } = render(<HomepageStatsStrip lang="en" />)
    expect(container.textContent).toContain('Businesses listed')
    expect(container.textContent).toContain('Searches / month')
    expect(container.textContent).toContain('Cities & towns')
    expect(container.textContent).toContain('Languages')
  })

  it('renders German labels for de lang', () => {
    const { container } = render(<HomepageStatsStrip lang="de" />)
    expect(container.textContent).toContain('Eingetragene Betriebe')
  })
})

// ─── HomepageCategoryGrid ─────────────────────────────────────────────────────

describe('HomepageCategoryGrid', () => {
  it('renders 6 category cards', () => {
    const { container } = render(<HomepageCategoryGrid lang="en" />)
    // Each card is an <a> inside the grid — 6 cards + 1 "All categories" link
    const links = container.querySelectorAll('a')
    // At least 6 cards; there's also the "All categories" link = 7 total
    expect(links.length).toBeGreaterThanOrEqual(6)
  })

  it('each category card links to search with correct query', () => {
    const { container } = render(<HomepageCategoryGrid lang="en" />)
    const links = Array.from(container.querySelectorAll('a[href*="/search"]'))
    // Should have links for Fashion, Electrician, Health, Groceries, Furniture, Services
    const hrefs = links.map(l => l.getAttribute('href') ?? '')
    expect(hrefs.some(h => h.includes('Fashion'))).toBe(true)
    expect(hrefs.some(h => h.includes('Electrician'))).toBe(true)
    expect(hrefs.some(h => h.includes('Groceries'))).toBe(true)
  })

  it('card links have /en/ lang prefix', () => {
    const { container } = render(<HomepageCategoryGrid lang="en" />)
    const searchLinks = Array.from(container.querySelectorAll('a[href*="/en/search"]'))
    expect(searchLinks.length).toBeGreaterThan(0)
  })
})

// ─── ForBusinessesBand ───────────────────────────────────────────────────────

describe('ForBusinessesBand', () => {
  it('renders CTA link pointing to /shop-admin/register', () => {
    const { container } = render(<ForBusinessesBand lang="en" />)
    const cta = container.querySelector('a[href="/shop-admin/register"]')
    expect(cta).not.toBeNull()
  })

  it('CTA text comes from for_biz_cta translation', () => {
    render(<ForBusinessesBand lang="en" />)
    expect(screen.getByText(/register free/i)).toBeInTheDocument()
  })

  it('renders business type chips', () => {
    const { container } = render(<ForBusinessesBand lang="en" />)
    expect(container.textContent).toContain('Retailers')
    expect(container.textContent).toContain('Tradespeople')
    expect(container.textContent).toContain('Service providers')
  })

  it('renders German CTA text for de lang', () => {
    render(<ForBusinessesBand lang="de" />)
    expect(screen.getByText(/kostenlos registrieren/i)).toBeInTheDocument()
  })
})

// ─── HomepageHeroVisual ───────────────────────────────────────────────────────

describe('HomepageHeroVisual', () => {
  it('has aria-hidden="true" on root', () => {
    const { container } = render(<HomepageHeroVisual />)
    const root = container.firstElementChild
    expect(root?.getAttribute('aria-hidden')).toBe('true')
  })

  it('contains an SVG element for the Cyprus map', () => {
    const { container } = render(<HomepageHeroVisual />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('contains city dot circles in SVG', () => {
    const { container } = render(<HomepageHeroVisual />)
    const circles = container.querySelectorAll('circle')
    // 4 city dots (Nicosia, Limassol, Paphos, Larnaca)
    expect(circles.length).toBeGreaterThanOrEqual(4)
  })

  it('contains floating shop cards', () => {
    const { container } = render(<HomepageHeroVisual />)
    // Each float card shows a shop name
    expect(container.textContent).toContain('Alkioni Bakery')
    expect(container.textContent).toContain('Petrou Electrics')
    expect(container.textContent).toContain('SunSet Pharmacy')
  })
})

// ─── Translation completeness ────────────────────────────────────────────────

describe('homeTranslations — all 6 languages complete', () => {
  const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

  const REQUIRED_KEYS: (keyof typeof homeTranslations.en)[] = [
    'homepage_eyebrow',
    'homepage_headline_accent',
    'homepage_sub',
    'stats_businesses',
    'stats_searches',
    'stats_cities',
    'stats_languages',
    'stats_businesses_label',
    'stats_searches_label',
    'stats_cities_label',
    'stats_languages_label',
    'category_grid_eyebrow',
    'category_grid_title',
    'cat_fashion',
    'cat_tradespeople',
    'cat_health',
    'cat_food',
    'cat_home',
    'cat_services',
    'for_biz_eyebrow',
    'for_biz_title',
    'for_biz_sub',
    'for_biz_cta',
    'for_biz_chip_retailers',
    'for_biz_chip_trades',
    'for_biz_chip_services',
  ]

  for (const lang of LANGS) {
    it(`all required keys present and non-empty in "${lang}"`, () => {
      const block = homeTranslations[lang]
      for (const key of REQUIRED_KEYS) {
        const value = block[key as keyof typeof block]
        expect(value, `Key "${key}" missing or empty in lang "${lang}"`).toBeTruthy()
        expect(typeof value).toBe('string')
        expect((value as string).length, `Key "${key}" is empty string in lang "${lang}"`).toBeGreaterThan(0)
      }
    })
  }
})
