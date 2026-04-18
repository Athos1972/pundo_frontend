import { describe, it, expect } from 'vitest'
import { getLegalContentForBrand } from '@/lib/legal-content'
import { pundoConfig } from '@/config/brands/pundo'
import { ruskyConfig } from '@/config/brands/rusky'

describe('getLegalContentForBrand', () => {
  it('pundo brand → kein Substitution, Original-Inhalte', () => {
    const content = getLegalContentForBrand('imprint', 'de', pundoConfig)
    // Pundo-Inhalte bleiben unverändert
    const allText = content.sections.map((s) => s.body).join(' ')
    expect(allText).toContain('Pundo')
    expect(allText).toContain('pundo.cy')
  })

  it('rusky brand → "Pundo" wird durch brand.legal.appName ersetzt', () => {
    const content = getLegalContentForBrand('imprint', 'de', ruskyConfig)
    const allText = [
      content.title,
      ...content.sections.map((s) => `${s.heading ?? ''} ${s.body}`),
    ].join(' ')
    // "Pundo" darf nicht mehr vorkommen (als eigenständiges Wort)
    expect(allText).not.toMatch(/\bPundo\b/)
    expect(allText).toContain(ruskyConfig.legal.appName)
  })

  it('rusky brand → "pundo.cy" wird durch brand.legal.domain ersetzt', () => {
    const content = getLegalContentForBrand('imprint', 'de', ruskyConfig)
    const allText = content.sections.map((s) => s.body).join(' ')
    expect(allText).not.toContain('pundo.cy')
    expect(allText).toContain(ruskyConfig.legal.domain)
  })

  it('rusky brand → "info@pundo.cy" wird durch brand.legal.domain ersetzt', () => {
    const content = getLegalContentForBrand('imprint', 'de', ruskyConfig)
    const allText = content.sections.map((s) => s.body).join(' ')
    expect(allText).not.toContain('info@pundo.cy')
    expect(allText).toContain(`info@${ruskyConfig.legal.domain}`)
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
    // Finde eine Section mit heading die "Pundo" enthält
    const pundoContent = getLegalContentForBrand('imprint', 'de', pundoConfig)
    const pundoHeadingWithPundo = pundoContent.sections.find((s) =>
      s.heading?.includes('Pundo'),
    )
    if (!pundoHeadingWithPundo) return // kein solcher heading existiert → skip

    const ruskyContent = getLegalContentForBrand('imprint', 'de', ruskyConfig)
    const ruskyHeadings = ruskyContent.sections.map((s) => s.heading ?? '')
    expect(ruskyHeadings.some((h) => h.includes('Pundo'))).toBe(false)
  })
})
