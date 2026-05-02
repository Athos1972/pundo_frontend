/**
 * Unit tests for B5910-001 — Geolocation state machine in StepLocation
 *
 * Tests cover:
 * - Auto-request GPS on mount when no draft
 * - Draft-Resume: no GPS request
 * - GPS granted: geoCenter set, no pin placed (AC-1)
 * - GPS denied: geoStatus = 'denied', zoom = ZOOM_OVERVIEW (AC-2)
 * - ZOOM_FALLBACK used when accuracy > 1000m
 * - handlePinDrop → pinSource = 'click'
 * - handleSuggestionSelect → pinSource = 'search'
 * - GPS button click → pin placed + pinSource = 'gps' (AC-button)
 * - Translations: denied hint present in all 6 languages
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { ZOOM_OVERVIEW, ZOOM_FALLBACK, ZOOM_STREET } from '@/components/shop-admin/onboarding/OnboardingMapInner'

// ─── Mock next/dynamic (so OnboardingMapInner renders synchronously) ─────────
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<{ default: React.ComponentType<unknown> }>) => {
    // Execute factory synchronously and extract default export
    let Component: React.ComponentType<unknown> = () => null
    fn().then(m => { Component = m.default })
    return (props: unknown) => <Component {...(props as object)} />
  },
}))

// ─── Mock OnboardingMapInner to capture props ─────────────────────────────────
const capturedProps: {
  pin: unknown
  pinSource: unknown
  initialCenter: unknown
  initialZoom: unknown
}[] = []

vi.mock('@/components/shop-admin/onboarding/OnboardingMapInner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/shop-admin/onboarding/OnboardingMapInner')>()
  return {
    ...actual,
    OnboardingMapInner: (props: {
      pin: unknown
      pinSource: unknown
      initialCenter: unknown
      initialZoom: unknown
      onPinDrop: (lat: number, lng: number) => void
    }) => {
      capturedProps.push({
        pin: props.pin,
        pinSource: props.pinSource,
        initialCenter: props.initialCenter,
        initialZoom: props.initialZoom,
      })
      return (
        <div
          data-testid="map"
          data-pin={JSON.stringify(props.pin)}
          data-pin-source={String(props.pinSource)}
          data-initial-center={JSON.stringify(props.initialCenter)}
          data-initial-zoom={String(props.initialZoom)}
          onClick={(e) => {
            // Allow tests to simulate map clicks
            const rect = (e.target as HTMLElement).getBoundingClientRect()
            props.onPinDrop(rect.left, rect.top)
          }}
        />
      )
    },
  }
})

// ─── Import StepLocation after mocks ─────────────────────────────────────────
import { StepLocation } from '@/components/shop-admin/onboarding/StepLocation'

// ─── Helpers ─────────────────────────────────────────────────────────────────
type GeoSuccessCallback = (pos: GeolocationPosition) => void
type GeoErrorCallback = (err: GeolocationPositionError) => void

function makeGeoMock(behavior: 'success' | 'denied' | 'unavailable', accuracy = 10) {
  return {
    getCurrentPosition: vi.fn((success: GeoSuccessCallback, error: GeoErrorCallback) => {
      if (behavior === 'success') {
        success({
          coords: {
            latitude: 34.12,
            longitude: 33.56,
            accuracy,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition)
      } else {
        error({ code: behavior === 'denied' ? 1 : 2, message: 'denied' } as GeolocationPositionError)
      }
    }),
  }
}

const DEFAULT_PROPS = {
  tr: tAdmin('en'),
  initialLocation: null,
  onNext: vi.fn(),
  onBack: vi.fn(),
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('StepLocation — geolocation state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedProps.length = 0
    // Default: secure context
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── Zoom constants ─────────────────────────────────────────────────────────
  it('exports correct zoom constants', () => {
    expect(ZOOM_OVERVIEW).toBe(9)
    expect(ZOOM_FALLBACK).toBe(13)
    expect(ZOOM_STREET).toBe(17)
  })

  // ─── T1: Translation keys present ──────────────────────────────────────────
  it('has onboarding_location_geolocate_denied in all 6 languages', () => {
    const langs = ['en', 'de', 'el', 'ru', 'ar', 'he']
    for (const lang of langs) {
      const tr = tAdmin(lang)
      expect(tr.onboarding_location_geolocate_denied, `Missing key in lang=${lang}`).toBeTruthy()
      expect(tr.onboarding_location_geolocate_denied.length, `Empty string in lang=${lang}`).toBeGreaterThan(5)
    }
  })

  it('has onboarding_location_use_my_location in all 6 languages', () => {
    const langs = ['en', 'de', 'el', 'ru', 'ar', 'he']
    for (const lang of langs) {
      const tr = tAdmin(lang)
      expect(tr.onboarding_location_use_my_location, `Missing key in lang=${lang}`).toBeTruthy()
    }
  })

  // ─── GPS granted: geoCenter set, no pin placed (AC-1) ─────────────────────
  it('AC-1: GPS granted — sets geoCenter, does NOT set pin', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: makeGeoMock('success', 5),
      configurable: true,
    })

    await act(async () => {
      render(<StepLocation {...DEFAULT_PROPS} />)
    })

    const map = screen.getByTestId('map')
    // No pin set
    expect(map.dataset.pin).toBe('null')
    // initialCenter set to GPS coords
    expect(map.dataset.initialCenter).toBe(JSON.stringify([34.12, 33.56]))
    // Precise GPS → ZOOM_STREET
    expect(map.dataset.initialZoom).toBe(String(ZOOM_STREET))
    // pinSource still null (no pin)
    expect(map.dataset.pinSource).toBe('null')
  })

  // ─── GPS denied: zoom = ZOOM_OVERVIEW (AC-2) ────────────────────────────────
  it('AC-2: GPS denied — initialZoom is ZOOM_OVERVIEW, hint text shown', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: makeGeoMock('denied'),
      configurable: true,
    })

    await act(async () => {
      render(<StepLocation {...DEFAULT_PROPS} />)
    })

    const map = screen.getByTestId('map')
    expect(map.dataset.initialZoom).toBe(String(ZOOM_OVERVIEW))
    // GPS denied hint shown because no pin set
    expect(screen.getByText(DEFAULT_PROPS.tr.onboarding_location_geolocate_denied)).toBeInTheDocument()
    // GPS button shown
    expect(screen.getByText(DEFAULT_PROPS.tr.onboarding_location_use_my_location)).toBeInTheDocument()
  })

  // ─── GPS inaccurate: zoom = ZOOM_FALLBACK ───────────────────────────────────
  it('inaccurate GPS (accuracy > 1000m) — initialZoom is ZOOM_FALLBACK', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: makeGeoMock('success', 1500),
      configurable: true,
    })

    await act(async () => {
      render(<StepLocation {...DEFAULT_PROPS} />)
    })

    const map = screen.getByTestId('map')
    expect(map.dataset.initialZoom).toBe(String(ZOOM_FALLBACK))
  })

  // ─── Draft-Resume: no GPS request (AC-5) ────────────────────────────────────
  it('AC-5: Draft-Resume — does not call geolocation.getCurrentPosition', async () => {
    const geo = makeGeoMock('success')
    Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true })

    await act(async () => {
      render(
        <StepLocation
          {...DEFAULT_PROPS}
          initialLocation={{ lat: 34.5, lng: 33.1, address: 'Nicosia', isB2cStorefront: true }}
        />
      )
    })

    expect(geo.getCurrentPosition).not.toHaveBeenCalled()

    const map = screen.getByTestId('map')
    // Pin set from initialLocation
    expect(map.dataset.pin).toBe(JSON.stringify([34.5, 33.1]))
    // pinSource = 'initial'
    expect(map.dataset.pinSource).toBe('initial')
  })

  // ─── handlePinDrop → pinSource = 'click' ────────────────────────────────────
  it('map click sets pinSource to "click"', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: makeGeoMock('denied'),
      configurable: true,
    })

    // Mock reverseGeocode
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ display_name: 'Test Address' }),
    }) as unknown as typeof fetch

    await act(async () => {
      render(<StepLocation {...DEFAULT_PROPS} />)
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('map'))
    })

    const map = screen.getByTestId('map')
    expect(map.dataset.pinSource).toBe('click')
  })

  // ─── handleSuggestionSelect → pinSource = 'search' ──────────────────────────
  it('selecting a search suggestion sets pinSource to "search"', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: makeGeoMock('denied'),
      configurable: true,
    })

    // Mock nominatim API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ display_name: 'Limassol Street', lat: '34.67', lon: '33.04' }],
    }) as unknown as typeof fetch

    await act(async () => {
      render(<StepLocation {...DEFAULT_PROPS} />)
    })

    // Type in search box
    const input = screen.getByPlaceholderText(DEFAULT_PROPS.tr.onboarding_location_address_placeholder)
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Limassol' } })
    })

    // Wait for suggestions to appear (debounced)
    await waitFor(() => {
      expect(screen.queryByText('Limassol Street')).toBeInTheDocument()
    }, { timeout: 2000 })

    await act(async () => {
      fireEvent.click(screen.getByText('Limassol Street'))
    })

    const map = screen.getByTestId('map')
    expect(map.dataset.pinSource).toBe('search')
    expect(map.dataset.pin).toBe(JSON.stringify([34.67, 33.04]))
  })

  // ─── GPS button click (manual re-try success) → pinSource = 'gps' ───────────
  it('GPS button click on success sets pin and pinSource to "gps"', async () => {
    // First mock: denied on mount
    let callCount = 0
    const geo = {
      getCurrentPosition: vi.fn((success: GeoSuccessCallback, error: GeoErrorCallback) => {
        callCount++
        if (callCount === 1) {
          // First call (auto-mount): deny
          error({ code: 1, message: 'denied' } as GeolocationPositionError)
        } else {
          // Second call (button click): grant
          success({
            coords: { latitude: 51.5, longitude: -0.1, accuracy: 20, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
            timestamp: Date.now(),
          } as GeolocationPosition)
        }
      }),
    }
    Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ display_name: 'London' }),
    }) as unknown as typeof fetch

    await act(async () => {
      render(<StepLocation {...DEFAULT_PROPS} />)
    })

    // After mount: denied — button visible
    const gpsBtn = screen.getByText(DEFAULT_PROPS.tr.onboarding_location_use_my_location)
    expect(gpsBtn).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(gpsBtn)
    })

    const map = screen.getByTestId('map')
    expect(map.dataset.pinSource).toBe('gps')
    expect(map.dataset.pin).toBe(JSON.stringify([51.5, -0.1]))
  })

  // ─── GPS button click when no geolocation API ────────────────────────────────
  it('sets geoStatus to "unavailable" when navigator.geolocation is absent', async () => {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true })

    await act(async () => {
      render(<StepLocation {...DEFAULT_PROPS} />)
    })

    // Unavailable shows button but no denied hint (status is 'unavailable', not 'denied')
    expect(screen.getByText(DEFAULT_PROPS.tr.onboarding_location_use_my_location)).toBeInTheDocument()
    expect(screen.queryByText(DEFAULT_PROPS.tr.onboarding_location_geolocate_denied)).not.toBeInTheDocument()
  })

  // ─── Not-secure context ──────────────────────────────────────────────────────
  it('treats non-secure context as denied', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true })
    const geo = makeGeoMock('success')
    Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true })

    await act(async () => {
      render(<StepLocation {...DEFAULT_PROPS} />)
    })

    // Should NOT call geolocation
    expect(geo.getCurrentPosition).not.toHaveBeenCalled()
    // Shows denied hint
    expect(screen.getByText(DEFAULT_PROPS.tr.onboarding_location_geolocate_denied)).toBeInTheDocument()
  })

  // ─── AC-8 regression: Next button disabled when no pin ──────────────────────
  it('AC-8: Next button is disabled when no pin is set', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: makeGeoMock('denied'),
      configurable: true,
    })

    await act(async () => {
      render(<StepLocation {...DEFAULT_PROPS} />)
    })

    const nextBtn = screen.getByText(DEFAULT_PROPS.tr.onboarding_next)
    expect(nextBtn).toBeDisabled()
  })

  it('AC-8: Next button is enabled after a pin is set via map click', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: makeGeoMock('denied'),
      configurable: true,
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ display_name: 'Some Place' }),
    }) as unknown as typeof fetch

    await act(async () => {
      render(<StepLocation {...DEFAULT_PROPS} />)
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('map'))
    })

    const nextBtn = screen.getByText(DEFAULT_PROPS.tr.onboarding_next)
    expect(nextBtn).not.toBeDisabled()
  })
})
