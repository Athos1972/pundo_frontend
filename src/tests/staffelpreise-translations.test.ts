import { describe, it, expect } from 'vitest'
import { shopTranslations } from '@/lib/i18n/shop'
import { t } from '@/lib/translations'

const LANGS = ['en', 'de', 'ru', 'el', 'ar', 'he'] as const
const TEXT_KEYS = ['tier_prices_label', 'tier_more_prices'] as const

describe('F5200 Staffelpreise — Übersetzungen', () => {
  it.each(LANGS)('%s hat alle tier_* Keys, nicht leer', (lang) => {
    const tr = shopTranslations[lang]
    for (const k of TEXT_KEYS) expect(tr[k].trim().length).toBeGreaterThan(0)
    expect(tr.tier_from(6)).toContain('6')
    expect(tr.tier_range(6, 11)).toBe('6–11')
    expect(tr.tier_show_all(5)).toContain('5')
  })

  it('de ist nicht der englische Fallback', () => {
    for (const k of TEXT_KEYS) expect(shopTranslations.de[k]).not.toBe(shopTranslations.en[k])
    expect(shopTranslations.de.tier_from(6)).toBe('ab 6')
  })

  it('Barrel t(lang) liefert die Keys; unbekannte Sprache fällt auf en', () => {
    expect(t('de').tier_show_all(5)).toBe('Alle Preise (5)')
    expect(t('ar').tier_from(3)).toBe('من 3')
    expect(t('he').tier_from(3)).toBe('החל מ-3')
    expect(t('xx').tier_from(3)).toBe('from 3')
  })
})
