'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { searchAll, searchProducts, getCategories } from '@/lib/api'
import { t } from '@/lib/translations'
import type { Lang } from '@/lib/lang'
import { useGeolocation } from '@/lib/useGeolocation'
import type { SearchResultItem, SearchServiceItem, SearchProductItem, ProductListItem } from '@/types/api'
import { isServiceResult, isProductResult } from '@/types/api'
import { useInfiniteScroll } from '@/lib/useInfiniteScroll'
import { SearchBar } from '@/components/search/SearchBar'
import { ServiceResultCard } from '@/components/search/ServiceResultCard'
import { ProductCard } from '@/components/product/ProductCard'
import { FilterChips } from '@/components/search/FilterChips'
import { DistanceSlider } from '@/components/search/DistanceSlider'
import { localePath } from '@/lib/routing'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const ShopMap = dynamic(() => import('@/components/map/ShopMap').then(m => ({ default: m.ShopMap })), {
  ssr: false,
  loading: () => <div className="w-full h-64 md:h-full bg-surface-alt animate-pulse rounded-xl" />,
})

const PAGE_SIZE = 20
const DEFAULT_MAX_DIST_KM = 50

/** Returns true if this offer is from an online-only retailer. */
function isOnlineOffer(offer: SearchProductItem['best_offer']): boolean {
  if (!offer) return false
  if (offer.shop_type != null) return offer.shop_type === 'online_only'
  return offer.dist_km == null
}

/** Maps a ProductListItem to SearchProductItem so the existing render pipeline works. */
function toSearchProductItem(p: ProductListItem): SearchProductItem {
  return { ...p, result_type: 'product', score: 0 }
}

