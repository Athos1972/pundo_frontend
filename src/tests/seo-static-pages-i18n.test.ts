import { describe, it, expect } from 'vitest'
import { seoTranslations } from '@/lib/i18n/seo'
import { LANGS } from '@/lib/lang'

const BRAND_SUFFIX = ' | Pundo'.length

describe('static page SEO strings', () => {
  for (const lang of LANGS) {
    const entries = Object.entries(seoTranslations[lang as keyof typeof seoTranslations]) as [string, string][]
    it(`${lang}: titles 50-60 chars incl. brand, descriptions 150-160 chars`, () => {
      expect(entries.length).toBeGreaterThan(0)
      for (const [key, value] of entries) {
        const n = Array.from(value).length
        if (key.endsWith('_title')) {
          expect(n + BRAND_SUFFIX, key).toBeGreaterThanOrEqual(50)
          expect(n + BRAND_SUFFIX, key).toBeLessThanOrEqual(60)
        } else {
          expect(n, key).toBeGreaterThanOrEqual(150)
          expect(n, key).toBeLessThanOrEqual(160)
        }
      }
    })
  }
  it('all languages define the same keys', () => {
    const base = Object.keys(seoTranslations.en).sort()
    for (const lang of LANGS) {
      expect(Object.keys(seoTranslations[lang as keyof typeof seoTranslations]).sort()).toEqual(base)
    }
  })
})
