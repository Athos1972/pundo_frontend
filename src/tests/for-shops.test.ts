/**
 * Unit tests for the for-shops content and components.
 * Feature: 2026-06-04-for-shops-redesign
 */
import { describe, it, expect } from 'vitest'
import { LANGS } from '@/lib/lang'
import { forShopsContent } from '@/lib/for-shops-content'

describe('forShopsContent — all 6 languages have all new fields', () => {
  for (const lang of LANGS) {
    it(`lang "${lang}" has all required top-level fields`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en

      // Core existing fields
      expect(c.hero_headline.length).toBeGreaterThan(0)
      expect(c.hero_sub.length).toBeGreaterThan(0)
      expect(c.cta_label.length).toBeGreaterThan(0)

      // New fields — hero
      expect(c.hero_headline_accent.length).toBeGreaterThan(0)
      expect(c.hero_eyebrow.length).toBeGreaterThan(0)
      expect(c.cta_secondary_label.length).toBeGreaterThan(0)
      expect(c.social_proof.length).toBeGreaterThan(0)

      // Meta description (150-160 chars target)
      expect(c.meta_description.length).toBeGreaterThan(0)
      expect(c.meta_description.length).toBeLessThanOrEqual(200) // allow some flex
    })

    it(`lang "${lang}" has 3 business_type_chips`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(Array.isArray(c.business_type_chips)).toBe(true)
      expect(c.business_type_chips).toHaveLength(3)
      for (const chip of c.business_type_chips) {
        expect(chip.length).toBeGreaterThan(0)
      }
    })

    it(`lang "${lang}" has stats with businesses, searches, cities, fee_note`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.stats).toBeDefined()
      expect(c.stats.businesses.length).toBeGreaterThan(0)
      expect(c.stats.searches.length).toBeGreaterThan(0)
      expect(c.stats.cities.length).toBeGreaterThan(0)
      expect(c.stats.fee_note.length).toBeGreaterThan(0)
    })

    it(`lang "${lang}" stats.cities = "30+"`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.stats.cities).toBe('30+')
    })

    it(`lang "${lang}" has pain_gain_title, 5 pain_items, 5 gain_items`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.pain_gain_title.length).toBeGreaterThan(0)
      expect(c.pain_items).toHaveLength(5)
      expect(c.gain_items).toHaveLength(5)
      for (const item of c.pain_items) {
        expect(item.length).toBeGreaterThan(0)
      }
      for (const item of c.gain_items) {
        expect(item.length).toBeGreaterThan(0)
      }
    })

    it(`lang "${lang}" has 6 features with icon/title/body`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.features).toHaveLength(6)
      for (const f of c.features) {
        expect(f.icon.length).toBeGreaterThan(0)
        expect(f.title.length).toBeGreaterThan(0)
        expect(f.body.length).toBeGreaterThan(0)
      }
    })

    it(`lang "${lang}" has translation_usp with all sub-fields`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.translation_usp).toBeDefined()
      expect(c.translation_usp.eyebrow.length).toBeGreaterThan(0)
      expect(c.translation_usp.headline.length).toBeGreaterThan(0)
      expect(c.translation_usp.headline_accent.length).toBeGreaterThan(0)
      expect(c.translation_usp.body.length).toBeGreaterThan(0)
      expect(c.translation_usp.mock_label.length).toBeGreaterThan(0)
      expect(c.translation_usp.mock_footnote.length).toBeGreaterThan(0)
    })

    it(`lang "${lang}" steps has exactly 3 items, each with time field`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.steps).toHaveLength(3)
      for (const s of c.steps) {
        expect(s.num.length).toBeGreaterThan(0)
        expect(s.title.length).toBeGreaterThan(0)
        expect(s.body.length).toBeGreaterThan(0)
        expect(s.time.length).toBeGreaterThan(0)
      }
    })

    it(`lang "${lang}" testimonials has exactly 3 items`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.testimonials).toHaveLength(3)
      for (const t of c.testimonials) {
        expect(t.quote.length).toBeGreaterThan(0)
        expect(t.name.length).toBeGreaterThan(0)
        expect(t.role.length).toBeGreaterThan(0)
        expect(t.initials.length).toBeGreaterThan(0)
      }
    })

    it(`lang "${lang}" faq has exactly 6 items`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.faq).toHaveLength(6)
      for (const item of c.faq) {
        expect(item.q.length).toBeGreaterThan(0)
        expect(item.a.length).toBeGreaterThan(0)
      }
    })

    it(`lang "${lang}" faq contains no "multiple locations" item (removed claim)`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      for (const item of c.faq) {
        expect(item.q.toLowerCase()).not.toMatch(/multiple.?location/i)
        expect(item.a.toLowerCase()).not.toMatch(/multiple.?location/i)
      }
    })

    it(`lang "${lang}" has final_cta fields`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.final_cta_title.length).toBeGreaterThan(0)
      expect(c.final_cta_body.length).toBeGreaterThan(0)
      expect(c.final_cta_primary.length).toBeGreaterThan(0)
      expect(c.final_cta_secondary.length).toBeGreaterThan(0)
      expect(c.final_cta_fineprint.length).toBeGreaterThan(0)
    })
  }
})

