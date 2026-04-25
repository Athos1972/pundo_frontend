import { describe, it, expect } from 'vitest'
import { getBrandConfig, buildThemeCss } from '@/config/brands'
import { pundoConfig } from '@/config/brands/pundo'
import { naidivseConfig } from '@/config/brands/naidivse'

describe('getBrandConfig — Domain-Lookup', () => {
  it('pundo.cy → pundo brand', () => {
    expect(getBrandConfig('pundo.cy').slug).toBe('pundo')
  })

  it('www.pundo.cy → pundo brand (www stripped)', () => {
    expect(getBrandConfig('www.pundo.cy').slug).toBe('pundo')
  })

  it('unbekannte Domain → pundo Fallback', () => {
    expect(getBrandConfig('unknown-brand.com').slug).toBe('pundo')
  })

  it('leerer String → pundo Fallback', () => {
    expect(getBrandConfig('').slug).toBe('pundo')
  })

  it('Slug direkt: "pundo" → pundo brand', () => {
    expect(getBrandConfig('pundo').slug).toBe('pundo')
  })

  it('naidivse.com → naidivse brand', () => {
    expect(getBrandConfig('naidivse.com').slug).toBe('naidivse')
  })

  it('www.naidivse.com → naidivse brand (www stripped)', () => {
    expect(getBrandConfig('www.naidivse.com').slug).toBe('naidivse')
  })

  it('Slug direkt: "naidivse" → naidivse brand', () => {
    expect(getBrandConfig('naidivse').slug).toBe('naidivse')
  })
})

describe('BrandConfig — Vollständigkeit', () => {
  const brands = [pundoConfig, naidivseConfig]

  for (const brand of brands) {
    it(`${brand.slug}: alle Pflichtfelder vorhanden`, () => {
      expect(brand.slug).toBeTruthy()
      expect(brand.name).toBeTruthy()
      expect(brand.domains.length).toBeGreaterThan(0)
      expect(brand.assets.logoSvg).toMatch(/^\/brands\//)
      expect(brand.assets.splashSvg).toMatch(/^\/brands\//)
      expect(brand.theme.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(brand.theme.themeColor).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(brand.pwa.name).toBeTruthy()
      expect(brand.pwa.shortName).toBeTruthy()
      expect(brand.meta.siteUrl).toMatch(/^https:\/\//)
      expect(brand.legal.appName).toBeTruthy()
      expect(brand.legal.domain).toBeTruthy()
    })
  }
})

describe('buildThemeCss', () => {
  it('enthält alle CSS-Variablen', () => {
    const css = buildThemeCss(pundoConfig)
    expect(css).toContain('--color-accent:')
    expect(css).toContain('--color-accent-light:')
    expect(css).toContain('--color-bg:')
    expect(css).toContain('--color-surface:')
    expect(css).toContain('--brand-font-heading:')
    expect(css).toContain('--brand-font-body:')
  })

  it('enthält pundo-Primärfarbe für pundo brand', () => {
    const css = buildThemeCss(pundoConfig)
    expect(css).toContain('#D4622A')
  })

  it('kein XSS-Risiko: Farb-Werte enthalten nur #hex', () => {
    const css = buildThemeCss(pundoConfig)
    expect(css).not.toContain('<')
    expect(css).not.toContain('>')
  })
})

describe('Brand Feature Flags', () => {
  it('pundo hat socialFeed: false', () => {
    expect(pundoConfig.features.socialFeed).toBe(false)
  })

  it('naidivse hat socialFeed: false', () => {
    expect(naidivseConfig.features.socialFeed).toBe(false)
  })
})

describe('naidivse Brand-Config', () => {
  it('Akzentfarbe ist naidivse-Blau', () => {
    expect(naidivseConfig.theme.accent).toBe('#1F4FA3')
  })

  it('Domain naidivse.com ist registriert', () => {
    expect(naidivseConfig.domains).toContain('naidivse.com')
  })

  it('Logo-Pfad zeigt auf brands/naidivse/', () => {
    expect(naidivseConfig.assets.logoSvg).toMatch(/^\/brands\/naidivse\//)
  })

  it('buildThemeCss enthält naidivse-Blau', () => {
    const css = buildThemeCss(naidivseConfig)
    expect(css).toContain('#1F4FA3')
  })
})
