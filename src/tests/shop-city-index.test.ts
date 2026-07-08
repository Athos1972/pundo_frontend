/**
 * B5900-007 — Pure helpers for city-index slug/name resolution
 * (src/lib/shop-city-index.ts), used by:
 *  - /shops/city/[city] (slug → city name, 404 on unknown slug)
 *  - shop detail breadcrumb rücklink T8 (city name → index slug)
 */
import { describe, it, expect } from 'vitest'
import { findCityBySlug, findCityByName } from '@/lib/shop-city-index'
import type { ShopCityItem } from '@/lib/api'

const CITIES: ShopCityItem[] = [
  { city: 'Nicosia', slug: 'nicosia', shop_count: 1290 },
  { city: 'Larnaca', slug: 'larnaca', shop_count: 1040 },
  { city: 'Egkomi', slug: 'egkomi', shop_count: 98 },
]

describe('findCityBySlug', () => {
  it('finds a city by exact slug', () => {
    expect(findCityBySlug(CITIES, 'larnaca')).toEqual(CITIES[1])
  })

  it('returns null for an unknown slug', () => {
    expect(findCityBySlug(CITIES, 'unknown-city')).toBeNull()
  })

  it('is case-sensitive on slug (slugs are always already-normalized lowercase)', () => {
    expect(findCityBySlug(CITIES, 'Larnaca')).toBeNull()
  })

  it('returns null on an empty cities array', () => {
    expect(findCityBySlug([], 'larnaca')).toBeNull()
  })
})

describe('findCityByName', () => {
  it('finds a city by exact display name', () => {
    expect(findCityByName(CITIES, 'Nicosia')).toEqual(CITIES[0])
  })

  it('is case-insensitive', () => {
    expect(findCityByName(CITIES, 'nicosia')).toEqual(CITIES[0])
    expect(findCityByName(CITIES, 'NICOSIA')).toEqual(CITIES[0])
  })

  it('trims whitespace before comparing', () => {
    expect(findCityByName(CITIES, '  Larnaca  ')).toEqual(CITIES[1])
  })

  it('returns null for a city with no index page (below threshold)', () => {
    expect(findCityByName(CITIES, 'Xylofagou')).toBeNull()
  })

  it('returns null on an empty cities array', () => {
    expect(findCityByName([], 'Nicosia')).toBeNull()
  })
})
