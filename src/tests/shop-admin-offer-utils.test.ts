import { describe, it, expect } from 'vitest'
import { resolveLocalizedName } from '@/components/shop-admin/OfferItemHeader'

describe('resolveLocalizedName', () => {
  it('gibt Namen in Anmeldesprache zurück', () => {
    expect(resolveLocalizedName({ de: 'Tomate', en: 'Tomato' }, 'de')).toBe('Tomate')
  })
  it('fällt auf en zurück wenn lang fehlt', () => {
    expect(resolveLocalizedName({ en: 'Drill', el: 'Δράπανο' }, 'de')).toBe('Drill')
  })
  it('fällt auf de zurück wenn lang und en fehlen', () => {
    expect(resolveLocalizedName({ de: 'Bohrer', el: 'Δράπανο' }, 'ru')).toBe('Bohrer')
  })
  it('nimmt ersten verfügbaren wenn alle Fallbacks fehlen', () => {
    expect(resolveLocalizedName({ el: 'Δράπανο' }, 'de')).toBe('Δράπανο')
  })
  it('gibt null zurück bei leeren names', () => {
    expect(resolveLocalizedName({}, 'de')).toBeNull()
  })
  it('ar und he Sprachen funktionieren (RTL)', () => {
    expect(resolveLocalizedName({ ar: 'طماطم', en: 'Tomato' }, 'ar')).toBe('طماطم')
    expect(resolveLocalizedName({ he: 'עגבנייה', en: 'Tomato' }, 'he')).toBe('עגבנייה')
  })
})
