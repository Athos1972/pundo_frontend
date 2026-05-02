'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { OnboardingLocation } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { ZOOM_OVERVIEW, ZOOM_FALLBACK, ZOOM_STREET, type PinSource } from './OnboardingMapInner'

const OnboardingMapInner = dynamic(
  () => import('./OnboardingMapInner').then(m => ({ default: m.OnboardingMapInner })),
  { ssr: false, loading: () => <div className="h-[220px] rounded-xl bg-gray-100 animate-pulse" /> }
)

interface StepLocationProps {
  tr: ShopAdminTranslations
  initialLocation: OnboardingLocation | null
  onNext: (location: OnboardingLocation) => void
  onBack: () => void
}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

export function StepLocation({ tr, initialLocation, onNext, onBack }: StepLocationProps) {
  const [pin, setPin] = useState<[number, number] | null>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : null
  )
  const [address, setAddress] = useState(initialLocation?.address ?? '')
  const [isB2c, setIsB2c] = useState(initialLocation?.isB2cStorefront ?? true)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [reversing, setReversing] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── GPS state machine ─────────────────────────────────────────────────────
  const [pinSource, setPinSource] = useState<PinSource>(initialLocation ? 'initial' : null)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [geoCenter, setGeoCenter] = useState<[number, number] | null>(null)
  const [geoZoom, setGeoZoom] = useState<number>(ZOOM_OVERVIEW)

  // Ref guard against React 19 StrictMode double-mount
  const hasRequestedGeoRef = useRef(false)

  const requestGeolocation = useCallback(
    (onSuccess?: (lat: number, lng: number) => void) => {
      if (!window.isSecureContext) {
        setGeoStatus('denied')
        return
      }
      if (!navigator.geolocation) {
        setGeoStatus('unavailable')
        return
      }
      setGeoStatus('requesting')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const accuracy = pos.coords.accuracy ?? 0
          const zoom = accuracy > 1000 ? ZOOM_FALLBACK : ZOOM_STREET
          setGeoCenter([lat, lng])
          setGeoZoom(zoom)
          setGeoStatus('granted')
          if (onSuccess) onSuccess(lat, lng)
        },
        () => {
          setGeoStatus('denied')
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60_000 }
      )
    },
    []
  )

  // Auto-request GPS on mount — only when no draft location exists
  useEffect(() => {
    if (initialLocation) return  // AC-5: Draft-Resume — no GPS request
    if (hasRequestedGeoRef.current) return
    hasRequestedGeoRef.current = true
    requestGeolocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReversing(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      )
      if (res.ok) {
        const data = await res.json() as { display_name?: string }
        if (data.display_name) setAddress(data.display_name)
      }
    } catch { /* silent */ } finally {
      setReversing(false)
    }
  }, [])

  function handlePinDrop(lat: number, lng: number) {
    setPin([lat, lng])
    setPinSource('click')
    reverseGeocode(lat, lng)
  }

  function handleQueryChange(val: string) {
    setQuery(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (val.trim().length < 3) { setSuggestions([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/nominatim?q=${encodeURIComponent(val.trim())}`)
        if (res.ok) setSuggestions((await res.json()) as NominatimResult[])
      } catch { /* silent */ } finally {
        setSearching(false)
      }
    }, 400)
  }

  function handleSuggestionSelect(s: NominatimResult) {
    const lat = parseFloat(s.lat)
    const lng = parseFloat(s.lon)
    setPin([lat, lng])
    setPinSource('search')
    setAddress(s.display_name)
    setQuery('')
    setSuggestions([])
  }

  // GPS button handler — manual re-try. On success sets pin (active consent).
  function handleGpsButtonClick() {
    requestGeolocation((lat, lng) => {
      // Only reached if GPS succeeds — this IS the user's active gesture
      // so we set the pin (unlike the auto-mount flow which does not set pin)
      setPin([lat, lng])
      setPinSource('gps')
      reverseGeocode(lat, lng)
    })
  }

  function handleSubmit() {
    if (!pin) return
    onNext({ lat: pin[0], lng: pin[1], address, isB2cStorefront: isB2c })
  }

  const isGeoRequesting = geoStatus === 'requesting'
  const showGpsButton = geoStatus === 'denied' || geoStatus === 'unavailable'
  const showGpsDeniedHint = geoStatus === 'denied' && !pin

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-gray-900">{tr.onboarding_step3_title}</h2>

      <p className="text-sm text-gray-500">{tr.onboarding_location_pin_hint}</p>

      <OnboardingMapInner
        pin={pin}
        pinSource={pinSource}
        initialCenter={geoCenter}
        initialZoom={geoZoom}
        onPinDrop={handlePinDrop}
      />

      {/* Address search */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder={tr.onboarding_location_address_placeholder}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          dir="auto"
        />
        {searching && (
          <div className="absolute end-3 top-3 w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        )}
        {suggestions.length > 0 && (
          <ul className="absolute z-50 top-full start-0 end-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSuggestionSelect(s)}
                  className="w-full text-start px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {s.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* GPS button — visible when GPS is denied or unavailable */}
      {showGpsButton && (
        <button
          type="button"
          onClick={handleGpsButtonClick}
          disabled={isGeoRequesting}
          className="flex items-center gap-2 text-sm text-accent hover:text-accent-dark font-medium text-start rtl:text-end disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeoRequesting && (
            <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block shrink-0" />
          )}
          {tr.onboarding_location_use_my_location}
        </button>
      )}

      {/* Denied hint — shown when GPS is denied and no pin is set */}
      {showGpsDeniedHint && (
        <p className="text-xs text-gray-500 text-start rtl:text-end">
          {tr.onboarding_location_geolocate_denied}
        </p>
      )}

      {/* Selected address display */}
      {address && (
        <div className="flex gap-2 items-start bg-gray-50 rounded-xl px-4 py-3">
          <span className="text-gray-400 mt-0.5">📍</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">{tr.onboarding_location_address}</p>
            <p className="text-sm text-gray-800 leading-snug">
              {reversing ? <span className="text-gray-400 italic">…</span> : address}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddress('')}
            className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* B2C checkbox */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isB2c}
          onChange={e => setIsB2c(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 accent-accent"
        />
        <span className="text-sm text-gray-700">{tr.onboarding_location_b2c}</span>
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {tr.onboarding_back}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!pin}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {tr.onboarding_next}
        </button>
      </div>
    </div>
  )
}
