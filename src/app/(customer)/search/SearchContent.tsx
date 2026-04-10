'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { searchProducts } from '@/lib/api'
import { getLangFromCookie } from '@/lib/lang'
import { t } from '@/lib/translations'
import { useGeolocation } from '@/lib/useGeolocation'
import type { ProductListItem } from '@/types/api'
import { SearchBar } from '@/components/search/SearchBar'
import { ProductCard } from '@/components/product/ProductCard'
import { FilterChips } from '@/components/search/FilterChips'
import { DistanceSlider } from '@/components/search/DistanceSlider'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const ShopMap = dynamic(() => import('@/components/map/ShopMap').then(m => ({ default: m.ShopMap })), {
  ssr: false,
  loading: () => <div className="w-full h-64 md:h-full bg-surface-alt animate-pulse rounded-xl" />,
})

const PAGE_SIZE = 20
const DEFAULT_MAX_DIST_KM = 50

/** Returns true if this offer is from an online-only retailer.
 *  Uses shop_type when available (backend field); falls back to dist_km === null
 *  as structural proxy until all shop records have shop_type set. */
function isOnlineOffer(offer: ProductListItem['best_offer']): boolean {
  if (!offer) return false
  if (offer.shop_type != null) return offer.shop_type === 'online_only'
  return offer.dist_km == null
}

export default function SearchContent() {
  const params = useSearchParams()
  const router = useRouter()
  const lang = getLangFromCookie()
  const tr = t(lang)
  const location = useGeolocation()

  const q = params.get('q') ?? ''
  const categoryId = params.get('category_id') ? Number(params.get('category_id')) : undefined
  const available = params.get('available') === 'true'
  const shopId = params.get('shop_id') ? Number(params.get('shop_id')) : undefined
  const withPrice = params.get('with_price') === '1'
  const maxDistKm = params.get('max_dist_km') ? Number(params.get('max_dist_km')) : DEFAULT_MAX_DIST_KM
  const includeOnline = params.get('include_online') !== '0'

  const [items, setItems] = useState<ProductListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')

  const load = useCallback(async (reset: boolean, currentOffset: number) => {
    setLoading(true)
    const newOffset = reset ? 0 : currentOffset
    try {
      const res = await searchProducts(
        {
          q,
          category_id: categoryId,
          available,
          shop_id: shopId,
          lat: location.lat,
          lng: location.lng,
          max_dist_km: maxDistKm,
          limit: PAGE_SIZE,
          offset: newOffset,
        },
        lang
      )
      setItems(prev => reset ? res.items : [...prev, ...res.items])
      setTotal(res.total)
      setOffset(newOffset + res.items.length)
    } catch {
      // keep existing
    } finally {
      setLoading(false)
    }
  }, [q, categoryId, available, shopId, location.lat, location.lng, maxDistKm, lang])

  useEffect(() => {
    setOffset(0)
    load(true, 0)
  }, [q, categoryId, available, shopId, withPrice, maxDistKm, location.lat, location.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  function setParam(key: string, value: string | null) {
    const p = new URLSearchParams(params.toString())
    if (value === null) { p.delete(key) } else { p.set(key, value) }
    router.push(`/search?${p}`)
  }

  const allFiltered = withPrice ? items.filter(item => item.best_offer?.price_type === 'fixed') : items

  // Split into local and online sections
  const localItems = allFiltered.filter(item => !isOnlineOffer(item.best_offer))
    .filter(item => item.best_offer?.dist_km == null || item.best_offer.dist_km <= maxDistKm)
  const onlineItems = allFiltered.filter(item => isOnlineOffer(item.best_offer))

  const mapShops = Array.from(
    new Map(
      localItems
        .filter(i => i.best_offer?.shop_location)
        .map(i => [i.best_offer!.shop_id, {
          id: i.best_offer!.shop_id,
          name: i.best_offer!.shop_name,
          lat: i.best_offer!.shop_location!.lat,
          lng: i.best_offer!.shop_location!.lng,
        }])
    ).values()
  )

  return (
    <div className="min-h-screen bg-bg">
      <div className="sticky top-0 z-[9999] bg-bg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="m10 12-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {tr.home}
          </Link>
        </div>
        <SearchBar placeholder={tr.search_placeholder} defaultValue={q} />
        <FilterChips
          available={available}
          onAvailableChange={v => setParam('available', v ? 'true' : null)}
          withPrice={withPrice}
          onWithPriceChange={v => setParam('with_price', v ? '1' : null)}
          includeOnline={includeOnline}
          onIncludeOnlineChange={v => setParam('include_online', v ? null : '0')}
          lang={lang}
        />
        <DistanceSlider
          value={maxDistKm}
          onChange={v => setParam('max_dist_km', v === DEFAULT_MAX_DIST_KM ? null : String(v))}
          lang={lang}
        />
      </div>

      {/* Mobile toggle */}
      <div className="flex md:hidden gap-2 px-4 py-3">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mobileView === 'list' ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted'}`}
        >
          {tr.list_view}
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mobileView === 'map' ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted'}`}
        >
          {tr.map_view}
        </button>
      </div>

      {/* Desktop: side by side. Mobile: toggled */}
      <div className="flex h-[calc(100vh-160px)]">
        <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[55%] overflow-y-auto px-4 pb-4 gap-3 pt-3`}>

          {/* Local shops section */}
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider pt-1">{tr.local_shops}</h2>
          {localItems.map(item => <ProductCard key={item.id} item={item} lang={lang} />)}
          {!loading && localItems.length === 0 && (
            <p className="text-sm text-text-muted py-2">{tr.no_local_results}</p>
          )}

          {/* Online retailers section */}
          {includeOnline && onlineItems.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider pt-3">{tr.online_retailers}</h2>
              {onlineItems.map(item => <ProductCard key={item.id} item={item} lang={lang} />)}
            </>
          )}

          {loading && [1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-alt rounded-xl animate-pulse" />)}

          {!loading && items.length < total && (
            <button
              onClick={() => load(false, offset)}
              className="w-full py-3 bg-surface border border-border rounded-xl text-text-muted hover:border-accent hover:text-accent transition-colors text-sm font-medium"
            >
              {tr.load_more} ({total - items.length})
            </button>
          )}
          {!loading && items.length === 0 && (
            <p className="text-center text-text-muted py-12">{tr.no_results}</p>
          )}
        </div>
        <div className={`${mobileView === 'map' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[45%] p-4`}>
          <ShopMap
            shops={mapShops}
            className="w-full h-full rounded-xl overflow-hidden"
            lang={lang}
          />
        </div>
      </div>
    </div>
  )
}
