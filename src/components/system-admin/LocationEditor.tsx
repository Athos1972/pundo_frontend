'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import dynamic from 'next/dynamic'
import { useState, useRef, useCallback } from 'react'

const LocationEditorMap = dynamic(
  () => import('./LocationEditorMap').then((m) => m.LocationEditorMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] rounded-lg bg-gray-100 animate-pulse flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading map…</span>
      </div>
    ),
  },
)

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface LocationEditorProps {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
  searchPlaceholder: string
  noResultsLabel: string
  latLabel: string
  lngLabel: string
}

export function LocationEditor({
  lat,
  lng,
  onChange,
  searchPlaceholder,
  noResultsLabel,
  latLabel,
  lngLabel,
}: LocationEditorProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Default position when none is set: Vienna
  const effectiveLat = lat ?? 48.2083
  const effectiveLng = lng ?? 16.3725

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) {
      setResults([])
      setShowResults(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/nominatim?q=${encodeURIComponent(val.trim())}`)
        const data: NominatimResult[] = await res.json()
        setResults(data)
        setShowResults(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
  }, [])

  function selectResult(result: NominatimResult) {
    const newLat = parseFloat(result.lat)
    const newLng = parseFloat(result.lon)
    onChange(newLat, newLng)
    setQuery(result.display_name)
    setResults([])
    setShowResults(false)
  }

  function handleMapMove(newLat: number, newLng: number) {
    onChange(newLat, newLng)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Address search */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent"
        />
        {searching && (
          <span className="absolute end-3 top-2.5 text-xs text-gray-400">…</span>
        )}
        {showResults && results.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  onClick={() => selectResult(r)}
                  className="w-full text-start px-3 py-2 text-sm hover:bg-gray-50 truncate"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {showResults && results.length === 0 && query.trim().length >= 3 && !searching && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
            {noResultsLabel}
          </div>
        )}
      </div>

      {/* Map */}
      <LocationEditorMap
        lat={effectiveLat}
        lng={effectiveLng}
        onMove={handleMapMove}
      />

      {/* Manual lat/lng inputs */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-gray-600">{latLabel}</label>
          <input
            type="number"
            step="any"
            value={lat ?? ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v)) onChange(v, effectiveLng)
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-600"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-gray-600">{lngLabel}</label>
          <input
            type="number"
            step="any"
            value={lng ?? ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v)) onChange(effectiveLat, v)
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-600"
          />
        </div>
      </div>
    </div>
  )
}
