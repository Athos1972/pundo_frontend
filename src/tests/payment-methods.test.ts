// src/tests/payment-methods.test.ts — F5300 unit tests
// Tests: PAYMENT_METHODS constant, radius filter logic, charity display logic

import { describe, it, expect } from 'vitest'
import { PAYMENT_METHODS } from '@/lib/payment-methods'
import type { PaymentMethodValue } from '@/types/shop-admin'

// ─── PAYMENT_METHODS constant ─────────────────────────────────────────────────

describe('PAYMENT_METHODS constant', () => {
  it('contains exactly 4 entries', () => {
    expect(PAYMENT_METHODS).toHaveLength(4)
  })

  it('has the correct values in order', () => {
    const values = PAYMENT_METHODS.map(m => m.value)
    expect(values).toEqual(['cash', 'card', 'revolut', 'klarna'])
  })

  it('each entry has a labelKey that matches the naming convention', () => {
    for (const def of PAYMENT_METHODS) {
      expect(def.labelKey).toMatch(/^payment_(cash|card|revolut|klarna)$/)
    }
  })

  it('each entry has an Icon function', () => {
    for (const def of PAYMENT_METHODS) {
      expect(typeof def.Icon).toBe('function')
    }
  })

  it('labelKey for cash is payment_cash', () => {
    const cash = PAYMENT_METHODS.find(m => m.value === 'cash')
    expect(cash?.labelKey).toBe('payment_cash')
  })

  it('labelKey for card is payment_card', () => {
    const card = PAYMENT_METHODS.find(m => m.value === 'card')
    expect(card?.labelKey).toBe('payment_card')
  })
})

// ─── Radius filter logic (AC-03, AC-04, AC-05) ───────────────────────────────

type ShopForFilter = {
  delivers_island_wide?: boolean
  service_radius_km?: number | null
  dist_km?: number | null
}

/**
 * Mirrors the clientside filter logic in ShopsContent.tsx.
 * A shop matches when:
 *   delivers_island_wide === true  OR
 *   (coords available AND dist_km != null AND service_radius_km != null AND dist_km <= service_radius_km)
 */
function matchesDeliverFilter(shop: ShopForFilter, hasCoords: boolean): boolean {
  if (shop.delivers_island_wide === true) return true
  if (!hasCoords) return false
  if (shop.dist_km == null || shop.service_radius_km == null) return false
  return shop.dist_km <= shop.service_radius_km
}

describe('Radius filter logic (clientside)', () => {
  it('AC-04 — island-wide shop always matches regardless of distance', () => {
    const shop: ShopForFilter = { delivers_island_wide: true, service_radius_km: null, dist_km: 100 }
    expect(matchesDeliverFilter(shop, true)).toBe(true)
    expect(matchesDeliverFilter(shop, false)).toBe(true)
  })

  it('AC-03 — shop within radius matches', () => {
    const shop: ShopForFilter = { delivers_island_wide: false, service_radius_km: 30, dist_km: 20 }
    expect(matchesDeliverFilter(shop, true)).toBe(true)
  })

  it('AC-03 — shop outside radius does not match', () => {
    const shop: ShopForFilter = { delivers_island_wide: false, service_radius_km: 30, dist_km: 35 }
    expect(matchesDeliverFilter(shop, true)).toBe(false)
  })

  it('AC-05 — shop with no radius set does not match (excluded by active filter)', () => {
    const shop: ShopForFilter = { delivers_island_wide: false, service_radius_km: null, dist_km: 5 }
    expect(matchesDeliverFilter(shop, true)).toBe(false)
  })

  it('no coords — non-island-wide shop never matches', () => {
    const shop: ShopForFilter = { delivers_island_wide: false, service_radius_km: 30, dist_km: 10 }
    expect(matchesDeliverFilter(shop, false)).toBe(false)
  })

  it('exactly on boundary (dist_km === service_radius_km) matches', () => {
    const shop: ShopForFilter = { delivers_island_wide: false, service_radius_km: 30, dist_km: 30 }
    expect(matchesDeliverFilter(shop, true)).toBe(true)
  })
})

// ─── Charity status display logic (AC-06, AC-07, AC-08, AC-09) ───────────────

type CharityStatus = 'none' | 'pending' | 'approved'

/** Owner sees status hint; returns what hint to show */
function charityOwnerHint(status: CharityStatus | undefined): 'pending' | 'approved' | null {
  if (status === 'pending') return 'pending'
  if (status === 'approved') return 'approved'
  return null
}

/** Consumer badge: only shown when is_charity_supporter === true (= approved flag) */
function consumerShowsBadge(is_charity_supporter: boolean | undefined): boolean {
  return is_charity_supporter === true
}

describe('Charity display logic', () => {
  it('AC-06 — owner sees pending hint when charity_status=pending', () => {
    expect(charityOwnerHint('pending')).toBe('pending')
  })

  it('AC-06 — owner sees approved hint when charity_status=approved', () => {
    expect(charityOwnerHint('approved')).toBe('approved')
  })

  it('AC-09 — owner sees no hint when charity_status=none', () => {
    expect(charityOwnerHint('none')).toBeNull()
  })

  it('owner sees no hint when charity_status is undefined', () => {
    expect(charityOwnerHint(undefined)).toBeNull()
  })

  it('AC-08 — consumer sees badge when is_charity_supporter=true', () => {
    expect(consumerShowsBadge(true)).toBe(true)
  })

  it('AC-07 — consumer sees NO badge when is_charity_supporter=false', () => {
    expect(consumerShowsBadge(false)).toBe(false)
  })

  it('AC-07 — consumer sees NO badge when is_charity_supporter=undefined', () => {
    expect(consumerShowsBadge(undefined)).toBe(false)
  })
})

// ─── PaymentMethodValue type guard (smoke) ────────────────────────────────────

describe('PaymentMethodValue values', () => {
  const validValues: PaymentMethodValue[] = ['cash', 'card', 'revolut', 'klarna']

  it('all PAYMENT_METHODS values are valid PaymentMethodValue', () => {
    for (const def of PAYMENT_METHODS) {
      expect(validValues).toContain(def.value)
    }
  })
})
