import { describe, it, expect } from 'vitest'
import { LANGS } from '@/lib/lang'
import { translations } from '@/lib/translations'

// ─── N7400 Blog Soro-Embed — translation tests ─────────────────────────────

describe('footer_blog translation key (N7400)', () => {
  it('exists in all languages', () => {
    for (const lang of LANGS) {
      const tr = translations[lang]
      expect(tr.footer_blog, `missing footer_blog for lang "${lang}"`).toBeDefined()
      expect(typeof tr.footer_blog).toBe('string')
      expect((tr.footer_blog as string).length).toBeGreaterThan(0)
    }
  })

  it('EN value is "Blog"', () => {
    expect(translations.en.footer_blog).toBe('Blog')
  })

  it('DE value is "Blog"', () => {
    expect(translations.de.footer_blog).toBe('Blog')
  })

  it('RTL langs (ar, he) have non-empty values', () => {
    expect(translations.ar.footer_blog.length).toBeGreaterThan(0)
    expect(translations.he.footer_blog.length).toBeGreaterThan(0)
  })

  it('RU value is non-empty and non-Latin (Cyrillic)', () => {
    const ru = translations.ru.footer_blog
    expect(ru.length).toBeGreaterThan(0)
    expect(ru).toMatch(/[а-яёА-ЯЁ]/)
  })
})
