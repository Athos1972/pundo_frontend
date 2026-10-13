import { describe, it, expect } from 'vitest'
import {
  buildOfferPriceView,
  formatTierRow,
  formatTierRowText,
  unitSuffix,
  buildPriceSpecifications,
  UNIT_CEFACT_CODES,
} from '@/lib/price-tiers'
import { t } from '@/lib/translations'
import type { PublicPriceTier } from '@/types/api'

const de = t('de')
const piece = (steps: Array<[number, number | null, string]>, label: string | null = 'Stück', unit = 'per_piece'): PublicPriceTier => ({
  unit,
  unit_label: label,
  steps: steps.map(([min, max, price]) => ({ min_quantity: min, max_quantity: max, price, currency: 'EUR' })),
})
const ANNA = piece([[1, 5, '4.5000'], [6, null, '4.0000']])

describe('unitSuffix', () => {
  it('null bei fixed, fehlendem oder leerem Label', () => {
    expect(unitSuffix({ unit: 'fixed', unit_label: 'Pauschal' })).toBeNull()
    expect(unitSuffix({ unit: 'per_piece', unit_label: null })).toBeNull()
    expect(unitSuffix({ unit: 'piece', unit_label: '  ' })).toBeNull()
    expect(unitSuffix({ unit: 'custom', unit_label: 'Laib' })).toBe('Laib')
  })
})

describe('buildOfferPriceView', () => {
  it('AK1: Hauptpreis + eine Zusatzzeile "ab 6"', () => {
    const v = buildOfferPriceView({ priceType: 'fixed', isPromo: false, priceTiers: [ANNA] })
    expect(v.main?.amount).toBe('4.50 EUR')
    expect(v.main?.unitSuffix).toBe('Stück')
    expect(v.mainShowMinQty).toBe(false)
    expect(v.extraRows).toHaveLength(1)
    expect(formatTierRowText(v.extraRows[0], de)).toBe('ab 6: 4.00 EUR / Stück')
  })

  it('AK2: Promo ersetzt Standard-Staffel, Durchstreichen same-unit', () => {
    const v = buildOfferPriceView({
      priceType: 'fixed', isPromo: true, priceTiers: [ANNA], promoPriceTiers: [piece([[1, null, '3.90']])],
    })
    expect(v.main?.amount).toBe('3.90 EUR')
    expect(v.extraRows).toEqual([])
    expect(v.compareStrike).toBe('same-unit')
    expect(v.compareAmount).toBe('4.50 EUR')
  })

  it('AK5: Promo-Staffel erzeugt Zeile ab 6', () => {
    const v = buildOfferPriceView({
      priceType: 'fixed', isPromo: true, priceTiers: [ANNA],
      promoPriceTiers: [piece([[1, null, '3.90'], [6, null, '3.50']])],
    })
    expect(v.extraRows.map((r) => formatTierRowText(r, de))).toEqual(['ab 6: 3.50 EUR / Stück'])
  })

  it('AK6: mehrere Einheiten, Reihenfolge des Owners', () => {
    const v = buildOfferPriceView({
      priceType: 'fixed', isPromo: false,
      priceTiers: [
        piece([[1, null, '45.00']], 'Stunde', 'per_hour'),
        piece([[1, null, '30.00'], [50, null, '26.00']], 'm²', 'per_m2'),
      ],
    })
    expect(formatTierRowText(v.main!, de, { main: true })).toBe('45.00 EUR / Stunde')
    expect(v.extraRows.map((r) => formatTierRowText(r, de))).toEqual(['30.00 EUR / m²', 'ab 50: 26.00 EUR / m²'])
  })

  it('AK11: Mindestmenge', () => {
    const v = buildOfferPriceView({ priceType: 'fixed', isPromo: false, priceTiers: [piece([[3, null, '4.50']])] })
    expect(v.mainShowMinQty).toBe(true)
    expect(formatTierRowText(v.main!, de, { main: true })).toBe('ab 3 · 4.50 EUR / Stück')
  })

  it('Range nur bei expliziter Obergrenze in Zusatzzeile (FA2)', () => {
    const v = buildOfferPriceView({
      priceType: 'fixed', isPromo: false, priceTiers: [piece([[1, null, '5'], [6, 11, '4'], [12, 12, '3']])],
    })
    expect(v.extraRows.map((r) => formatTierRowText(r, de))).toEqual(['6–11: 4.00 EUR / Stück', 'ab 12: 3.00 EUR / Stück'])
  })

  it('AK9/AK10: Legacy ohne Label und fixed ohne Suffix; ohne Tiers hasTiers=false', () => {
    const legacy = buildOfferPriceView({ priceType: 'fixed', isPromo: false, priceTiers: [piece([[1, null, '9.99']], null, 'piece')] })
    expect(legacy.hasTiers).toBe(true)
    expect(legacy.main?.unitSuffix).toBeNull()
    expect(legacy.extraRows).toEqual([])
    const fixed = buildOfferPriceView({ priceType: 'fixed', isPromo: false, priceTiers: [piece([[1, null, '100']], 'Pauschal', 'fixed')] })
    expect(fixed.main?.unitSuffix).toBeNull()
    const custom = buildOfferPriceView({ priceType: 'fixed', isPromo: false, priceTiers: [piece([[1, null, '7']], 'Laib', 'custom')] })
    expect(custom.main?.unitSuffix).toBe('Laib')
    expect(buildOfferPriceView({ priceType: 'fixed', isPromo: false }).hasTiers).toBe(false)
    expect(buildOfferPriceView({ priceType: 'fixed', isPromo: false, priceTiers: [] }).hasTiers).toBe(false)
  })

  it.each(['on_request', 'free', 'variable'] as const)('%s: keine Tiers ausgewertet', (priceType) => {
    const v = buildOfferPriceView({ priceType, isPromo: false, priceTiers: [ANNA] })
    expect(v.hasTiers).toBe(false)
    expect(v.main).toBeNull()
    expect(v.extraRows).toEqual([])
  })

  it('defensiv: kaputte Preise, Tier ohne Steps, unsortierte Steps', () => {
    const v = buildOfferPriceView({
      priceType: 'fixed', isPromo: false,
      priceTiers: [
        { unit: 'per_hour', unit_label: 'Stunde', steps: [] },
        piece([[6, null, '4.00'], [1, 5, 'abc'], [1, 5, '4.5000'], [2, 3, 'NaN']]),
      ],
    })
    expect(v.main?.amount).toBe('4.50 EUR')
    expect(v.extraRows).toHaveLength(1)
    expect(JSON.stringify(v)).not.toMatch(/null.*undefined|NaN/)
  })

  it('A1: leere Promo-Tiers → Standard', () => {
    const v = buildOfferPriceView({ priceType: 'fixed', isPromo: true, priceTiers: [ANNA], promoPriceTiers: [] })
    expect(v.main?.amount).toBe('4.50 EUR')
    expect(v.compareStrike).toBe('unknown')
  })

  it('A2: different-unit / none / unknown', () => {
    const promo = [piece([[1, null, '30']], 'm²', 'per_m2')]
    expect(buildOfferPriceView({ priceType: 'fixed', isPromo: true, priceTiers: [ANNA], promoPriceTiers: promo }).compareStrike).toBe('different-unit')
    expect(buildOfferPriceView({ priceType: 'fixed', isPromo: true, priceTiers: [], promoPriceTiers: promo }).compareStrike).toBe('none')
    expect(buildOfferPriceView({ priceType: 'fixed', isPromo: true, promoPriceTiers: promo }).compareStrike).toBe('unknown')
  })
})

