/**
 * B5900-005 — Unit-Tests für die crash-anfällige Normalisierungslogik der
 * Shop-Detailseite (`src/lib/shop-opening-hours.ts`). Testet ausschließlich
 * die reinen Helper, nicht die async Server-Component `page.tsx` (dafür gibt
 * es im Repo kein Harness, und das Framework-Rendering ist nicht die
 * Bug-Ursache — siehe 02-architecture.md T5).
 *
 * Fixtures bilden gezielt die vier realen Fehlformen aus dem Design nach:
 * - `opening_hours_raw.weekdayDescriptions: undefined`
 * - `opening_hours_raw.specialDays: undefined`
 * - `location` truthy, aber ohne `lat`/`lng`
 * - `name: null`
 */
import { describe, it, expect } from 'vitest'
import { getWeekdayDescriptions, getSpecialDays, buildShopPin } from '@/lib/shop-opening-hours'
import type { OpeningHoursRaw, ShopDetailResponse } from '@/types/api'

// ── getWeekdayDescriptions ──────────────────────────────────────────────────

describe('getWeekdayDescriptions', () => {
  it('returns [] when weekdayDescriptions is undefined', () => {
    const raw = { weekdayDescriptions: undefined } as OpeningHoursRaw
    expect(getWeekdayDescriptions(raw)).toEqual([])
  })

  it('returns [] when opening_hours_raw is null', () => {
    expect(getWeekdayDescriptions(null)).toEqual([])
  })

  it('returns [] when opening_hours_raw is undefined', () => {
    expect(getWeekdayDescriptions(undefined)).toEqual([])
  })

  it('returns the array unchanged for a valid shop (regression guard)', () => {
    const raw: OpeningHoursRaw = { weekdayDescriptions: ['Mon 9-5'] }
    expect(getWeekdayDescriptions(raw)).toEqual(['Mon 9-5'])
  })

  it('returns [] when weekdayDescriptions is a non-array truthy value', () => {
    const raw = { weekdayDescriptions: 'Mon 9-5' } as unknown as OpeningHoursRaw
    expect(getWeekdayDescriptions(raw)).toEqual([])
  })
})

// ── getSpecialDays ───────────────────────────────────────────────────────────

describe('getSpecialDays', () => {
  it('returns [] when specialDays is undefined', () => {
    const raw = { specialDays: undefined } as OpeningHoursRaw
    expect(getSpecialDays(raw)).toEqual([])
  })

  it('returns [] when opening_hours_raw is null', () => {
    expect(getSpecialDays(null)).toEqual([])
  })

  it('returns [] when opening_hours_raw is undefined', () => {
    expect(getSpecialDays(undefined)).toEqual([])
  })

  it('returns the array unchanged for a valid shop (regression guard)', () => {
    const raw: OpeningHoursRaw = {
      specialDays: [{ date: '2026-12-25', isOpen: false }],
    }
    expect(getSpecialDays(raw)).toEqual([{ date: '2026-12-25', isOpen: false }])
  })
})

// ── buildShopPin ─────────────────────────────────────────────────────────────

type ShopPinInput = Pick<ShopDetailResponse, 'id' | 'name' | 'location'>

describe('buildShopPin', () => {
  it('returns [] when location is null', () => {
    const shop: ShopPinInput = { id: 1, name: 'Test Shop', location: null }
    expect(buildShopPin(shop)).toEqual([])
  })

  it('returns [] when location is truthy but missing lat/lng (the core of bug line 132)', () => {
    const shop = { id: 1, name: 'Test Shop', location: {} } as unknown as ShopPinInput
    expect(buildShopPin(shop)).toEqual([])
  })

  it('falls back to name "Shop" when name is null', () => {
    const shop: ShopPinInput = { id: 2, name: null, location: { lat: 34.9, lng: 33.6 } }
    expect(buildShopPin(shop)).toEqual([{ id: 2, name: 'Shop', lat: 34.9, lng: 33.6 }])
  })

  it('returns a pin with correct coordinates and name for a valid shop', () => {
    const shop: ShopPinInput = { id: 3, name: 'Artemis', location: { lat: 34.9, lng: 33.6 } }
    expect(buildShopPin(shop)).toEqual([{ id: 3, name: 'Artemis', lat: 34.9, lng: 33.6 }])
  })
})
