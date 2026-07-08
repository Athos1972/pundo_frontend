/**
 * B5900-007 — Smoke test: all 6 languages carry the new city-index UI strings
 * (title/description templates, H1, breadcrumb, empty state, entry link).
 * Full namespace-parity is already enforced by `pnpm lint:i18n`
 * (scripts/check-i18n-parity.ts) — this test additionally checks the template
 * functions actually interpolate city name + count correctly.
 */
import { describe, it, expect } from 'vitest'
import { LANGS } from '@/lib/lang'
import { t } from '@/lib/translations'

describe('shops city translations — all 6 languages', () => {
  for (const lang of LANGS) {
    it(`${lang}: shops_city_title interpolates city + count`, () => {
      const tr = t(lang)
      const result = tr.shops_city_title('Larnaca', 42)
      expect(result).toContain('Larnaca')
      expect(result).toContain('42')
    })

    it(`${lang}: shops_city_meta_description interpolates city + count`, () => {
      const tr = t(lang)
      const result = tr.shops_city_meta_description('Larnaca', 42)
      expect(result).toContain('Larnaca')
      expect(result).toContain('42')
      // Ahrefs guideline: description should be reasonably substantial (not a check
      // of the exact 150-160 char window, since city name/count length varies).
      expect(result.length).toBeGreaterThan(40)
    })

    it(`${lang}: shops_city_h1 interpolates city`, () => {
      const tr = t(lang)
      expect(tr.shops_city_h1('Nicosia')).toContain('Nicosia')
    })

    it(`${lang}: shops_city_empty is a non-empty string`, () => {
      const tr = t(lang)
      expect(typeof tr.shops_city_empty).toBe('string')
      expect(tr.shops_city_empty.length).toBeGreaterThan(0)
    })

    it(`${lang}: shops_cities_title/h1/empty are non-empty strings`, () => {
      const tr = t(lang)
      expect(tr.shops_cities_title.length).toBeGreaterThan(0)
      expect(tr.shops_cities_h1.length).toBeGreaterThan(0)
      expect(tr.shops_cities_empty.length).toBeGreaterThan(0)
    })

    it(`${lang}: shops_browse_by_city_link is a non-empty string`, () => {
      const tr = t(lang)
      expect(tr.shops_browse_by_city_link.length).toBeGreaterThan(0)
    })

    it(`${lang}: shops_city_shop_count formats a number`, () => {
      const tr = t(lang)
      expect(tr.shops_city_shop_count(1)).toContain('1')
      expect(tr.shops_city_shop_count(5)).toContain('5')
    })
  }
})
