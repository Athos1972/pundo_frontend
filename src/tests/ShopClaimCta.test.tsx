// F5970 AC 1/2: claim entry on the shop page (both variants, link target, nofollow, no h1, 6 languages)
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShopClaimCta } from '@/components/shop/ShopClaimCta'
import { shopTranslations } from '@/lib/i18n/shop'
import type { Lang } from '@/lib/lang'

const LANGS: Lang[] = ['en', 'de', 'el', 'ru', 'ar', 'he']

describe('ShopClaimCta — unclaimed shop', () => {
  it.each(LANGS)('shows the card and the button in %s, linking to the claim page without a language prefix', (lang) => {
    const tr = shopTranslations[lang]
    const { container } = render(<ShopClaimCta slug="cafe-omega" isClaimed={false} lang={lang} />)
    const button = screen.getByRole('link', { name: tr.shop_claim_cta_button })
    expect(button.getAttribute('href')).toBe('/shop-admin/claim?shop=cafe-omega') // bypass path: no /{lang}/ (i18n routing)
    expect(button.getAttribute('rel')).toBe('nofollow')
    expect(screen.getByText(tr.shop_claim_cta_title)).toBeTruthy()
    expect(container.querySelector('h1')).toBeNull() // the shop name stays the only h1
    expect(screen.queryByTestId('shop-claim-report')).toBeNull()
  })

  it('uses a plain anchor, not next/link (no prefetch across the root layout)', () => {
    const { container } = render(<ShopClaimCta slug="x" isClaimed={false} lang="en" />)
    const a = container.querySelector('a')!
    expect(a.getAttribute('data-prefetch')).toBeNull()
    expect(a.tagName).toBe('A')
  })

  it('encodes the slug (shop slugs may contain dots and other URL characters)', () => {
    render(<ShopClaimCta slug="pets for call.com.cy" isClaimed={false} lang="en" />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/shop-admin/claim?shop=pets%20for%20call.com.cy')
  })

  it('has no physical left/right alignment classes (logical properties only, RTL safe)', () => {
    const { container } = render(<ShopClaimCta slug="x" isClaimed={false} lang="ar" />)
    expect(container.innerHTML).not.toMatch(/\b(text-left|text-right|ml-|mr-|pl-|pr-)/)
  })
})

describe('ShopClaimCta — claimed shop', () => {
  it.each(LANGS)('shows only the quiet report link in %s and no claim button', (lang) => {
    const tr = shopTranslations[lang]
    const { container } = render(<ShopClaimCta slug="cafe-omega" isClaimed lang={lang} />)
    const link = screen.getByRole('link', { name: tr.shop_claim_report_link })
    expect(link.getAttribute('href')).toBe('/shop-admin/claim?shop=cafe-omega')
    expect(link.getAttribute('rel')).toBe('nofollow')
    expect(screen.queryByText(tr.shop_claim_cta_button)).toBeNull()
    expect(screen.queryByTestId('shop-claim-cta')).toBeNull()
    expect(container.querySelector('h1, h2')).toBeNull()
  })
})

describe('ShopClaimCta — strings', () => {
  it.each(LANGS)('%s has all four non-empty strings', (lang) => {
    const tr = shopTranslations[lang]
    for (const key of ['shop_claim_cta_title', 'shop_claim_cta_text', 'shop_claim_cta_button', 'shop_claim_report_link'] as const) {
      expect(tr[key].trim().length).toBeGreaterThan(5)
    }
  })

  it('falls back to English for an unknown language', () => {
    render(<ShopClaimCta slug="x" isClaimed={false} lang={'xx' as Lang} />)
    expect(screen.getByRole('link', { name: shopTranslations.en.shop_claim_cta_button })).toBeTruthy()
  })
})
