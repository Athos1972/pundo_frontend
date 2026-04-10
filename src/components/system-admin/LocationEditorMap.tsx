'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)
// react-leaflet is a shared library (not customer/shop-admin code), so importing it is fine.

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's default icon broken by webpack/bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface DraggableMarkerProps {
  position: [number, number]
  onMove: (lat: number, lng: number) => void
}

function DraggableMarker({ position, onMove }: DraggableMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null)

  // Allow clicking on the map to move the pin
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng)
    },
  })

  return (
    <Marker
      position={position}
      icon={defaultIcon}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current
          if (marker) {
            const pos = marker.getLatLng()
            onMove(pos.lat, pos.lng)
          }
        },
      }}
    />
  )
}

interface LocationEditorMapProps {
  lat: number
  lng: number
  onMove: (lat: number, lng: number) => void
}

export function LocationEditorMap({ lat, lng, onMove }: LocationEditorMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      style={{ height: '300px', width: '100%', borderRadius: '8px' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DraggableMarker position={[lat, lng]} onMove={onMove} />
      <MapCenterUpdater lat={lat} lng={lng} />
    </MapContainer>
  )
}

// Re-centers the map when lat/lng props change (e.g. after Nominatim pick)
function MapCenterUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMapEvents({})
  const prevRef = useRef<[number, number]>([lat, lng])

  useEffect(() => {
    const [prevLat, prevLng] = prevRef.current
    if (prevLat !== lat || prevLng !== lng) {
      map.setView([lat, lng], map.getZoom())
      prevRef.current = [lat, lng]
    }
  }, [lat, lng, map])

  return null
}
