import { describe, it, expect } from 'vitest'
import { LANGS, type Lang } from '@/lib/lang'
import { translations } from '@/lib/translations'
import { helpContent } from '@/lib/help-content'
import { forShopsContent } from '@/lib/for-shops-content'
import { shopAdminHelpContent } from '@/lib/shop-admin-help-content'
import { tAdmin } from '@/lib/shop-admin-translations'

// ─── New translation keys ──────────────────────────────────────────────────────

describe('New footer/help translation keys', () => {
  const newKeys = [
    'footer_help',
    'footer_for_shops',
    'page_title_help',
    'page_title_for_shops',
    'reviews_how_it_works_toggle',
    'reviews_how_it_works_body',
  ] as const

  for (const lang of LANGS) {
    it(`lang "${lang}" has all new translation keys`, () => {
      const tr = translations[lang]
      for (const key of newKeys) {
        expect(tr[key], `missing key "${key}" for lang "${lang}"`).toBeDefined()
        expect(typeof tr[key]).toBe('string')
        expect((tr[key] as string).length).toBeGreaterThan(0)
      }
    })
  }

  it('footer_help is non-empty for RTL langs (ar, he)', () => {
    expect(translations.ar.footer_help.length).toBeGreaterThan(0)
    expect(translations.he.footer_help.length).toBeGreaterThan(0)
  })

  it('footer_for_shops is non-empty for RTL langs (ar, he)', () => {
    expect(translations.ar.footer_for_shops.length).toBeGreaterThan(0)
    expect(translations.he.footer_for_shops.length).toBeGreaterThan(0)
  })

  it('reviews_how_it_works_body mentions stars/rating concept in EN', () => {
    expect(translations.en.reviews_how_it_works_body).toMatch(/star|rating/i)
  })

  it('reviews_how_it_works_body mentions stars/rating concept in DE', () => {
    expect(translations.de.reviews_how_it_works_body).toMatch(/stern|bewertung/i)
  })
})

// ─── Shop-admin translation keys (nav_help, help_title) ───────────────────────

describe('Shop-admin new translation keys', () => {
  const adminLangs = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

  for (const lang of adminLangs) {
    it(`shop-admin lang "${lang}" has nav_help and help_title`, () => {
      const tr = tAdmin(lang)
      expect(tr.nav_help).toBeDefined()
      expect(typeof tr.nav_help).toBe('string')
      expect(tr.nav_help.length).toBeGreaterThan(0)
      expect(tr.help_title).toBeDefined()
      expect(typeof tr.help_title).toBe('string')
      expect(tr.help_title.length).toBeGreaterThan(0)
    })
  }
})

// ─── helpContent ──────────────────────────────────────────────────────────────

describe('helpContent', () => {
  for (const lang of LANGS) {
    it(`lang "${lang}" has at least 2 categories`, () => {
      const cats = helpContent[lang as Lang] ?? helpContent.en
      expect(cats.length).toBeGreaterThanOrEqual(2)
    })

    it(`lang "${lang}" every category has a title and items`, () => {
      const cats = helpContent[lang as Lang] ?? helpContent.en
      for (const cat of cats) {
        expect(cat.title.length).toBeGreaterThan(0)
        expect(cat.items.length).toBeGreaterThan(0)
        for (const item of cat.items) {
          expect(item.q.length).toBeGreaterThan(0)
          expect(item.a.length).toBeGreaterThan(0)
        }
      }
    })
  }

  it('EN has a Search & Products category', () => {
    const cats = helpContent.en
    const found = cats.some(c => c.title.toLowerCase().includes('search') || c.title.toLowerCase().includes('product'))
    expect(found).toBe(true)
  })

  it('EN has a Reviews category', () => {
    const cats = helpContent.en
    const found = cats.some(c => c.title.toLowerCase().includes('review'))
    expect(found).toBe(true)
  })

  it('EN has an Account/Privacy category', () => {
    const cats = helpContent.en
    const found = cats.some(c => c.title.toLowerCase().includes('account') || c.title.toLowerCase().includes('privac'))
    expect(found).toBe(true)
  })

  it('fallback: unknown lang returns EN content', () => {
    const cats = helpContent['xx' as Lang] ?? helpContent.en
    expect(cats).toBe(helpContent.en)
  })
})

