'use client'
// Clean Boundary: only imports from src/components/ui/, @/lib/shop-admin-*, @/types/shop-admin

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { tAdmin } from '@/lib/shop-admin-translations'
import { ItemCreateForm } from './ItemCreateForm'
import type { ItemSearchResult } from '@/types/shop-admin'

interface ItemPickerModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called when user selects or creates an item. shopListingId is set when a ShopListing was already created. */
  onSelect: (item: ItemSearchResult, shopListingId?: number) => void
  lang: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function ItemPickerModal({ isOpen, onClose, onSelect, lang }: ItemPickerModalProps) {
  const tr = tAdmin(lang)
  const [ean, setEan] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ItemSearchResult[]>([])
  const [loadingEan, setLoadingEan] = useState(false)
  const [loadingQuery, setLoadingQuery] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [fuzzyMatches, setFuzzyMatches] = useState<ItemSearchResult[]>([])
  const [eanMatch, setEanMatch] = useState<ItemSearchResult | null>(null)

  const debouncedEan = useDebounce(ean, 100)
  const debouncedQuery = useDebounce(query, 300)

  const firstInputRef = useRef<HTMLInputElement>(null)

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Reset state on close
  useEffect(() => {
    if (isOpen) return
    const timer = setTimeout(() => {
      setEan('')
      setQuery('')
      setResults([])
      setEanMatch(null)
      setShowCreateForm(false)
      setFuzzyMatches([])
    }, 0)
    return () => clearTimeout(timer)
  }, [isOpen])

  // EAN search (debounced 100ms)
  useEffect(() => {
    if (!debouncedEan || debouncedEan.length < 8) {
      const timer = setTimeout(() => setEanMatch(null), 0)
      return () => clearTimeout(timer)
    }
    let cancelled = false
    const timer = setTimeout(() => { if (!cancelled) setLoadingEan(true) }, 0)
    fetch(`/api/shop-admin/items?ean=${encodeURIComponent(debouncedEan)}&limit=1`, {
      headers: { 'Accept-Language': lang },
    })
      .then((r) => r.json())
      .then((d: unknown) => {
        if (cancelled) return
        const data = d as { items?: ItemSearchResult[] }
        const items = Array.isArray(d) ? d as ItemSearchResult[] : (data.items ?? [])
        setEanMatch(items[0] ?? null)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingEan(false) })
    return () => { cancelled = true; clearTimeout(timer) }
  }, [debouncedEan, lang])

  // Text search (debounced 300ms)
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      const timer = setTimeout(() => { setResults([]); setFuzzyMatches([]) }, 0)
      return () => clearTimeout(timer)
    }
    let cancelled = false
    const timer = setTimeout(() => { if (!cancelled) setLoadingQuery(true) }, 0)
    fetch(`/api/shop-admin/items?q=${encodeURIComponent(debouncedQuery.trim())}&limit=10`, {
      headers: { 'Accept-Language': lang },
    })
      .then((r) => r.json())
      .then((d: unknown) => {
        if (cancelled) return
        const data = d as { items?: ItemSearchResult[]; fuzzy_matches?: ItemSearchResult[] }
        const items = Array.isArray(d) ? d as ItemSearchResult[] : (data.items ?? [])
        const directIds = new Set(items.map((i) => i.id))
        const fuzzy = (data.fuzzy_matches ?? []).filter((i) => !directIds.has(i.id))
        setResults(items)
        setFuzzyMatches(fuzzy)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingQuery(false) })
    return () => { cancelled = true; clearTimeout(timer) }
  }, [debouncedQuery, lang])

  const handleSelectItem = useCallback(async (item: ItemSearchResult) => {
    // Create a ShopListing for this item
    try {
      const res = await fetch('/api/shop-admin/shop-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ item_id: item.id }),
      })
      if (res.ok) {
        const listing = await res.json() as { id: number }
        onSelect(item, listing.id)
      } else if (res.status === 409) {
        // ShopListing already exists — backend returns {"detail": {"shop_listing_id": N}}
        const body = await res.json() as { id?: number; shop_listing_id?: number; detail?: { shop_listing_id?: number } }
        const existingId = body.id ?? body.shop_listing_id ?? body.detail?.shop_listing_id
        onSelect(item, existingId)
      } else {
        onSelect(item)
      }
    } catch {
      onSelect(item)
    }
    onClose()
  }, [lang, onSelect, onClose])

  const handleCreated = useCallback((item: ItemSearchResult, shopListingId: number) => {
    onSelect(item, shopListingId)
    onClose()
  }, [onSelect, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={tr.item_picker_title}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{tr.item_picker_title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label={tr.cancel}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* EAN input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {tr.item_picker_ean_label}
            </label>
            <div className="relative">
              <input
                ref={firstInputRef}
                type="text"
                value={ean}
                onChange={(e) => setEan(e.target.value)}
                placeholder="e.g. 4006381333931"
                inputMode="numeric"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              {loadingEan && (
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">…</span>
              )}
            </div>
            {/* EAN match result */}
            {eanMatch && (
              <div className="mt-2 border border-green-200 rounded-lg p-3 bg-green-50 flex items-center gap-3">
                {eanMatch.photo_url && (
                  <div className="relative w-10 h-10 shrink-0 rounded-md overflow-hidden bg-gray-100">
                    <Image src={eanMatch.photo_url} alt={eanMatch.name} fill className="object-cover" unoptimized />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{eanMatch.name}</p>
                  <p className="text-xs text-gray-500">{eanMatch.ean}</p>
                </div>
                <button
                  onClick={() => handleSelectItem(eanMatch)}
                  className="shrink-0 bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-accent-dark transition-colors"
                >
                  {tr.item_picker_selected}
                </button>
              </div>
            )}
            {debouncedEan.length >= 8 && !eanMatch && !loadingEan && (
              <p className="mt-1 text-xs text-gray-400">{tr.item_picker_no_results}</p>
            )}
          </div>

          {/* Text search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {tr.item_picker_search_label}
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              {loadingQuery && (
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">…</span>
              )}
            </div>

            {/* Search results */}
            {results.length > 0 && (
              <ul className="mt-2 border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {results.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleSelectItem(item)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-start"
                    >
                      {item.photo_url ? (
                        <div className="relative w-9 h-9 shrink-0 rounded-md overflow-hidden bg-gray-100">
                          <Image src={item.photo_url} alt={item.name} fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="w-9 h-9 shrink-0 rounded-md bg-gray-100 flex items-center justify-center text-gray-300 text-lg">
                          □
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        {item.ean && <p className="text-xs text-gray-400">EAN: {item.ean}</p>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {debouncedQuery.trim() && results.length === 0 && !loadingQuery && (
              <p className="mt-1 text-xs text-gray-400">{tr.item_picker_no_results}</p>
            )}
          </div>

          {/* Fuzzy match warning */}
          {fuzzyMatches.length > 0 && (
            <div className="border border-amber-200 rounded-xl p-3 bg-amber-50">
              <p className="text-sm font-semibold text-amber-800">{tr.fuzzy_match_warning}</p>
              <p className="text-xs text-amber-700 mt-0.5">{tr.fuzzy_match_hint}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {fuzzyMatches.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleSelectItem(item)}
                      className="text-xs text-accent hover:underline"
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setFuzzyMatches([])}
                className="mt-2 text-xs text-amber-700 underline"
              >
                {tr.fuzzy_match_confirm}
              </button>
            </div>
          )}

          {/* Create new item form or CTA */}
          {showCreateForm ? (
            <ItemCreateForm
              lang={lang}
              onCreated={handleCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="self-start text-sm text-accent hover:underline font-medium"
            >
              + {tr.item_picker_add_new}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
