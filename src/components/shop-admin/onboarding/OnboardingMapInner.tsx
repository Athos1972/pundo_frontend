'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// ─── Zoom constants ───────────────────────────────────────────────────────────
export const ZOOM_OVERVIEW = 9   // GPS denied / timeout — country/region overview
export const ZOOM_FALLBACK = 13  // GPS granted but inaccurate (accuracy > 1000m)
export const ZOOM_STREET = 17    // GPS precise / draft-pin / address search result

export type PinSource = 'click' | 'search' | 'gps' | 'initial' | null

interface Props {
  pin: [number, number] | null
  pinSource: PinSource
  initialCenter: [number, number] | null
  initialZoom: number
  onPinDrop: (lat: number, lng: number) => void
}

const DEFAULT_CENTER: [number, number] = [34.9, 33.63] // Cyprus

function ClickHandler({ onPinDrop }: { onPinDrop: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPinDrop(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function RecenterOnPinOrCenter({
  pin,
  pinSource,
  initialCenter,
  initialZoom,
}: {
  pin: [number, number] | null
  pinSource: PinSource
  initialCenter: [number, number] | null
  initialZoom: number
}) {
  const map = useMap()

  // React on pin changes
  useEffect(() => {
    if (!pin) return
    if (pinSource === 'search' || pinSource === 'gps' || pinSource === 'initial') {
      map.setView(pin, ZOOM_STREET)
    } else if (pinSource === 'click') {
      // Keep the zoom the owner chose — only pan to pin
      map.setView(pin, map.getZoom())
    }
    // pinSource === null: no action (initial render without pin)
  }, [pin?.[0], pin?.[1], pinSource]) // eslint-disable-line react-hooks/exhaustive-deps

  // React on initialCenter changes (no pin set — GPS granted without placing pin)
  useEffect(() => {
    if (pin) return // pin takes priority
    if (initialCenter) {
      map.setView(initialCenter, initialZoom)
    }
  }, [initialCenter?.[0], initialCenter?.[1], initialZoom]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export function OnboardingMapInner({
  pin,
  pinSource,
  initialCenter,
  initialZoom,
  onPinDrop,
}: Props) {
  const mapCenter = pin ?? initialCenter ?? DEFAULT_CENTER

  return (
    <MapContainer
      center={mapCenter}
      zoom={initialZoom}
      style={{ height: '220px', width: '100%', borderRadius: '12px', cursor: 'crosshair' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <ClickHandler onPinDrop={onPinDrop} />
      <RecenterOnPinOrCenter
        pin={pin}
        pinSource={pinSource}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
      />
      {pin && <Marker position={pin} icon={icon} />}
    </MapContainer>
  )
}