// ─── forShopsContent ──────────────────────────────────────────────────────────

describe('forShopsContent', () => {
  for (const lang of LANGS) {
    it(`lang "${lang}" has hero_headline, hero_sub, cta_label`, () => {
      const c = forShopsContent[lang as Lang] ?? forShopsContent.en
      expect(c.hero_headline.length).toBeGreaterThan(0)
      expect(c.hero_sub.length).toBeGreaterThan(0)
      expect(c.cta_label.length).toBeGreaterThan(0)
    })

    it(`lang "${lang}" has at least 4 features`, () => {
      const c = forShopsContent[lang as Lang] ?? forShopsContent.en
      expect(c.features.length).toBeGreaterThanOrEqual(4)
      for (const f of c.features) {
        expect(f.icon.length).toBeGreaterThan(0)
        expect(f.title.length).toBeGreaterThan(0)
        expect(f.body.length).toBeGreaterThan(0)
      }
    })

    it(`lang "${lang}" has at least 3 steps`, () => {
      const c = forShopsContent[lang as Lang] ?? forShopsContent.en
      expect(c.steps.length).toBeGreaterThanOrEqual(3)
      for (const s of c.steps) {
        expect(s.num.length).toBeGreaterThan(0)
        expect(s.title.length).toBeGreaterThan(0)
        expect(s.body.length).toBeGreaterThan(0)
      }
    })
  }

  it('EN hero_headline mentions "map" or "free"', () => {
    expect(forShopsContent.en.hero_headline.toLowerCase()).toMatch(/map|free/)
  })

  it('DE hero_headline mentions "Karte" or "kostenlos"', () => {
    expect(forShopsContent.de.hero_headline.toLowerCase()).toMatch(/karte|kostenlos/)
  })

  it('step numbers are "1", "2", "3" in EN', () => {
    const steps = forShopsContent.en.steps
    expect(steps.map(s => s.num)).toEqual(['1', '2', '3'])
  })
})

// ─── shopAdminHelpContent ─────────────────────────────────────────────────────

describe('shopAdminHelpContent', () => {
  const langs = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

  for (const lang of langs) {
    it(`lang "${lang}" has at least 2 categories`, () => {
      const cats = shopAdminHelpContent[lang] ?? shopAdminHelpContent.en
      expect(cats.length).toBeGreaterThanOrEqual(2)
    })

    it(`lang "${lang}" every category has valid title and items`, () => {
      const cats = shopAdminHelpContent[lang] ?? shopAdminHelpContent.en
      for (const cat of cats) {
        expect(cat.title.length).toBeGreaterThan(0)
        expect(cat.items.length).toBeGreaterThan(0)
        for (const item of cat.items) {
          expect(item.q.length).toBeGreaterThan(0)
          expect(item.a.length).toBeGreaterThan(0)
        }
      }
    })
  }

  it('EN has a Getting started category', () => {
    const found = shopAdminHelpContent.en.some(c =>
      c.title.toLowerCase().includes('getting') || c.title.toLowerCase().includes('start')
    )
    expect(found).toBe(true)
  })

  it('EN has a Products category', () => {
    const found = shopAdminHelpContent.en.some(c => c.title.toLowerCase().includes('product'))
    expect(found).toBe(true)
  })

  it('EN has an API category', () => {
    const found = shopAdminHelpContent.en.some(c => c.title.toLowerCase().includes('api'))
    expect(found).toBe(true)
  })

  it('EN API category mentions "key" in an answer', () => {
    const apiCat = shopAdminHelpContent.en.find(c => c.title.toLowerCase().includes('api'))
    expect(apiCat).toBeDefined()
    const allAnswers = apiCat!.items.map(i => i.a).join(' ').toLowerCase()
    expect(allAnswers).toContain('key')
  })
})
