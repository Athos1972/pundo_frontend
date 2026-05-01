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

interface Props {
  pin: [number, number] | null
  onPinDrop: (lat: number, lng: number) => void
}

function ClickHandler({ onPinDrop }: { onPinDrop: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPinDrop(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function RecenterOnPin({ pin }: { pin: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (pin) map.setView(pin, map.getZoom())
  }, [pin?.[0], pin?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

const DEFAULT_CENTER: [number, number] = [34.9, 33.63] // Cyprus

export function OnboardingMapInner({ pin, onPinDrop }: Props) {
  return (
    <MapContainer
      center={pin ?? DEFAULT_CENTER}
      zoom={13}
      style={{ height: '220px', width: '100%', borderRadius: '12px', cursor: 'crosshair' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <ClickHandler onPinDrop={onPinDrop} />
      <RecenterOnPin pin={pin} />
      {pin && <Marker position={pin} icon={icon} />}
    </MapContainer>
  )
}
