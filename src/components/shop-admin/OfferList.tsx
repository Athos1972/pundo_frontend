'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { tAdmin } from '@/lib/shop-admin-translations'
import { showToast } from './Toast'
import { OfferFilterBar } from './OfferFilterBar'
import { resolveLocalizedName } from './OfferItemHeader'
import type { AdminOffer, ItemSource } from '@/types/shop-admin'

interface OfferListProps {
  activeItems: AdminOffer[]
  expiredItems: AdminOffer[]
  lang: string
}

function sourceBadge(source: ItemSource | undefined, tr: ReturnType<typeof tAdmin>) {
  const label = source === 'scraper' ? tr.source_scraper
    : source === 'shop_manual' ? tr.source_shop_manual
    : source === 'shop_upload' ? tr.source_shop_upload
    : source === 'spotted' ? tr.source_spotted
    : source === 'admin' ? tr.source_admin
    : source === 'auto_seeded' ? tr.source_auto_seeded
    : (source ?? '')
  const cls = source === 'scraper' ? 'bg-gray-100 text-gray-500'
    : source === 'shop_manual' ? 'bg-green-100 text-green-700'
    : source === 'shop_upload' ? 'bg-blue-100 text-blue-700'
    : source === 'spotted' ? 'bg-purple-100 text-purple-700'
    : source === 'admin' ? 'bg-yellow-100 text-yellow-700'
    : source === 'auto_seeded' ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-100 text-gray-500'
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

function formatDateRange(from: string | null, until: string | null): string {
  if (!from && !until) return '–'
  const f = from ? from.slice(0, 10) : ''
  const u = until ? until.slice(0, 10) : ''
  if (f && u) return `${f} – ${u}`
  if (f) return `from ${f}`
  return `until ${u}`
}

function isExpired(offer: AdminOffer): boolean {
  if (!offer.valid_until) return false
  return new Date(offer.valid_until) < new Date()
}

function isDeletable(offer: AdminOffer): boolean {
  return offer.archived || isExpired(offer)
}

export function OfferList({ activeItems, expiredItems, lang }: OfferListProps) {
  const tr = tAdmin(lang)
  const [tab, setTab] = useState<'active' | 'expired'>('active')
  const [active, setActive] = useState(activeItems)
  const [expired, setExpired] = useState(expiredItems)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searchText, setSearchText] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const tabItems = tab === 'active' ? active : expired

  // Derive unique categories from all items with category_name
  const categories = useMemo(() => {
    const all = [...active, ...expired]
    const seen = new Map<number, string>()
    for (const offer of all) {
      if (offer.item?.category_id != null && offer.item.category_name) {
        seen.set(offer.item.category_id, offer.item.category_name)
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [active, expired])

  // Filter current tab items by category AND search text
  const filteredItems = useMemo(() => {
    let result = tabItems
    if (selectedCategoryId != null) {
      result = result.filter((o) => o.item?.category_id === selectedCategoryId)
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      result = result.filter((o) => {
        if (o.item?.names) {
          return Object.values(o.item.names).some((n) => n.toLowerCase().includes(q))
        }
        return (o.title ?? '').toLowerCase().includes(q)
      })
    }
    return result
  }, [tabItems, selectedCategoryId, searchText])

  function getDisplayName(offer: AdminOffer): string {
    if (offer.item?.names) {
      return resolveLocalizedName(offer.item.names, lang) ?? offer.title ?? `Offer #${offer.id}`
    }
    return offer.title ?? `Offer #${offer.id}`
  }

  function getPriceDisplay(offer: AdminOffer): string {
    if (offer.price_type === 'on_request') return 'on request'
    if (offer.price_type === 'free') return 'free'
    const tier = offer.price_tiers?.[0]
    const step = tier?.steps?.[0]
    if (step?.price) return `${step.price} ${step.currency}`
    return ''
  }

  function handleArchive(id: number) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/shop-admin/offers/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: true }),
        })
        if (res.ok) {
          const offer = active.find((o) => o.id === id)
          if (offer) {
            setActive((prev) => prev.filter((o) => o.id !== id))
            setExpired((prev) => [{ ...offer, archived: true }, ...prev])
          }
          showToast('Archived', 'success')
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
      setConfirmId(null)
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/shop-admin/offers/${id}`, { method: 'DELETE' })
        if (res.ok) {
          setActive((prev) => prev.filter((o) => o.id !== id))
          setExpired((prev) => prev.filter((o) => o.id !== id))
          showToast(tr.delete, 'success')
        } else if (res.status === 409) {
          showToast(tr.offer_delete_active_error, 'error')
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
      setDeleteConfirmId(null)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <OfferFilterBar
        lang={lang}
        searchText={searchText}
        selectedCategoryId={selectedCategoryId}
        categories={categories}
        onSearchChange={setSearchText}
        onCategoryChange={setSelectedCategoryId}
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['active', 'expired'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'active' ? tr.active : tr.expired}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">
          {tabItems.length > 0 ? tr.offer_no_results_filtered : tr.no_results}
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {filteredItems.map((offer) => {
            const coverPhoto = offer.item?.photos[0] ?? null
            const displayName = getDisplayName(offer)
            const categoryName = offer.item?.category_name ?? null

            return (
              <div key={offer.id} className="flex items-start gap-3 px-4 py-3 rtl:flex-row-reverse">
                {/* Thumbnail */}
                <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                  {coverPhoto ? (
                    <Image
                      src={coverPhoto.thumbnail_url ?? coverPhoto.url}
                      alt={displayName}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <svg aria-hidden="true" className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 10V7" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800">{displayName}</p>
                    {sourceBadge(offer.source, tr)}
                    {categoryName && (
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        {categoryName}
                      </span>
                    )}
                  </div>
                  {offer.item?.descriptions && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                      {offer.item.descriptions[lang] ?? offer.item.descriptions['en'] ?? null}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateRange(offer.valid_from, offer.valid_until)}
                    {getPriceDisplay(offer) && ` · ${getPriceDisplay(offer)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/shop-admin/offers/${offer.id}/edit`}
                    className="text-xs text-accent hover:underline"
                  >
                    {tr.edit}
                  </Link>
                  {tab === 'active' && (
                    confirmId === offer.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => handleArchive(offer.id)}
                          disabled={isPending}
                          className="text-xs text-white bg-orange-500 px-2 py-0.5 rounded hover:bg-orange-600 disabled:opacity-50"
                        >
                          {tr.archive}
                        </button>
                        <button onClick={() => setConfirmId(null)} className="text-xs text-gray-400">
                          {tr.cancel}
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmId(offer.id)}
                        className="text-xs text-gray-400 hover:text-orange-500"
                      >
                        {tr.archive}
                      </button>
                    )
                  )}
                  {isDeletable(offer) && (
                    deleteConfirmId === offer.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(offer.id)}
                          disabled={isPending}
                          className="text-xs text-white bg-red-600 px-2 py-0.5 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {tr.delete}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-xs text-gray-400"
                        >
                          {tr.cancel}
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(offer.id)}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        {tr.delete}
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