export default function SearchContent({ lang }: { lang: Lang }) {
  const params = useSearchParams()
  const router = useRouter()
  const tr = t(lang)
  const location = useGeolocation()

  const q = params.get('q') ?? ''
  const categoryId = params.get('category_id')
  const available = params.get('available') === 'true'
  const withPrice = params.get('with_price') === '1'
  const maxDistKm = params.get('max_dist_km') ? Number(params.get('max_dist_km')) : DEFAULT_MAX_DIST_KM
  const includeOnline = params.get('include_online') !== '0'

  const [items, setItems] = useState<SearchResultItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [categoryName, setCategoryName] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Map bounds for bbox-based provider_count (BB Q2: Map Viewport)
  // We track the map bounds in state and pass them as bbox to searchAll.
  // When map not yet loaded → bbox=undefined → backend falls back to Cyprus-wide count.
  const [mapBbox, setMapBbox] = useState<string | undefined>(undefined)

  const load = useCallback(async (reset: boolean, currentOffset: number) => {
    // T4: In category mode q is not required; otherwise require at least 2 chars
    if (!categoryId && (!q || q.length < 2)) {
      setItems([])
      setTotal(0)
      return
    }
    setLoading(true)
    const newOffset = reset ? 0 : currentOffset
    try {
      if (categoryId) {
        // T2: Category mode — use searchProducts with category_id
        const res = await searchProducts(
          {
            category_id: +categoryId,
            q: q || undefined,
            lat: location.lat,
            lng: location.lng,
            limit: PAGE_SIZE,
            offset: newOffset,
          },
          lang
        )
        // T3: Map ProductListItem → SearchProductItem for the existing render pipeline
        setItems(prev => reset ? res.items.map(toSearchProductItem) : [...prev, ...res.items.map(toSearchProductItem)])
        setTotal(res.total)
        setOffset(newOffset + res.items.length)
      } else {
        // Existing search mode
        const res = await searchAll(
          {
            q,
            lat: location.lat,
            lng: location.lng,
            bbox: mapBbox,
            limit: PAGE_SIZE,
            offset: newOffset,
          },
          lang
        )
        setItems(prev => reset ? res.items : [...prev, ...res.items])
        setTotal(res.total)
        setOffset(newOffset + res.items.length)
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false)
    }
  }, [q, categoryId, location.lat, location.lng, mapBbox, lang])

  // T5: Load category name when categoryId is set (non-blocking, with fallback)
  useEffect(() => {
    if (!categoryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryName(null)
      return
    }
    let cancelled = false
    getCategories({ ids: [+categoryId] }, lang)
      .then(res => {
        if (!cancelled && res.items.length > 0 && res.items[0].name) {
          setCategoryName(res.items[0].name)
        }
        // If no items or no name (B1 not yet deployed), fallback stays null → show generic title
      })
      .catch(() => {
        // Backend B1 not yet deployed — silently fall back to generic title
      })
    return () => { cancelled = true }
  }, [categoryId, lang])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0)
    load(true, 0)
  }, [q, categoryId, available, withPrice, maxDistKm, location.lat, location.lng, mapBbox]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => load(false, offset), [load, offset])
  const { sentinelRef, isSupported } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: items.length < total,
    isLoading: loading,
    rootRef: scrollContainerRef,
  })

  function setParam(key: string, value: string | null) {
    const p = new URLSearchParams(params.toString())
    if (value === null) { p.delete(key) } else { p.set(key, value) }
    router.push(`${localePath(lang, '/search')}?${p}`)
  }

  // Separate service and product results
  const serviceItems = items.filter(isServiceResult) as SearchServiceItem[]
  const productItems = items.filter(isProductResult) as SearchProductItem[]

  // Apply product-level filters (price, distance) — services are never filtered out
  const filteredProducts = withPrice
    ? productItems.filter(item => item.best_offer?.price_type === 'fixed')
    : productItems

  const localItems = filteredProducts.filter(item => !isOnlineOffer(item.best_offer))
    .filter(item => item.best_offer?.dist_km == null || item.best_offer.dist_km <= maxDistKm)
  const onlineItems = filteredProducts.filter(item => isOnlineOffer(item.best_offer))

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

  // T7: Determine empty-state message
  const isEmpty = !loading && items.length === 0
  const emptyMessage = categoryId ? tr.category_no_results : tr.no_results

  return (
    <div className="min-h-screen bg-bg">
      <div className="sticky top-0 z-[9999] bg-bg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <Link href={localePath(lang, '/')} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent transition-colors flex-shrink-0">
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
        <div ref={scrollContainerRef} className={`${mobileView === 'list' ? 'block' : 'hidden'} md:block w-full md:w-[55%] overflow-y-auto px-4 pb-4 space-y-3 pt-3`}>

          {/* T5: Category context heading */}
          {categoryId && (
            <h1 className="text-lg font-semibold text-text rtl:text-end">
              {categoryName ?? tr.category_results_title}
            </h1>
          )}

          {/* Service results section — always first (highest visibility per arch T13) */}
          {serviceItems.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider pt-1 rtl:text-end">
                {tr.result_service_badge}
              </h2>
              {serviceItems.map(item => (
                <ServiceResultCard key={`service-${item.category_id}`} item={item} lang={lang} />
              ))}
            </>
          )}

          {/* Local shops section */}
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider pt-1 rtl:text-end">{tr.local_shops}</h2>
          {localItems.map(item => <ProductCard key={`local-${item.id}`} item={item} lang={lang} variant="horizontal" />)}
          {!loading && localItems.length === 0 && serviceItems.length === 0 && (
            <p className="text-sm text-text-muted py-2">{tr.no_local_results}</p>
          )}
          {!loading && localItems.length === 0 && serviceItems.length > 0 && null}

          {/* Online retailers section */}
          {includeOnline && onlineItems.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider pt-3 rtl:text-end">{tr.online_retailers}</h2>
              {onlineItems.map(item => <ProductCard key={`online-${item.id}`} item={item} lang={lang} variant="horizontal" />)}
            </>
          )}

          {loading && [1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-alt rounded-xl animate-pulse" />)}

          {isSupported && <div ref={sentinelRef} aria-hidden="true" />}

          {!isSupported && !loading && items.length < total && (
            <button
              onClick={() => load(false, offset)}
              className="w-full py-3 bg-surface border border-border rounded-xl text-text-muted hover:border-accent hover:text-accent transition-colors text-sm font-medium"
            >
              {tr.load_more} ({total - items.length})
            </button>
          )}
          {/* T7: Show category-specific empty state message when in category mode */}
          {isEmpty && (
            <p className="text-center text-text-muted py-12">{emptyMessage}</p>
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
