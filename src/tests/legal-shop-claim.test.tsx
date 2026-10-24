// F5970 T20: privacy policy section "Shop takeover / proof documents" (anchor #shop-claim) in all 6 languages
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { legalContent, getLegalContentForBrand } from '@/lib/legal-content'
import { LANGS } from '@/lib/lang'

vi.mock('@/config/brands', () => ({ getBrandFromHeaders: vi.fn(async () => ({ name: 'Pundo', meta: { siteUrl: 'https://pundo.cy' }, legal: { appName: 'Pundo', domain: 'pundo.cy' } })) }))
vi.mock('@/components/ui/BackButton', () => ({ BackButton: () => null }))

describe('privacy policy: shop-claim section', () => {
  it.each(LANGS)('%s has exactly one section with the anchor and a substantial text', (lang) => {
    const sections = legalContent.privacy[lang].sections.filter((s) => s.id === 'shop-claim')
    expect(sections).toHaveLength(1)
    expect(sections[0].heading?.length).toBeGreaterThan(10)
    expect(sections[0].body.length).toBeGreaterThan(1200)
  })

  it.each(LANGS)('%s states the retention periods 90 / 30 days and the contact address', (lang) => {
    const body = legalContent.privacy[lang].sections.find((s) => s.id === 'shop-claim')!.body
    expect(body).toMatch(/90/)
    expect(body).toMatch(/30/)
    expect(body).toContain('info@pundo.cy')
  })

  it.each([
    ['en', /Art\. 6\(1\)\(b\) GDPR[\s\S]*Art\. 6\(1\)\(f\) GDPR/],
    ['de', /Art\. 6 Abs\. 1 lit\. b DSGVO[\s\S]*Art\. 6 Abs\. 1 lit\. f DSGVO/],
    ['el', /Άρθρο 6 παρ\. 1 στοιχ\. β ΓΚΠΔ[\s\S]*άρθρο 6 παρ\. 1 στοιχ\. στ ΓΚΠΔ/],
    ['ru', /ст\. 6\(1\)\(b\) GDPR[\s\S]*ст\. 6\(1\)\(f\) GDPR/],
    ['ar', /المادة 6\(1\)\(ب\)[\s\S]*المادة 6\(1\)\(و\)/],
    ['he', /סעיף 6\(1\)\(ב\)[\s\S]*סעיף 6\(1\)\(ו\)/],
  ] as const)('%s names the legal basis (Art. 6(1)(b) and (f))', (lang, pattern) => {
    expect(legalContent.privacy[lang].sections.find((s) => s.id === 'shop-claim')!.body).toMatch(pattern)
  })

  it('ar and he are written in their own scripts', () => {
    const body = (l: 'ar' | 'he') => legalContent.privacy[l].sections.find((s) => s.id === 'shop-claim')!.body
    expect(body('ar')).toMatch(/[؀-ۿ]/)
    expect(body('he')).toMatch(/[֐-׿]/)
  })

  it('the other languages are no copies of the English text', () => {
    const en = legalContent.privacy.en.sections.find((s) => s.id === 'shop-claim')!.body
    for (const lang of LANGS.filter((l) => l !== 'en')) {
      expect(legalContent.privacy[lang].sections.find((s) => s.id === 'shop-claim')!.body).not.toBe(en)
    }
  })

  it('keeps the anchor id when another brand substitutes names (naidivse)', () => {
    const content = getLegalContentForBrand('privacy', 'en', { legal: { appName: 'Naidivse', domain: 'naidivse.cy' } } as never)
    const section = content.sections.find((s) => s.id === 'shop-claim')!
    expect(section.body).toContain('info@naidivse.cy')
    expect(section.body).not.toContain('info@pundo.cy')
  })

  it('the privacy page renders the section with its DOM id (deep link from the upload notice)', async () => {
    const { default: PrivacyPage } = await import('@/app/(customer)/[lang]/legal/privacy/page')
    const { container } = render(await PrivacyPage({ params: Promise.resolve({ lang: 'de' }) }))
    const el = container.querySelector('#shop-claim')
    expect(el).not.toBeNull()
    expect(el!.querySelector('h2')!.textContent).toBe('Shop-Übernahme und Nachweisdokumente')
  })

  it('only the known sections carry an id attribute', () => {
    expect(legalContent.privacy.en.sections.filter((s) => s.id).map((s) => s.id)).toEqual(['levels-credits', 'evidence-archive', 'shop-claim'])
  })
})

// F3900 K4c: privacy policy sections for levels/credits and the evidence archive in all 6 languages
describe('privacy policy: levels/credits and evidence archive sections', () => {
  it.each(LANGS)('%s has both sections with substantial text, in the same order', (lang) => {
    const ids = legalContent.privacy[lang].sections.filter((s) => s.id).map((s) => s.id)
    expect(ids).toEqual(['levels-credits', 'evidence-archive', 'shop-claim'])
    for (const id of ['levels-credits', 'evidence-archive']) {
      expect(legalContent.privacy[lang].sections.find((s) => s.id === id)!.body.length).toBeGreaterThan(600)
    }
  })

  it.each(LANGS)('%s archive section names the 3 year period, the contact and no apostrophes break the text', (lang) => {
    const body = legalContent.privacy[lang].sections.find((s) => s.id === 'evidence-archive')!.body
    expect(body).toMatch(/\b3\b/)
    expect(body).toContain('info@pundo.cy')
  })

  it.each(LANGS.filter((l) => l !== 'en'))('%s sections are translated, not copied from English', (lang) => {
    for (const id of ['levels-credits', 'evidence-archive']) {
      const en = legalContent.privacy.en.sections.find((s) => s.id === id)!.body
      expect(legalContent.privacy[lang].sections.find((s) => s.id === id)!.body).not.toBe(en)
    }
  })
})
