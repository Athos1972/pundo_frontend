import { describe, it, expect } from 'vitest'
import { translations } from '@/lib/translations'
import { legalContent, type LegalPage } from '@/lib/legal-content'
import { LANGS, type Lang } from '@/lib/lang'

// Translation key coverage
describe('Footer translation keys', () => {
  const requiredKeys = [
    'footer_imprint',
    'footer_privacy',
    'footer_terms',
    'footer_about',
    'footer_contact',
    'footer_help',
    'footer_for_shops',
    'page_title_imprint',
    'page_title_privacy',
    'page_title_terms',
    'page_title_about',
    'page_title_contact',
    'page_title_help',
    'page_title_for_shops',
  ] as const

  for (const lang of LANGS) {
    it(`has all footer keys for lang "${lang}"`, () => {
      const tr = translations[lang]
      for (const key of requiredKeys) {
        expect(tr[key], `missing key "${key}" for lang "${lang}"`).toBeDefined()
        expect(typeof tr[key]).toBe('string')
        expect((tr[key] as string).length).toBeGreaterThan(0)
      }
    })
  }

  it('footer_copyright returns a string with the year for all langs', () => {
    for (const lang of LANGS) {
      const result = translations[lang].footer_copyright(2026)
      expect(typeof result).toBe('string')
      expect(result).toContain('2026')
      expect(result).toContain('Buhl Consulting')
    }
  })
})

// Legal content coverage
describe('legalContent', () => {
  const pages: LegalPage[] = ['imprint', 'privacy', 'terms', 'about', 'contact']

  for (const page of pages) {
    describe(`page: ${page}`, () => {
      for (const lang of LANGS) {
        it(`has content for lang "${lang}"`, () => {
          const content = legalContent[page][lang as Lang]
          expect(content).toBeDefined()
          expect(content.title.length).toBeGreaterThan(0)
          expect(content.sections.length).toBeGreaterThan(0)
          for (const section of content.sections) {
            expect(section.body.length).toBeGreaterThan(0)
          }
        })
      }
    })
  }

  it('privacy page mentions Plausible in EN', () => {
    const content = legalContent.privacy.en
    const allText = content.sections.map(s => s.body).join(' ')
    expect(allText).toContain('Plausible')
  })

  it('privacy page mentions Plausible in DE', () => {
    const content = legalContent.privacy.de
    const allText = content.sections.map(s => s.body).join(' ')
    expect(allText).toContain('Plausible')
  })

  it('imprint page has a Contact section in EN', () => {
    const content = legalContent.imprint.en
    const hasContact = content.sections.some(
      s => s.heading?.toLowerCase().includes('contact')
    )
    expect(hasContact).toBe(true)
  })
})

// RTL translation sanity — RTL languages have non-empty footer keys
describe('RTL languages (ar, he) have footer translations', () => {
  const rtlLangs: Lang[] = ['ar', 'he']
  for (const lang of rtlLangs) {
    it(`${lang} footer_imprint is non-empty`, () => {
      expect(translations[lang].footer_imprint.length).toBeGreaterThan(0)
    })
    it(`${lang} footer_privacy is non-empty`, () => {
      expect(translations[lang].footer_privacy.length).toBeGreaterThan(0)
    })
  }
})
