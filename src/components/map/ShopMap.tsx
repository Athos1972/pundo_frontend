'use client'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { t } from '@/lib/translations'
import { isRTL, Lang, DEFAULT_LANG } from '@/lib/lang'

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
  lang?: Lang
}

// Re-centers the map whenever center/zoom change (MapContainer ignores prop updates after mount)
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center[0], center[1], zoom]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// Map OSM language codes — fall back to English for unsupported locales
const TILE_LANG: Record<string, string> = {
  de: 'de', en: 'en', ru: 'ru', ar: 'ar', he: 'he',
}

export function ShopMap({ shops, className = '', center, zoom = 15, lang = DEFAULT_LANG }: ShopMapProps) {
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
        <ChangeView center={defaultCenter} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url={localizedUrl}
        />
        {shops.map(shop => (
          <Marker key={shop.id} position={[shop.lat, shop.lng]} icon={icon}>
            <Popup>
              <div dir={isRTL(lang) ? 'rtl' : 'ltr'} style={{ minWidth: '160px' }}>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>{shop.name}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>{t(lang).show_route}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${shop.name} – Google Maps`}
                    style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px' }}
                  >Google Maps</a>
                  <a
                    href={`https://maps.apple.com/?daddr=${shop.lat},${shop.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${shop.name} – Apple Maps`}
                    style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px' }}
                  >Apple Maps</a>
                  <a
                    href={`https://www.waze.com/ul?ll=${shop.lat},${shop.lng}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${shop.name} – Waze`}
                    style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px' }}
                  >Waze</a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