describe('formatTierRow', () => {
  it('ohne Präfix bei min<=1 ohne max; Teile strukturiert', () => {
    const v = buildOfferPriceView({ priceType: 'fixed', isPromo: false, priceTiers: [piece([[1, null, '30']], 'm²', 'per_m2')] })
    expect(formatTierRow(v.main!, de)).toEqual({ prefix: null, amount: '30.00 EUR', suffix: 'm²' })
  })
  it('he/ar Präfix', () => {
    const v = buildOfferPriceView({ priceType: 'fixed', isPromo: false, priceTiers: [ANNA] })
    expect(formatTierRow(v.extraRows[0], t('he')).prefix).toBe('החל מ-6')
    expect(formatTierRow(v.extraRows[0], t('ar')).prefix).toBe('من 6')
  })
})

describe('buildPriceSpecifications (JSON-LD)', () => {
  const base = { price_type: 'fixed' as const }
  it('Ein-Step ohne Aktion → undefined', () => {
    expect(buildPriceSpecifications({ ...base, price_tiers: [piece([[1, null, '9.99']], null, 'piece')] })).toBeUndefined()
    expect(buildPriceSpecifications({ ...base })).toBeUndefined()
    expect(buildPriceSpecifications({ price_type: 'on_request', price_tiers: [ANNA] })).toBeUndefined()
  })
  it('≥2 Steps: je Zeile eine UnitPriceSpecification mit unitCode', () => {
    const s = buildPriceSpecifications({ ...base, price_tiers: [ANNA] })!
    expect(s).toHaveLength(2)
    expect(s[0]).toMatchObject({
      '@type': 'UnitPriceSpecification', price: '4.50', priceCurrency: 'EUR',
      eligibleQuantity: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 5, unitCode: 'H87', unitText: 'Stück' },
    })
    expect(s[1].eligibleQuantity).not.toHaveProperty('maxValue')
    expect(s[0]).not.toHaveProperty('validFrom')
  })
  it('Aktion: validFrom/validThrough + StrikethroughPrice, Standard-Staffel nicht enthalten', () => {
    const s = buildPriceSpecifications({
      ...base, price_tiers: [ANNA], promo_price_tiers: [piece([[1, null, '3.90']])],
      promo_valid_from: '2026-10-13', promo_valid_until: '2026-10-19T23:59:59Z',
    })!
    expect(s).toHaveLength(2)
    expect(s[0]).toMatchObject({ price: '3.90', validFrom: '2026-10-13', validThrough: '2026-10-19' })
    expect(s[1]).toEqual({
      '@type': 'UnitPriceSpecification', priceType: 'https://schema.org/StrikethroughPrice', price: '4.50', priceCurrency: 'EUR',
    })
  })
  it('custom: unitText ohne unitCode; kein Strikethrough bei anderer Einheit', () => {
    const s = buildPriceSpecifications({
      ...base, price_tiers: [ANNA], promo_price_tiers: [piece([[1, null, '7']], 'Laib', 'custom')],
    })!
    expect(s).toHaveLength(1)
    expect(s[0].eligibleQuantity).toMatchObject({ unitText: 'Laib' })
    expect(s[0].eligibleQuantity).not.toHaveProperty('unitCode')
  })
  it('CEFACT-Codes', () => {
    expect(UNIT_CEFACT_CODES).toMatchObject({ per_piece: 'H87', per_hour: 'HUR', per_m2: 'MTK' })
    expect(UNIT_CEFACT_CODES.fixed).toBeUndefined()
  })
})