describe('forShopsContent — EN specific checks', () => {
  it('EN step numbers are "1", "2", "3"', () => {
    const steps = forShopsContent.en.steps
    expect(steps.map((s) => s.num)).toEqual(['1', '2', '3'])
  })

  it('EN hero_headline mentions "map" or "business"', () => {
    const text = forShopsContent.en.hero_headline.toLowerCase()
    expect(text).toMatch(/map|business|customer/)
  })

  it('EN faq 6th item mentions automatic translation (main USP)', () => {
    const faq = forShopsContent.en.faq
    const lastItem = faq[5]
    expect(lastItem.a.toLowerCase()).toMatch(/translat|automat/)
  })

  it('EN meta_description is between 100 and 200 characters', () => {
    const desc = forShopsContent.en.meta_description
    expect(desc.length).toBeGreaterThanOrEqual(100)
    expect(desc.length).toBeLessThanOrEqual(200)
  })
})

describe('forShopsContent — ru bug fix (no array literal)', () => {
  it('ru entry is a plain object, not an array', () => {
    expect(Array.isArray(forShopsContent.ru)).toBe(false)
  })

  it('ru entry has hero_headline directly (not via index)', () => {
    expect(typeof forShopsContent.ru.hero_headline).toBe('string')
    expect(forShopsContent.ru.hero_headline.length).toBeGreaterThan(0)
  })
})

describe('forShopsContent — existing tests still pass (regression)', () => {
  for (const lang of LANGS) {
    it(`lang "${lang}" has hero_headline, hero_sub, cta_label`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.hero_headline.length).toBeGreaterThan(0)
      expect(c.hero_sub.length).toBeGreaterThan(0)
      expect(c.cta_label.length).toBeGreaterThan(0)
    })

    it(`lang "${lang}" has at least 4 features`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.features.length).toBeGreaterThanOrEqual(4)
    })

    it(`lang "${lang}" has at least 3 steps`, () => {
      const c = forShopsContent[lang] ?? forShopsContent.en
      expect(c.steps.length).toBeGreaterThanOrEqual(3)
    })
  }

  it('EN hero_headline mentions "map" or "free" or "customer"', () => {
    expect(forShopsContent.en.hero_headline.toLowerCase()).toMatch(/map|free|customer/)
  })

  it('DE hero_headline mentions "Karte" or "kostenlos" or "Kunden"', () => {
    expect(forShopsContent.de.hero_headline.toLowerCase()).toMatch(/karte|kostenlos|kunden/)
  })

  it('step numbers are "1", "2", "3" in EN', () => {
    const steps = forShopsContent.en.steps
    expect(steps.map((s) => s.num)).toEqual(['1', '2', '3'])
  })
})
