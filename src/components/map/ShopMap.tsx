'use client'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect, useLayoutEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { t } from '@/lib/translations'
import { isRTL, Lang, DEFAULT_LANG } from '@/lib/lang'
import { defaultMarkerIcon, highlightedMarkerIcon } from './markerIcons'

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
  highlightedShopId?: number | null
  onPinClick?: (shopId: number) => void
}

// Applies the best-fit view: explicit center/zoom take precedence, then auto-fit all pins
export function applyFit(
  map: L.Map,
  shops: ShopPin[],
  center?: [number, number],
  zoom?: number,
): void {
  if (center && zoom !== undefined) {
    map.setView(center, zoom)
    return
  }
  if (shops.length >= 2) {
    const bounds = L.latLngBounds(shops.map(s => [s.lat, s.lng]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  } else if (shops.length === 1) {
    map.setView([shops[0].lat, shops[0].lng], 15)
  }
  // 0 shops → no-op; MapContainer shows Larnaca fallback
}

interface FitBoundsProps {
  shops: ShopPin[]
  center?: [number, number]
  zoom?: number
}

// Fits the map to show all pins; re-fits when shops/center/zoom change or container becomes visible
function FitBounds({ shops, center, zoom }: FitBoundsProps) {
  const map = useMap()
  const fitRef = useRef({ shops, center, zoom })

  // Keep ref current so the ResizeObserver always sees fresh data
  useLayoutEffect(() => {
    fitRef.current = { shops, center, zoom }
  })

  // Stable key: only changes when the actual set of shops changes.
  // Using the array reference as a dep would re-fire on every SearchContent
  // render (mapShops is Array.from(...) → new ref each time), causing RAF
  // cleanup to cancel the call before it fires.
  const shopsKey = shops.map(s => s.id).join(',')

  useEffect(() => {
    // invalidateSize so fitBounds reads the correct container dimensions
    map.invalidateSize({ animate: false })
    applyFit(map, fitRef.current.shops, center, zoom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, shopsKey, center?.[0], center?.[1], zoom])

  useEffect(() => {
    const container = map.getContainer()
    let wasHidden = container.offsetWidth === 0
    const ro = new ResizeObserver(() => {
      if (wasHidden && container.offsetWidth > 0) {
        wasHidden = false
        map.invalidateSize()
        applyFit(map, fitRef.current.shops, fitRef.current.center, fitRef.current.zoom)
      } else if (container.offsetWidth === 0) {
        wasHidden = true
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [map])

  return null
}

// Map OSM language codes — fall back to English for unsupported locales
const TILE_LANG: Record<string, string> = {
  de: 'de', en: 'en', ru: 'ru', ar: 'ar', he: 'he',
}

export function ShopMap({ shops, className = '', center, zoom = 15, lang = DEFAULT_LANG, highlightedShopId, onPinClick }: ShopMapProps) {
  const defaultCenter: [number, number] = center ?? (shops.length > 0 ? [shops[0].lat, shops[0].lng] : [34.9, 33.63])
  const tileUrl = `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
  const langCode = TILE_LANG[lang] ?? 'en'
  // Use Nominatim-style localised tiles via openstreetmap.fr/hot which respects Accept-Language
  // For proper i18n we use the CartoDB Voyager tiles which default to latin script
  const localizedUrl = langCode === 'en'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : tileUrl

  return (
    <div className={`${className} min-h-[200px]`}>
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <FitBounds shops={shops} center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url={localizedUrl}
        />
        {shops.map(shop => (
          <Marker
            key={shop.id}
            position={[shop.lat, shop.lng]}
            icon={shop.id === highlightedShopId ? highlightedMarkerIcon : defaultMarkerIcon}
            eventHandlers={{ click: () => onPinClick?.(shop.id) }}
          >
            <Popup>
              <div dir={isRTL(lang) ? 'rtl' : 'ltr'} className="min-w-[160px]">
                <p className="font-semibold mb-1">{shop.name}</p>
                <p className="text-[11px] text-gray-500 mb-1.5">{t(lang).show_route}</p>
                <div className="flex flex-col gap-1">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${shop.name} – Google Maps`}
                    className="text-blue-600 no-underline text-[13px]"
                  >Google Maps</a>
                  <a
                    href={`https://maps.apple.com/?daddr=${shop.lat},${shop.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${shop.name} – Apple Maps`}
                    className="text-blue-600 no-underline text-[13px]"
                  >Apple Maps</a>
                  <a
                    href={`https://www.waze.com/ul?ll=${shop.lat},${shop.lng}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${shop.name} – Waze`}
                    className="text-blue-600 no-underline text-[13px]"
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
