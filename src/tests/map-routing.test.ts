import { describe, it, expect } from 'vitest'

// Test the routing URL construction logic independently of the Leaflet component
function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
function appleMapsUrl(lat: number, lng: number) {
  return `https://maps.apple.com/?daddr=${lat},${lng}`
}
function wazeUrl(lat: number, lng: number) {
  return `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`
}

describe('Routing URL generation', () => {
  const lat = 34.9
  const lng = 33.63

  it('Google Maps URL contains correct destination coordinates', () => {
    expect(googleMapsUrl(lat, lng)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=34.9,33.63'
    )
  })

  it('Apple Maps URL contains correct daddr coordinates', () => {
    expect(appleMapsUrl(lat, lng)).toBe(
      'https://maps.apple.com/?daddr=34.9,33.63'
    )
  })

  it('Waze URL contains correct ll coordinates and navigate=yes', () => {
    expect(wazeUrl(lat, lng)).toBe(
      'https://www.waze.com/ul?ll=34.9,33.63&navigate=yes'
    )
  })

  it('handles negative coordinates (southern hemisphere)', () => {
    expect(googleMapsUrl(-33.87, 151.21)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-33.87,151.21'
    )
    expect(appleMapsUrl(-33.87, 151.21)).toBe(
      'https://maps.apple.com/?daddr=-33.87,151.21'
    )
    expect(wazeUrl(-33.87, 151.21)).toBe(
      'https://www.waze.com/ul?ll=-33.87,151.21&navigate=yes'
    )
  })

  it('handles high-precision coordinates', () => {
    const precLat = 34.923456
    const precLng = 33.634567
    expect(googleMapsUrl(precLat, precLng)).toContain(`destination=${precLat},${precLng}`)
    expect(appleMapsUrl(precLat, precLng)).toContain(`daddr=${precLat},${precLng}`)
    expect(wazeUrl(precLat, precLng)).toContain(`ll=${precLat},${precLng}`)
  })
})

describe('show_route translation key', () => {
  it('all 6 languages have show_route defined', async () => {
    const { translations } = await import('@/lib/translations')
    const langs = ['en', 'de', 'ru', 'el', 'ar', 'he'] as const
    for (const lang of langs) {
      expect(translations[lang].show_route).toBeTruthy()
      expect(typeof translations[lang].show_route).toBe('string')
    }
  })

  it('show_route values no longer contain arrow characters', async () => {
    const { translations } = await import('@/lib/translations')
    const langs = ['en', 'de', 'ru', 'el', 'ar', 'he'] as const
    for (const lang of langs) {
      expect(translations[lang].show_route).not.toContain('→')
      expect(translations[lang].show_route).not.toContain('←')
    }
  })
})

describe('RTL lang detection for popup dir attribute', () => {
  it('isRTL returns true for ar and he', async () => {
    const { isRTL } = await import('@/lib/lang')
    expect(isRTL('ar')).toBe(true)
    expect(isRTL('he')).toBe(true)
  })

  it('isRTL returns false for ltr languages', async () => {
    const { isRTL } = await import('@/lib/lang')
    expect(isRTL('en')).toBe(false)
    expect(isRTL('de')).toBe(false)
    expect(isRTL('ru')).toBe(false)
    expect(isRTL('el')).toBe(false)
  })
})
