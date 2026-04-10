'use client'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { searchProducts, getCategories, getShops } from '@/lib/api'
import { getLangFromCookie } from '@/lib/lang'
import { t } from '@/lib/translations'
import type { ProductListItem, CategoryItem, ShopListItem } from '@/types/api'
import { fmtPrice } from '@/lib/utils'

interface Props {
  placeholder: string
  defaultValue?: string
}

interface SuggestionGroup {
  categories: CategoryItem[]
  shops: ShopListItem[]
  products: ProductListItem[]
}

export function SearchBar({ placeholder, defaultValue = '' }: Props) {
  const router = useRouter()
  const lang = getLangFromCookie()
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<SuggestionGroup>({ categories: [], shops: [], products: [] })
  const [open, setOpen] = useState(false)
  // activeIdx counts across all sections in display order:
  //   categories → shops → products
  const [activeIdx, setActiveIdx] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setSuggestions({ categories: [], shops: [], products: [] }); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const [prodRes, catRes, shopRes] = await Promise.all([
          searchProducts({ q, limit: 5 }, lang),
          getCategories({ q, limit: 4, only_with_products: true }, lang),
          getShops({ q, limit: 3 }, lang),
        ])
        const next = {
          categories: catRes.items,
          shops: shopRes.items,
          products: prodRes.items,
        }
        setSuggestions(next)
        setOpen(next.categories.length > 0 || next.shops.length > 0 || next.products.length > 0)
        setActiveIdx(-1)
      } catch {
        setSuggestions({ categories: [], shops: [], products: [] })
        setOpen(false)
      }
    }, 300)
  }, [lang])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)
    fetchSuggestions(v)
  }

  function navigateProduct(slug: string) {
    setOpen(false)
    router.push(`/products/${slug}`)
  }

  function navigateCategory(id: number) {
    setOpen(false)
    router.push(`/search?category_id=${id}`)
  }

  function navigateShop(slug: string) {
    setOpen(false)
    router.push(`/shops/${slug}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOpen(false)
    if (value.trim()) router.push(`/search?q=${encodeURIComponent(value.trim())}`)
  }

  const catCount = suggestions.categories.length
  const shopCount = suggestions.shops.length
  const prodCount = suggestions.products.length
  const totalItems = catCount + shopCount + prodCount

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      if (activeIdx < catCount) {
        navigateCategory(suggestions.categories[activeIdx].id)
      } else if (activeIdx < catCount + shopCount) {
        navigateShop(suggestions.shops[activeIdx - catCount].slug)
      } else {
        navigateProduct(suggestions.products[activeIdx - catCount - shopCount].slug)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIdx(-1)
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const hasCategories = catCount > 0
  const hasShops = shopCount > 0
  const hasProducts = prodCount > 0

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          type="search"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => (hasCategories || hasShops || hasProducts) && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full h-14 pl-5 pr-14 rounded-xl border border-border bg-surface text-text placeholder-text-light text-base shadow-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
          style={{ colorScheme: 'light' }}
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-accent rounded-lg flex items-center justify-center hover:bg-accent-dark transition-colors"
          aria-label="Search"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </form>

      {open && (hasCategories || hasShops || hasProducts) && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg overflow-hidden">

          {/* ── Kategorien ── */}
          {hasCategories && (
            <>
              <li className="px-4 py-1.5 bg-surface-alt border-b border-border">
                <span className="text-[10px] uppercase tracking-widest font-medium text-text-muted">Kategorien</span>
              </li>
              {suggestions.categories.map((cat, idx) => (
                <li key={`cat-${cat.id}`}>
                  <button
                    onMouseDown={() => navigateCategory(cat.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border last:border-0 ${
                      idx === activeIdx ? 'bg-accent-light' : 'hover:bg-surface-alt'
                    }`}
                  >
                    {/* Folder icon */}
                    <div className="w-8 h-8 flex-shrink-0 bg-accent-light rounded-lg flex items-center justify-center">
                      <svg viewBox="0 0 16 16" className="w-4 h-4 text-accent" fill="none">
                        <path d="M2 4a1 1 0 0 1 1-1h3.5l1 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4Z" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{cat.name ?? cat.external_id}</p>
                      {cat.child_count > 0 && (
                        <p className="text-xs text-text-muted">{t(lang).subcategories(cat.child_count)}</p>
                      )}
                    </div>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-text-light flex-shrink-0" fill="none">
                      <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </li>
              ))}
            </>
          )}

          {/* ── Shops ── */}
          {hasShops && (
            <>
              <li className={`px-4 py-1.5 bg-surface-alt border-b border-border ${hasCategories ? 'border-t' : ''}`}>
                <span className="text-[10px] uppercase tracking-widest font-medium text-text-muted">Shops</span>
              </li>
              {suggestions.shops.map((shop, idx) => {
                const globalIdx = catCount + idx
                const subtitle =
                  shop.dist_km != null
                    ? `${shop.dist_km.toFixed(1)} km`
                    : shop.address_raw ?? null
                return (
                  <li key={`shop-${shop.id}`}>
                    <button
                      onMouseDown={() => navigateShop(shop.slug)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border last:border-0 ${
                        globalIdx === activeIdx ? 'bg-accent-light' : 'hover:bg-surface-alt'
                      }`}
                    >
                      {/* Storefront icon */}
                      <div className="w-8 h-8 flex-shrink-0 bg-accent-light rounded-lg flex items-center justify-center">
                        <svg viewBox="0 0 16 16" className="w-4 h-4 text-accent" fill="none">
                          <path d="M2 6 3 3h10l1 3M2 6v7h12V6M2 6h12M6 13V9h4v4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{shop.name ?? shop.slug}</p>
                        {subtitle && <p className="text-xs text-text-muted truncate">{subtitle}</p>}
                      </div>
                      <svg viewBox="0 0 16 16" className="w-4 h-4 text-text-light flex-shrink-0" fill="none">
                        <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </li>
                )
              })}
            </>
          )}

          {/* ── Produkte ── */}
          {hasProducts && (
            <>
              <li className={`px-4 py-1.5 bg-surface-alt border-b border-border ${(hasCategories || hasShops) ? 'border-t' : ''}`}>
                <span className="text-[10px] uppercase tracking-widest font-medium text-text-muted">Produkte</span>
              </li>
              {suggestions.products.map((item, idx) => {
                const globalIdx = catCount + shopCount + idx
                const offer = item.best_offer
                return (
                  <li key={`prod-${item.id}`}>
                    <button
                      onMouseDown={() => navigateProduct(item.slug)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        globalIdx === activeIdx ? 'bg-accent-light' : 'hover:bg-surface-alt'
                      } ${idx > 0 ? 'border-t border-border' : ''}`}
                    >
                      <div className="w-8 h-8 flex-shrink-0 bg-surface-alt rounded-lg flex items-center justify-center overflow-hidden">
                        {item.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{item.name ?? item.slug}</p>
                        {item.brand && <p className="text-xs text-text-muted">{item.brand}</p>}
                      </div>
                      {offer && (
                        <span className="flex-shrink-0 text-sm font-bold text-accent">
                          {fmtPrice(offer.price)} {offer.currency}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </>
          )}

          {/* ── Footer ── */}
          <li className="border-t border-border">
            <button
              onMouseDown={(e) => handleSubmit(e as unknown as React.FormEvent)}
              className="w-full px-4 py-2.5 text-xs text-text-muted hover:text-accent hover:bg-surface-alt transition-colors text-left"
            >
              Alle Ergebnisse für &bdquo;{value}&ldquo; →
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
