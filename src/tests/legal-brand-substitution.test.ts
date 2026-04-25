import { describe, it, expect } from 'vitest'
import { getLegalContentForBrand } from '@/lib/legal-content'
import { pundoConfig } from '@/config/brands/pundo'
import { naidivseConfig } from '@/config/brands/naidivse'

describe('getLegalContentForBrand', () => {
  it('pundo brand → kein Substitution, Original-Inhalte', () => {
    const content = getLegalContentForBrand('imprint', 'de', pundoConfig)
    const allText = content.sections.map((s) => s.body).join(' ')
    expect(allText).toContain('Pundo')
    expect(allText).toContain('pundo.cy')
  })

  it('naidivse brand → "Pundo" wird durch brand.legal.appName ersetzt', () => {
    const content = getLegalContentForBrand('imprint', 'de', naidivseConfig)
    const allText = [
      content.title,
      ...content.sections.map((s) => `${s.heading ?? ''} ${s.body}`),
    ].join(' ')
    expect(allText).not.toMatch(/\bPundo\b/)
    expect(allText).toContain(naidivseConfig.legal.appName)
  })

  it('naidivse brand → "pundo.cy" wird durch brand.legal.domain ersetzt', () => {
    const content = getLegalContentForBrand('imprint', 'de', naidivseConfig)
    const allText = content.sections.map((s) => s.body).join(' ')
    expect(allText).not.toContain('pundo.cy')
    expect(allText).toContain(naidivseConfig.legal.domain)
  })

  it('naidivse brand → "info@pundo.cy" wird durch brand.legal.domain ersetzt', () => {
    const content = getLegalContentForBrand('imprint', 'de', naidivseConfig)
    const allText = content.sections.map((s) => s.body).join(' ')
    expect(allText).not.toContain('info@pundo.cy')
    expect(allText).toContain(`info@${naidivseConfig.legal.domain}`)
  })

  it('funktioniert für alle Legal-Pages und Sprachen', () => {
    const pages = ['imprint', 'privacy', 'terms', 'about', 'contact'] as const
    const langs = ['en', 'de', 'ru', 'el', 'ar', 'he'] as const

    for (const page of pages) {
      for (const lang of langs) {
        const content = getLegalContentForBrand(page, lang, pundoConfig)
        expect(content.title).toBeTruthy()
        expect(content.sections.length).toBeGreaterThan(0)
      }
    }
  })

  it('section headings werden ebenfalls substituiert', () => {
    const pundoContent = getLegalContentForBrand('imprint', 'de', pundoConfig)
    const pundoHeadingWithPundo = pundoContent.sections.find((s) =>
      s.heading?.includes('Pundo'),
    )
    if (!pundoHeadingWithPundo) return

    const naidivseContent = getLegalContentForBrand('imprint', 'de', naidivseConfig)
    const naidivseHeadings = naidivseContent.sections.map((s) => s.heading ?? '')
    expect(naidivseHeadings.some((h) => h.includes('Pundo'))).toBe(false)
  })
})
