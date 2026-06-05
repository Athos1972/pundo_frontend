'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { searchAll, searchProducts, getCategories, getRelatedCategories } from '@/lib/api'
import { trackPixelEvent, PixelEvents } from '@/lib/meta-pixel'
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
import { ContactCtaLink } from '@/components/contact/ContactCtaLink'
import { CategoryEmptyState } from '@/components/search/CategoryEmptyState'
import { SearchMapBottomSheet, type SheetSnap } from '@/components/map/SearchMapBottomSheet'
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

export default function SearchContent({ lang, initialCategoryId }: { lang: Lang; initialCategoryId?: string | null }) {
  const params = useSearchParams()
  const router = useRouter()
  const tr = t(lang)
  const location = useGeolocation()

  const q = params.get('q') ?? ''
  // Use initialCategoryId (from server) as fallback for the first render before
  // useSearchParams() resolves — prevents the hydration-race that shows the generic
  // empty state briefly on ?category_id= URLs.
  const rawCategoryId = params.get('category_id')
  const categoryId = rawCategoryId !== null ? rawCategoryId : (initialCategoryId ?? null)
  const isCategoryMode = categoryId !== null
  const available = params.get('available') === 'true'
  const withPrice = params.get('with_price') === '1'
  const maxDistKm = params.get('max_dist_km') ? Number(params.get('max_dist_km')) : DEFAULT_MAX_DIST_KM
  // True only when the user has explicitly moved the distance slider (URL param present).
  // In category/shop browse mode we skip the distance filter by default so all products in
  // the category are visible regardless of the user's location.
  const hasExplicitMaxDist = params.get('max_dist_km') !== null
  const includeOnline = params.get('include_online') !== '0'
  const shopId = params.get('shop_id')

  const [items, setItems] = useState<SearchResultItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [categoryName, setCategoryName] = useState<string | null>(null)
  const [relatedCategories, setRelatedCategories] = useState<import('@/types/api').CategoryItem[]>([])

  // Hover/highlight state for desktop list ↔ map pin connection
  const [hoveredShopId, setHoveredShopId] = useState<number | null>(null)
  // Pin-tap → scroll-to-card (mobile)
  const [pinnedShopId, setPinnedShopId] = useState<number | null>(null)
  // Bottom sheet snap state (mobile) — start at half so content is immediately visible
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('half')

  // Scroll containers
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)   // desktop
  const mobileScrollRef = useRef<HTMLDivElement | null>(null)      // mobile sheet

  // Refs to product card DOM nodes keyed by shop_id (for scroll-to-card on pin tap)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Map bounds for bbox-based provider_count (BB Q2: Map Viewport)
  const [mapBbox, _setMapBbox] = useState<string | undefined>(undefined)

  const load = useCallback(async (reset: boolean, currentOffset: number) => {
    // T4: In category or shop mode q is not required; otherwise require at least 2 chars
    if (!categoryId && !shopId && (!q || q.length < 2)) {
      setItems([])
      setTotal(0)
      return
    }
    setLoading(true)
    const newOffset = reset ? 0 : currentOffset
    try {
      if (categoryId) {
        // T2: Category mode — use searchProducts with category_id.
        // max_dist_km is only passed when the user has explicitly adjusted the slider;
        // without it the backend returns all products in the category regardless of distance,
        // matching the product_count shown in the category chip on the product page.
        const res = await searchProducts(
          {
            category_id: +categoryId,
            q: q || undefined,
            lat: location.lat,
            lng: location.lng,
            ...(hasExplicitMaxDist ? { max_dist_km: maxDistKm } : {}),
            limit: PAGE_SIZE,
            offset: newOffset,
          },
          lang
        )
        // T3: Map ProductListItem → SearchProductItem for the existing render pipeline
        setItems(prev => reset ? res.items.map(toSearchProductItem) : [...prev, ...res.items.map(toSearchProductItem)])
        setTotal(res.total)
        setOffset(newOffset + res.items.length)
      } else if (shopId) {
        // Shop mode — show all products of a specific shop (B5900-004)
        const res = await searchProducts(
          {
            shop_id: +shopId,
            q: q || undefined,
            lat: location.lat,
            lng: location.lng,
            ...(hasExplicitMaxDist ? { max_dist_km: maxDistKm } : {}),
            limit: PAGE_SIZE,
            offset: newOffset,
          },
          lang
        )
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
  }, [q, categoryId, shopId, location.lat, location.lng, mapBbox, lang, hasExplicitMaxDist, maxDistKm])

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
        const match = res.items.find(c => c.id === +categoryId!)
        if (!cancelled && match?.name) {
          setCategoryName(match.name)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [categoryId, lang])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0)
    setRelatedCategories([])
    load(true, 0)
  }, [q, categoryId, shopId, available, withPrice, maxDistKm, location.lat, location.lng, mapBbox]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear item refs when result set changes so stale shopId → DOM mappings don't linger
  useEffect(() => {
    itemRefs.current.clear()
  }, [q, categoryId, shopId])

  // Fire Meta Pixel Search event when query changes and results are loaded
  useEffect(() => {
    if (!q || loading) return
    trackPixelEvent(PixelEvents.Search, { search_string: q })
  }, [q, loading])

  const loadMore = useCallback(() => load(false, offset), [load, offset])
  const { sentinelRef, isSupported } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: items.length < total,
    isLoading: loading,
    rootRef: scrollContainerRef,
  })

  // Mobile infinite scroll: scroll-listener on the sheet's scroll container.
  // IntersectionObserver (above) only fires for the desktop panel; this covers mobile.
  useEffect(() => {
    const container = mobileScrollRef.current
    if (!container) return
    const hasMore = items.length < total
    if (!hasMore || loading) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollTop + clientHeight >= scrollHeight - 220) {
        loadMore()
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [mobileScrollRef, items.length, total, loading, loadMore])

  // Load related categories when in category mode and result is empty (AC3/F2350)
  useEffect(() => {
    if (!isCategoryMode || loading || items.length > 0) return
    if (!categoryId) return
    let cancelled = false
    getRelatedCategories(+categoryId, lang, 6)
      .then(res => {
        if (!cancelled) setRelatedCategories(res.items)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isCategoryMode, loading, items.length, categoryId, lang])

  function setParam(key: string, value: string | null) {
    const p = new URLSearchParams(params.toString())
    if (value === null) { p.delete(key) } else { p.set(key, value) }
    router.push(`${localePath(lang, '/search')}?${p}`)
  }

  // Pin-tap on mobile: expand sheet to half, scroll to matching product card, briefly highlight it
  const handlePinClick = useCallback((shopId: number) => {
    setHoveredShopId(shopId)
    setPinnedShopId(shopId)
    setSheetSnap('half')
    // Wait for snap animation (250ms) then scroll
    setTimeout(() => {
      const el = itemRefs.current.get(shopId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 280)
    // Remove highlight after card is visible
    setTimeout(() => {
      setPinnedShopId(null)
      setHoveredShopId(null)
    }, 1200)
  }, [])

  // Separate service and product results
  const serviceItems = items.filter(isServiceResult) as SearchServiceItem[]
  const productItems = items.filter(isProductResult) as SearchProductItem[]

  // Apply product-level filters (price, distance) — services are never filtered out
  const filteredProducts = withPrice
    ? productItems.filter(item => item.best_offer?.price_type === 'fixed')
    : productItems

  const localItems = filteredProducts.filter(item => !isOnlineOffer(item.best_offer))
    .filter(item => {
      // Skip distance filter in category/shop browse mode unless user explicitly set it.
      // Avoids hiding valid results when the backend returns products farther than the
      // 50 km default (e.g. a shop in Paphos when the default location is Larnaca).
      if ((isCategoryMode || !!shopId) && !hasExplicitMaxDist) return true
      return item.best_offer?.dist_km == null || item.best_offer.dist_km <= maxDistKm
    })
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

  const isEmpty = !loading && items.length === 0

  const displayCategoryName = categoryName

  // Announced to screen readers and browser agents when results change.
  const statusMessage = loading
    ? tr.search_loading ?? 'Loading…'
    : isEmpty
      ? tr.no_results
      : tr.search_result_count
        ? tr.search_result_count(total)
        : `${total} results`

  // Shared list content rendered inside both mobile sheet and desktop panel
  const listContent = (
    <>
      {/* Live region — announces result count / loading state to screen readers and browser agents */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </div>
      {/* Service results section — text mode only */}
      {!isCategoryMode && serviceItems.length > 0 && (
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
      {localItems.map(item => {
        const shopId = item.best_offer?.shop_id
        const hasLocation = !!item.best_offer?.shop_location
        return (
          <div
            key={`local-${item.id}`}
            ref={el => {
              if (shopId == null) return
              if (el) { itemRefs.current.set(shopId, el) } else { itemRefs.current.delete(shopId) }
            }}
          >
            <ProductCard
              item={item}
              lang={lang}
              variant="horizontal"
              shopId={hasLocation ? shopId : undefined}
              isHighlighted={pinnedShopId != null && shopId === pinnedShopId}
              onMouseEnterShop={setHoveredShopId}
              onMouseLeaveShop={() => setHoveredShopId(null)}
            />
          </div>
        )
      })}
      {!loading && localItems.length === 0 && (!isCategoryMode && serviceItems.length === 0) && (
        <p className="text-sm text-text-muted py-2">{tr.no_local_results}</p>
      )}

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

      {/* Category mode empty state */}
      {isCategoryMode && isEmpty && (
        <CategoryEmptyState relatedCategories={relatedCategories} lang={lang} />
      )}

      {/* Text mode empty state */}
      {!isCategoryMode && isEmpty && (
        <div className="py-8 space-y-6">
          <p className="text-center text-text-muted">{tr.no_results}</p>
          {q.length >= 2 && <ContactCtaLink variant="block" lang={lang} />}
        </div>
      )}
    </>
  )

  return (
    // flex-col + h-[100dvh]: the outer container fills the dynamic viewport exactly.
    // This replaces the old min-h-screen approach and eliminates all hardcoded pixel offsets.
    // Every child either shrinks to its natural height (shrink-0) or fills the rest (flex-1).
    <div className="flex flex-col bg-bg h-[100dvh]">

      {/* Sticky header — shrink-0 so it takes its natural height (variable: chips, slider) */}
      <div className="shrink-0 sticky top-0 z-20 bg-bg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <Link href={localePath(lang, '/')} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="m10 12-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {tr.home}
          </Link>
        </div>
        <SearchBar placeholder={tr.search_placeholder} defaultValue={q} lang={lang} />
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

      {/* MOBILE layout: flex-1 fills exactly whatever height the header leaves.
          No hardcoded px offset — works regardless of header height (chips, slider, etc.).
          Sheet height = container height − 60px → 60px of map permanently visible above sheet.
          This ensures the drag handle is ALWAYS accessible (never covered by header). */}
      <div className="md:hidden flex-1 min-h-0 relative overflow-hidden">
        {/* Map: full container background */}
        <div className="absolute inset-0 z-0">
          <ShopMap
            shops={mapShops}
            className="w-full h-full"
            lang={lang}
            highlightedShopId={hoveredShopId}
            onPinClick={handlePinClick}
          />
        </div>
        <SearchMapBottomSheet
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
          scrollContainerRef={mobileScrollRef}
          ariaLabel={tr.list_view}
        >
          {/* Category heading inside sheet so it adapts to the sheet's scroll */}
          {isCategoryMode && (
            <h1 className="text-lg font-semibold text-text rtl:text-end pt-1 pb-0.5">
              {displayCategoryName || tr.category_results_title}
            </h1>
          )}
          {listContent}
        </SearchMapBottomSheet>
      </div>

      {/* DESKTOP layout: flex-1 fills the rest, side-by-side split (unchanged behaviour) */}
      <div className="hidden md:flex flex-1 min-h-0">
        <div ref={scrollContainerRef} aria-busy={loading} className="w-[55%] overflow-y-auto px-4 pb-4 space-y-3 pt-3">
          {/* Category heading in desktop left panel */}
          {isCategoryMode && (
            <h1 className="text-lg font-semibold text-text rtl:text-end">
              {displayCategoryName || tr.category_results_title}
            </h1>
          )}
          {listContent}
        </div>
        <div className="flex flex-col w-[45%] p-4">
          <ShopMap
            shops={mapShops}
            className="w-full h-full rounded-xl overflow-hidden"
            lang={lang}
            highlightedShopId={hoveredShopId}
            onPinClick={handlePinClick}
          />
        </div>
      </div>
    </div>
  )
}
