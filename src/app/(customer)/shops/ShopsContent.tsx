'use client'
import { useEffect, useRef, useState } from 'react'
import { getShops } from '@/lib/api'
import type { ShopListItem, ShopTypeRead } from '@/types/api'
import { t } from '@/lib/translations'
import { ShopCard } from '@/components/shop/ShopCard'

// Larnaca city centre — fallback when geolocation is unavailable
const LARNACA = { lat: 34.9009, lng: 33.6230 }
const MAX_DIST_KM = 25   // slider max / "no filter" sentinel
const SPOKEN_LANGS = ['EL', 'EN', 'DE', 'RU', 'AR', 'HE'] as const

type Coords = { lat: number; lng: number }

const CHIP_BASE = 'flex-shrink-0 text-sm px-3 py-1 rounded-full border transition-colors'
const CHIP_ON   = 'bg-accent text-white border-accent'
const CHIP_OFF  = 'bg-surface border-border text-text-muted hover:border-accent'

export function ShopsContent({ lang }: { lang: string }) {
  const tr = t(lang)

  // Geolocation
  const [coords, setCoords] = useState<Coords | null>(null)
  const geoResolved = useRef(false)

  // Filter state
  const [shopTypeId, setShopTypeId] = useState<number | null>(null)
  const [openNow, setOpenNow] = useState(false)
  const [maxDist, setMaxDist] = useState(MAX_DIST_KM)
  const [hasParking, setHasParking] = useState(false)
  const [hasDelivery, setHasDelivery] = useState(false)
  const [isOnlineOnly, setIsOnlineOnly] = useState(false)
  const [langFilter, setLangFilter] = useState<string[]>([])

  // Data
  const [shops, setShops] = useState<ShopListItem[]>([])
  const [allShopTypes, setAllShopTypes] = useState<ShopTypeRead[]>([])
  const seenTypeIds = useRef(new Set<number>())
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ── Geolocation (runs once) ──────────────────────────────────────────────────
  useEffect(() => {
    function applyCoords(lat: number, lng: number) {
      if (!geoResolved.current) {
        geoResolved.current = true
        setCoords({ lat, lng })
      }
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => applyCoords(pos.coords.latitude, pos.coords.longitude),
        () => applyCoords(LARNACA.lat, LARNACA.lng),
        { timeout: 5000 }
      )
    } else {
      applyCoords(LARNACA.lat, LARNACA.lng)
    }
  }, [])

  // ── Fetch shops when coords or filters change ────────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrorMsg(null)

    const params: Parameters<typeof getShops>[0] = {
      limit: 50,
      status: 'active',
      ...(coords && { lat: coords.lat, lng: coords.lng }),
      ...(shopTypeId != null && { shop_type_id: shopTypeId }),
      ...(openNow && { open_now: true }),
      ...(coords && maxDist < MAX_DIST_KM && { max_dist_km: maxDist }),
      ...(hasParking && { has_parking: true }),
      ...(hasDelivery && { has_own_delivery: true }),
      ...(isOnlineOnly && { is_online_only: true }),
      ...(langFilter.length > 0 && { spoken_languages: langFilter.join(',') }),
    }

    getShops(params, lang)
      .then(res => {
        setShops(res.items)
        // Accumulate shop types — never shrink the list
        const newTypes: ShopTypeRead[] = []
        for (const s of res.items) {
          if (s.shop_type && !seenTypeIds.current.has(s.shop_type.id)) {
            seenTypeIds.current.add(s.shop_type.id)
            newTypes.push(s.shop_type)
          }
        }
        if (newTypes.length > 0) {
          setAllShopTypes(prev => [...prev, ...newTypes])
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }, [coords, shopTypeId, openNow, maxDist, hasParking, hasDelivery, isOnlineOnly, langFilter, lang])

  // ── Helper: type display name ─────────────────────────────────────────────────
  function typeLabel(st: ShopTypeRead): string {
    return st.translations[lang as keyof typeof st.translations] ?? st.canonical
  }

  function toggleLang(code: string) {
    setLangFilter(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Filter bar ── */}
      <div className="space-y-3">

        {/* Shop-type pills */}
        {allShopTypes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 rtl:flex-row-reverse scrollbar-hide">
            <button
              onClick={() => setShopTypeId(null)}
              className={`${CHIP_BASE} ${shopTypeId === null ? CHIP_ON : CHIP_OFF}`}
            >
              {tr.filter_all}
            </button>
            {allShopTypes.map(st => (
              <button
                key={st.id}
                onClick={() => setShopTypeId(st.id === shopTypeId ? null : st.id)}
                className={`${CHIP_BASE} ${shopTypeId === st.id ? CHIP_ON : CHIP_OFF}`}
              >
                {typeLabel(st)}
              </button>
            ))}
          </div>
        )}

        {/* Open-now + boolean filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 rtl:flex-row-reverse scrollbar-hide">
          <button
            onClick={() => setOpenNow(v => !v)}
            className={`${CHIP_BASE} ${openNow ? 'bg-green-600 text-white border-green-600' : CHIP_OFF}`}
          >
            {tr.shop_open_now}
          </button>
          <button
            onClick={() => setHasParking(v => !v)}
            className={`${CHIP_BASE} ${hasParking ? CHIP_ON : CHIP_OFF}`}
          >
            {tr.filter_has_parking}
          </button>
          <button
            onClick={() => setHasDelivery(v => !v)}
            className={`${CHIP_BASE} ${hasDelivery ? CHIP_ON : CHIP_OFF}`}
          >
            {tr.filter_has_delivery}
          </button>
          <button
            onClick={() => setIsOnlineOnly(v => !v)}
            className={`${CHIP_BASE} ${isOnlineOnly ? CHIP_ON : CHIP_OFF}`}
          >
            {tr.filter_online_only}
          </button>
        </div>

        {/* Spoken-language multi-select chips */}
        <div data-testid="spoken-lang-filter" className="flex gap-2 overflow-x-auto pb-1 rtl:flex-row-reverse scrollbar-hide">
          {SPOKEN_LANGS.map(code => (
            <button
              key={code}
              onClick={() => toggleLang(code)}
              className={`${CHIP_BASE} ${langFilter.includes(code) ? CHIP_ON : CHIP_OFF}`}
            >
              {code}
            </button>
          ))}
        </div>

        {/* Distance slider — disabled until geolocation resolves */}
        <label className="flex items-center gap-2 text-sm text-text-muted min-w-0">
          <span className="flex-shrink-0">{tr.distance_label}:</span>
          <input
            type="range"
            min={0.5}
            max={MAX_DIST_KM}
            step={0.5}
            value={maxDist}
            disabled={!coords}
            onChange={e => setMaxDist(Number(e.target.value))}
            className="w-28 accent-accent disabled:opacity-40"
            aria-label={tr.distance_label}
          />
          <span className="flex-shrink-0 w-14 text-text tabular-nums">
            {maxDist < MAX_DIST_KM ? tr.distance_km(maxDist) : `≤ ${MAX_DIST_KM} km`}
          </span>
        </label>
      </div>

      {/* ── Shop list ── */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-surface-alt rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && errorMsg && (
        <p className="text-sm text-text-muted py-4">
          {tr.backend_unreachable}{' '}
          <span className="text-text-light text-xs font-mono">{errorMsg}</span>
        </p>
      )}

      {!loading && !errorMsg && shops.length === 0 && (
        <p className="text-sm text-text-muted py-4">{tr.shops_empty}</p>
      )}

      {!loading && !errorMsg && shops.length > 0 && (
        <div className="flex flex-col gap-3">
          {shops.map(shop => (
            <ShopCard key={shop.id} shop={shop} lang={lang} />
          ))}
        </div>
      )}
    </div>
  )
}
