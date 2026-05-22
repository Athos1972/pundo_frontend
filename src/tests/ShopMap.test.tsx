/**
 * Unit tests for applyFit (F4300 — Karten-Auto-Zoom).
 *
 * Covers:
 *  (a) ≥2 shops → fitBounds called with padding [40,40] and maxZoom 16
 *  (b) 1 shop → setView([lat,lng], 15) called; fitBounds not called
 *  (c) 0 shops → neither fitBounds nor setView called
 *  (d) explicit center+zoom props → setView with those values (overrides auto-fit)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyFit } from '@/components/map/ShopMap'

// Minimal ShopPin shape
interface ShopPin {
  id: number
  name: string
  lat: number
  lng: number
}

// Mock L.latLngBounds so we can inspect what was passed to fitBounds
vi.mock('leaflet', async () => {
  const original = await vi.importActual<typeof import('leaflet')>('leaflet')
  return {
    ...original,
    latLngBounds: (points: [number, number][]) => ({ _points: points, __isMockBounds: true }),
    icon: () => ({}),
  }
})

// We cannot import 'leaflet/dist/leaflet.css' in jsdom — suppress the module error
vi.mock('leaflet/dist/leaflet.css', () => ({}))

function makeMap() {
  return {
    setView: vi.fn(),
    fitBounds: vi.fn(),
    getContainer: vi.fn(() => ({ offsetWidth: 100 })),
    invalidateSize: vi.fn(),
  }
}

const SHOP_A: ShopPin = { id: 1, name: 'Shop A', lat: 34.9, lng: 33.6 }
const SHOP_B: ShopPin = { id: 2, name: 'Shop B', lat: 35.1, lng: 33.9 }

describe('applyFit', () => {
  let map: ReturnType<typeof makeMap>

  beforeEach(() => {
    map = makeMap()
  })

  it('(a) ≥2 shops — calls fitBounds with padding [40,40] and maxZoom 16', () => {
    applyFit(map as unknown as import('leaflet').Map, [SHOP_A, SHOP_B])

    expect(map.fitBounds).toHaveBeenCalledOnce()
    const [, options] = map.fitBounds.mock.calls[0]
    expect(options).toMatchObject({ padding: [40, 40], maxZoom: 16 })
    expect(map.setView).not.toHaveBeenCalled()
  })

  it('(a) ≥2 shops — fitBounds is called once (bounds object is passed)', () => {
    applyFit(map as unknown as import('leaflet').Map, [SHOP_A, SHOP_B])

    // fitBounds receives a bounds object (truthy) as first arg
    const [bounds] = map.fitBounds.mock.calls[0]
    expect(bounds).toBeTruthy()
  })

  it('(b) 1 shop — calls setView([lat,lng], 15); fitBounds not called', () => {
    applyFit(map as unknown as import('leaflet').Map, [SHOP_A])

    expect(map.setView).toHaveBeenCalledOnce()
    expect(map.setView).toHaveBeenCalledWith([SHOP_A.lat, SHOP_A.lng], 15)
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('(c) 0 shops — neither fitBounds nor setView called', () => {
    applyFit(map as unknown as import('leaflet').Map, [])

    expect(map.fitBounds).not.toHaveBeenCalled()
    expect(map.setView).not.toHaveBeenCalled()
  })

  it('(d) explicit center+zoom — setView with those values; fitBounds not called', () => {
    const center: [number, number] = [35.5, 33.0]
    const zoom = 12

    applyFit(map as unknown as import('leaflet').Map, [SHOP_A, SHOP_B], center, zoom)

    expect(map.setView).toHaveBeenCalledOnce()
    expect(map.setView).toHaveBeenCalledWith(center, zoom)
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('(d) explicit center+zoom takes precedence even with 0 shops', () => {
    const center: [number, number] = [34.9, 33.63]
    const zoom = 13

    applyFit(map as unknown as import('leaflet').Map, [], center, zoom)

    expect(map.setView).toHaveBeenCalledOnce()
    expect(map.setView).toHaveBeenCalledWith(center, zoom)
    expect(map.fitBounds).not.toHaveBeenCalled()
  })
})
