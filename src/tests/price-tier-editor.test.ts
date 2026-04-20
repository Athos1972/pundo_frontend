import { describe, it, expect } from 'vitest'
import type { PriceTier, PriceTierStep } from '@/types/shop-admin'

// Pure logic extracted from PriceTierEditor and ProductForm for unit testing

function stepError(step: PriceTierStep): string | null {
  if (step.max_quantity !== undefined && step.max_quantity < step.min_quantity) {
    return 'max_lt_min'
  }
  if (!step.price || parseFloat(step.price) <= 0) {
    return 'invalid_price'
  }
  return null
}

function tiersAreValid(tiers: PriceTier[]): boolean {
  for (const tier of tiers) {
    if (!tier.unit) return false
    if (tier.unit === 'custom' && !tier.unit_label_custom?.trim()) return false
    if (tier.steps.length === 0) return false
    for (const step of tier.steps) {
      if (!step.price || parseFloat(step.price) <= 0) return false
      if (step.max_quantity !== undefined && step.max_quantity < step.min_quantity) return false
    }
  }
  return true
}

function lowestStepPrice(tier: PriceTier): string | null {
  if (!tier.steps.length) return null
  return tier.steps.reduce(
    (min, s) => (parseFloat(s.price) < parseFloat(min.price) ? s : min),
    tier.steps[0],
  ).price
}

describe('stepError', () => {
  it('gibt null zurück für gültige Step', () => {
    expect(stepError({ min_quantity: 1, price: '10.00', currency: 'EUR' })).toBeNull()
  })

  it('erkennt max_quantity < min_quantity', () => {
    expect(stepError({ min_quantity: 10, max_quantity: 5, price: '10.00', currency: 'EUR' }))
      .toBe('max_lt_min')
  })

  it('akzeptiert max_quantity === min_quantity', () => {
    expect(stepError({ min_quantity: 5, max_quantity: 5, price: '10.00', currency: 'EUR' })).toBeNull()
  })

  it('erkennt Preis = 0', () => {
    expect(stepError({ min_quantity: 1, price: '0', currency: 'EUR' })).toBe('invalid_price')
  })

  it('erkennt negativen Preis', () => {
    expect(stepError({ min_quantity: 1, price: '-1', currency: 'EUR' })).toBe('invalid_price')
  })

  it('erkennt leeren Preis', () => {
    expect(stepError({ min_quantity: 1, price: '', currency: 'EUR' })).toBe('invalid_price')
  })

  it('akzeptiert max_quantity undefined (unbegrenzt)', () => {
    expect(stepError({ min_quantity: 1, max_quantity: undefined, price: '25.00', currency: 'EUR' })).toBeNull()
  })
})

describe('tiersAreValid', () => {
  it('gibt true zurück für leere Tier-Liste', () => {
    expect(tiersAreValid([])).toBe(true)
  })

  it('gibt true zurück für gültigen Tier', () => {
    const tiers: PriceTier[] = [{
      unit: 'per_hour',
      steps: [{ min_quantity: 1, price: '45.00', currency: 'EUR' }],
    }]
    expect(tiersAreValid(tiers)).toBe(true)
  })

  it('gibt false zurück wenn unit fehlt', () => {
    const tiers: PriceTier[] = [{
      unit: '',
      steps: [{ min_quantity: 1, price: '45.00', currency: 'EUR' }],
    }]
    expect(tiersAreValid(tiers)).toBe(false)
  })

  it('gibt false zurück wenn unit=custom aber kein unit_label_custom', () => {
    const tiers: PriceTier[] = [{
      unit: 'custom',
      unit_label_custom: '',
      steps: [{ min_quantity: 1, price: '45.00', currency: 'EUR' }],
    }]
    expect(tiersAreValid(tiers)).toBe(false)
  })

  it('gibt true zurück wenn unit=custom mit gültigem Label', () => {
    const tiers: PriceTier[] = [{
      unit: 'custom',
      unit_label_custom: 'pro Verpackung',
      steps: [{ min_quantity: 1, price: '45.00', currency: 'EUR' }],
    }]
    expect(tiersAreValid(tiers)).toBe(true)
  })

  it('gibt false zurück wenn keine Steps', () => {
    const tiers: PriceTier[] = [{ unit: 'per_hour', steps: [] }]
    expect(tiersAreValid(tiers)).toBe(false)
  })

  it('gibt false zurück wenn Step-Preis = 0', () => {
    const tiers: PriceTier[] = [{
      unit: 'per_m2',
      steps: [{ min_quantity: 1, price: '0', currency: 'EUR' }],
    }]
    expect(tiersAreValid(tiers)).toBe(false)
  })

  it('erlaubt Staffel-Gaps (1-5, dann 10+)', () => {
    const tiers: PriceTier[] = [{
      unit: 'per_m2',
      steps: [
        { min_quantity: 1, max_quantity: 5, price: '50.00', currency: 'EUR' },
        { min_quantity: 10, price: '45.00', currency: 'EUR' },
      ],
    }]
    expect(tiersAreValid(tiers)).toBe(true)
  })

  it('gibt false zurück wenn max < min in einem Step', () => {
    const tiers: PriceTier[] = [{
      unit: 'per_m2',
      steps: [{ min_quantity: 10, max_quantity: 5, price: '50.00', currency: 'EUR' }],
    }]
    expect(tiersAreValid(tiers)).toBe(false)
  })

  it('validiert mehrere Tiers parallel', () => {
    const tiers: PriceTier[] = [
      { unit: 'per_m2', steps: [{ min_quantity: 1, price: '50.00', currency: 'EUR' }] },
      { unit: 'per_hour', steps: [{ min_quantity: 1, price: '45.00', currency: 'EUR' }] },
    ]
    expect(tiersAreValid(tiers)).toBe(true)
  })
})

describe('lowestStepPrice', () => {
  it('gibt niedrigsten Preis zurück', () => {
    const tier: PriceTier = {
      unit: 'per_m2',
      steps: [
        { min_quantity: 1, max_quantity: 9, price: '50.00', currency: 'EUR' },
        { min_quantity: 10, price: '40.00', currency: 'EUR' },
      ],
    }
    expect(lowestStepPrice(tier)).toBe('40.00')
  })

  it('gibt null zurück wenn keine Steps', () => {
    expect(lowestStepPrice({ unit: 'per_hour', steps: [] })).toBeNull()
  })

  it('gibt den einzigen Preis zurück wenn nur 1 Step', () => {
    const tier: PriceTier = {
      unit: 'per_hour',
      steps: [{ min_quantity: 1, price: '45.00', currency: 'EUR' }],
    }
    expect(lowestStepPrice(tier)).toBe('45.00')
  })
})
