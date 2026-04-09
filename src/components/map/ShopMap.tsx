'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet default icon (webpack issue)
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface ShopPin {
  id: number
  name: string
  lat: number
  lng: number
}

interface ShopMapProps {
  shops: ShopPin[]
  className?: string
  center?: [number, number]
  zoom?: number
  lang?: string
}

// Map OSM language codes — fall back to English for unsupported locales
const TILE_LANG: Record<string, string> = {
  de: 'de', en: 'en', ru: 'ru', ar: 'ar', he: 'he',
}

export function ShopMap({ shops, className = '', center, zoom = 13, lang = 'en' }: ShopMapProps) {
  const defaultCenter: [number, number] = center ?? (shops.length > 0 ? [shops[0].lat, shops[0].lng] : [34.9, 33.63])
  const tileUrl = `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
  const langCode = TILE_LANG[lang] ?? 'en'
  // Use Nominatim-style localised tiles via openstreetmap.fr/hot which respects Accept-Language
  // For proper i18n we use the CartoDB Voyager tiles which default to latin script
  const localizedUrl = langCode === 'en'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : tileUrl

  return (
    <div className={className} style={{ minHeight: '200px' }}>
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url={localizedUrl}
        />
        {shops.map(shop => (
          <Marker key={shop.id} position={[shop.lat, shop.lng]} icon={icon}>
            <Popup>{shop.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
