/**
 * Tests for FeaturedGuideHero component and getFeaturedGuide logic.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Filesystem mock (must be before any module imports that use fs) ───────────

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

vi.mock('@/data/guide-image-manifest.json', () => ({
  default: {
    'expat-start-zypern/hero': {
      width: 2752,
      height: 1536,
      blurDataURL: 'data:image/avif;base64,ABC',
      formats: ['avif', 'webp'],
      widths: [480, 960, 1600],
      hash: 'sha256:abc',
      source: '_raw/expat-start-zypern.png',
    },
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('@/lib/routing', () => ({
  localePath: (lang: string, p: string) => `/${lang}${p}`,
}))

vi.mock('@/components/guides/GuideHeroImage', () => ({
  GuideHeroImage: ({ slug, alt }: { slug: string; alt: string }) => (
    <img src={`/images/guides/${slug}-hero-960.webp`} alt={alt} data-testid="hero-image" />
  ),
}))

// ── Component tests ───────────────────────────────────────────────────────────

import { FeaturedGuideHero } from '@/components/guides/FeaturedGuideHero'
import type { GuideMeta } from '@/lib/guides'

const baseGuide: GuideMeta = {
  slug: 'expat-start-zypern',
  title: 'Dein Zypern-Einstieg',
  description: 'Der Überblick für Expats auf Zypern.',
  category: 'start',
  icon: '🧭',
  readtime: '5',
  lang: 'de',
  published: true,
  featured: true,
  hero_alt: 'Panoramablick auf Zypern',
}

describe('FeaturedGuideHero', () => {
  it('renders badge, title, description and CTA', () => {
    render(
      <FeaturedGuideHero
        guide={baseGuide}
        lang="de"
        badgeLabel="Übersicht"
        ctaLabel="Hier starten →"
      />
    )
    expect(screen.getByText('Übersicht')).toBeTruthy()
    expect(screen.getByText('Dein Zypern-Einstieg')).toBeTruthy()
    expect(screen.getByText('Der Überblick für Expats auf Zypern.')).toBeTruthy()
    expect(screen.getByText('Hier starten →')).toBeTruthy()
  })

  it('renders a link to the correct localised guide URL', () => {
    render(
      <FeaturedGuideHero
        guide={baseGuide}
        lang="de"
        badgeLabel="Übersicht"
        ctaLabel="Hier starten →"
      />
    )
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/de/guides/expat-start-zypern')
  })

  it('renders the hero image with hero_alt text', () => {
    render(
      <FeaturedGuideHero
        guide={baseGuide}
        lang="de"
        badgeLabel="Übersicht"
        ctaLabel="Hier starten →"
      />
    )
    const img = screen.getByTestId('hero-image')
    expect(img.getAttribute('alt')).toBe('Panoramablick auf Zypern')
  })

  it('falls back to guide.title as alt when hero_alt is absent', () => {
    const guideNoAlt: GuideMeta = { ...baseGuide, hero_alt: undefined }
    render(
      <FeaturedGuideHero
        guide={guideNoAlt}
        lang="de"
        badgeLabel="Übersicht"
        ctaLabel="Hier starten →"
      />
    )
    const img = screen.getByTestId('hero-image')
    expect(img.getAttribute('alt')).toBe('Dein Zypern-Einstieg')
  })

  it('renders RTL CTA correctly for ar', () => {
    render(
      <FeaturedGuideHero
        guide={{ ...baseGuide, lang: 'ar' }}
        lang="ar"
        badgeLabel="نظرة عامة"
        ctaLabel="← ابدأ هنا"
      />
    )
    expect(screen.getByText('← ابدأ هنا')).toBeTruthy()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/ar/guides/expat-start-zypern')
  })

  it('renders RTL CTA correctly for he', () => {
    render(
      <FeaturedGuideHero
        guide={{ ...baseGuide, lang: 'he' }}
        lang="he"
        badgeLabel="סקירה כללית"
        ctaLabel="← התחל כאן"
      />
    )
    expect(screen.getByText('← התחל כאן')).toBeTruthy()
  })
})

// ── getFeaturedGuide logic tests ──────────────────────────────────────────────

import path from 'path'

const GUIDES_DIR = path.join(process.cwd(), 'content', 'guides')

function makeMdx(overrides: Record<string, unknown> = {}): string {
  const fm = {
    title: 'Test Guide',
    description: 'A test.',
    category: 'start',
    icon: '🧭',
    readtime: '5',
    lang: 'de',
    published: true,
    featured: true,
    hero_alt: 'Test alt',
    ...overrides,
  }
  const lines = Object.entries(fm).map(([k, v]) =>
    typeof v === 'string' ? `${k}: "${v}"` : `${k}: ${v}`
  )
  return `---\n${lines.join('\n')}\n---\n\nContent.`
}

describe('getFeaturedGuide', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns null when no guides directory exists', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValue(false)
    const { getFeaturedGuide } = await import('@/lib/guides')
    expect(getFeaturedGuide('de')).toBeNull()
  })

  it('returns null when no guide has featured: true', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockImplementation((p) => {
      const s = String(p)
      if (s === GUIDES_DIR) return true
      if (s === path.join(GUIDES_DIR, 'some-guide', 'de.mdx')) return true
      return false
    })
    vi.mocked(fs.default.readdirSync).mockReturnValue(['some-guide'] as unknown as ReturnType<typeof import('fs').readdirSync>)
    vi.mocked(fs.default.statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<typeof import('fs').statSync>)
    vi.mocked(fs.default.readFileSync).mockReturnValue(makeMdx({ featured: false }))

    const { getFeaturedGuide } = await import('@/lib/guides')
    expect(getFeaturedGuide('de')).toBeNull()
  })

  it('returns the featured guide meta for the exact language', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockImplementation((p) => {
      const s = String(p)
      if (s === GUIDES_DIR) return true
      if (s === path.join(GUIDES_DIR, 'expat-start-zypern', 'de.mdx')) return true
      return false
    })
    vi.mocked(fs.default.readdirSync).mockReturnValue(['expat-start-zypern'] as unknown as ReturnType<typeof import('fs').readdirSync>)
    vi.mocked(fs.default.statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<typeof import('fs').statSync>)
    vi.mocked(fs.default.readFileSync).mockReturnValue(makeMdx({ slug: 'expat-start-zypern' }))

    const { getFeaturedGuide } = await import('@/lib/guides')
    const result = getFeaturedGuide('de')
    expect(result).not.toBeNull()
    expect(result?.slug).toBe('expat-start-zypern')
    expect(result?.featured).toBe(true)
  })

  it('returns null for a language that has no MDX file (no fallback)', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockImplementation((p) => {
      const s = String(p)
      if (s === GUIDES_DIR) return true
      // Only de.mdx exists, not fr.mdx
      if (s === path.join(GUIDES_DIR, 'expat-start-zypern', 'de.mdx')) return true
      return false
    })
    vi.mocked(fs.default.readdirSync).mockReturnValue(['expat-start-zypern'] as unknown as ReturnType<typeof import('fs').readdirSync>)
    vi.mocked(fs.default.statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<typeof import('fs').statSync>)
    vi.mocked(fs.default.readFileSync).mockReturnValue(makeMdx({ slug: 'expat-start-zypern' }))

    const { getFeaturedGuide } = await import('@/lib/guides')
    // 'fr' has no MDX → hero must not appear (no fallback to de)
    expect(getFeaturedGuide('fr')).toBeNull()
  })

  it('returns first slug alphabetically when multiple guides are featured', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockImplementation((p) => {
      const s = String(p)
      if (s === GUIDES_DIR) return true
      if (s.endsWith('de.mdx')) return true
      return false
    })
    vi.mocked(fs.default.readdirSync).mockReturnValue(
      ['aaa-guide', 'zzz-guide'] as unknown as ReturnType<typeof import('fs').readdirSync>
    )
    vi.mocked(fs.default.statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<typeof import('fs').statSync>)
    vi.mocked(fs.default.readFileSync).mockImplementation((filePath) => {
      const s = String(filePath)
      const slug = s.includes('aaa-guide') ? 'aaa-guide' : 'zzz-guide'
      return makeMdx({ slug })
    })

    const { getFeaturedGuide } = await import('@/lib/guides')
    expect(getFeaturedGuide('de')?.slug).toBe('aaa-guide')
  })
})
