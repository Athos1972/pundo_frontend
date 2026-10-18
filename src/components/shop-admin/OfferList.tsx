'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { tAdmin } from '@/lib/shop-admin-translations'
import { fmtPrice } from '@/lib/utils'
import { showToast } from './Toast'
import { announceOwnershipReviewCount, OPEN_REVIEW_TAB_EVENT } from './ownership-review-events'
import { OfferFilterBar } from './OfferFilterBar'
import { resolveLocalizedName } from './OfferItemHeader'
import type {
  AdminOffer, ItemSource, OwnershipReviewArchiveResponse, OwnershipReviewConfirmResponse, OwnershipReviewSelection,
} from '@/types/shop-admin'

type Tab = 'active' | 'expired' | 'review'

interface OfferListProps {
  activeItems: AdminOffer[]
  expiredItems: AdminOffer[]
  lang: string
  /** F5970: `review` opens the "To review" tab (banner link `?review=1`). */
  initialTab?: Tab
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

function formatDateRange(from: string | null, until: string | null, tr: ReturnType<typeof tAdmin>): string {
  if (!from && !until) return '–'
  const f = from ? from.slice(0, 10) : ''
  const u = until ? until.slice(0, 10) : ''
  if (f && u) return `${f} – ${u}`
  if (f) return `${tr.valid_from} ${f}`
  return `${tr.valid_until} ${u}`
}

function isExpired(offer: AdminOffer): boolean {
  if (!offer.promo_valid_until) return false
  return new Date(offer.promo_valid_until) < new Date()
}

function isDeletable(offer: AdminOffer): boolean {
  return offer.archived || isExpired(offer)
}

export function OfferList({ activeItems, expiredItems, lang, initialTab = 'active' }: OfferListProps) {
  const tr = tAdmin(lang)
  const [tab, setTab] = useState<Tab>(initialTab)
  // `initialTab` comes from the URL (?review=1) and the list stays mounted on same-route navigation:
  // follow a prop change (adjusting state while rendering, no extra paint) ...
  const [seenInitialTab, setSeenInitialTab] = useState<Tab>(initialTab)
  if (seenInitialTab !== initialTab) {
    setSeenInitialTab(initialTab)
    setTab(initialTab)
  }
  // ... and the banner link, which also fires when the URL is already ?review=1 (tab switched by hand in between)
  useEffect(() => {
    const open = () => setTab('review')
    window.addEventListener(OPEN_REVIEW_TAB_EVENT, open)
    return () => window.removeEventListener(OPEN_REVIEW_TAB_EVENT, open)
  }, [])
  const [active, setActive] = useState(activeItems)
  const [expired, setExpired] = useState(expiredItems)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [activatingId, setActivatingId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searchText, setSearchText] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const [archiveAllConfirm, setArchiveAllConfirm] = useState(false)

  // F5970: active offers of a listing flagged after an owner change (hidden for customers until handled)
  const reviewItems = useMemo(() => active.filter((o) => o.ownership_review === true), [active])
  const tabItems = tab === 'active' ? active : tab === 'review' ? reviewItems : expired

  // keep the layout banner in step with what this list shows (the layout does not re-render on client navigation)
  // (skipped when the server list may be truncated at the 500-offer page size: the count would be too low)
  const reviewCount = reviewItems.length
  const listComplete = activeItems.length < 500
  useEffect(() => {
    if (listComplete) announceOwnershipReviewCount(reviewCount)
  }, [reviewCount, listComplete])

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
    const now = new Date()
    const promoActive = !!(
      offer.promo_valid_from && offer.promo_valid_until &&
      new Date(offer.promo_valid_from) <= now && new Date(offer.promo_valid_until) >= now &&
      offer.promo_price_tiers?.[0]?.steps?.[0]?.price
    )

    // Standard price display
    let std = ''
    if (offer.price_type === 'on_request') std = tr.price_type_on_request
    else if (offer.price_type === 'free') std = tr.price_type_free
    else {
      const step = offer.price_tiers?.[0]?.steps?.[0]
      if (step?.price) std = `${fmtPrice(step.price)} ${step.currency}`
    }

    if (promoActive) {
      const promoStep = offer.promo_price_tiers[0].steps[0]
      const promo = `${fmtPrice(promoStep.price)} ${promoStep.currency}`
      return std ? `${promo} (${tr.standard_price ?? 'std'}: ${std})` : promo
    }
    return std
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
          showToast(tr.offer_archive_success, 'success')
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
      setConfirmId(null)
    })
  }

  /** Confirm / archive flagged offers through the bulk endpoints (also used for a single row). */
  function reviewAction(kind: 'confirm' | 'archive', selection: OwnershipReviewSelection) {
    const ids = 'offer_ids' in selection ? new Set(selection.offer_ids) : null
    startTransition(async () => {
      try {
        const res = await fetch(`/api/shop-admin/offers/ownership-review/${kind}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selection),
        })
        if (!res.ok) {
          showToast(tr.error_generic, 'error')
          return
        }
        const body = await res.json() as OwnershipReviewConfirmResponse & OwnershipReviewArchiveResponse
        const handled = (o: AdminOffer) => o.ownership_review === true && (ids === null || ids.has(o.id))
        if (kind === 'confirm') {
          setActive((prev) => prev.map((o) => (handled(o) ? { ...o, ownership_review: false } : o)))
          showToast(tr.offer_review_confirmed_toast.replace('{n}', String(body.confirmed)), 'success')
        } else {
          const moved = active.filter(handled)
          setActive((prev) => prev.filter((o) => !handled(o)))
          setExpired((prev) => [...moved.map((o) => ({ ...o, archived: true, ownership_review: false })), ...prev])
          showToast(tr.offer_review_archived_toast.replace('{n}', String(body.archived)), 'success')
        }
        announceOwnershipReviewCount(body.remaining)
      } catch {
        showToast(tr.error_generic, 'error')
      }
      setArchiveAllConfirm(false)
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

  function handleActivate(id: number) {
    setActivatingId(id)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/shop-admin/offers/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: false }),
        })
        if (res.ok) {
          const updated = await res.json() as AdminOffer
          setActive((prev) => prev.map((o) => o.id === id ? updated : o))
          showToast(tr.offer_activate_success, 'success')
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
      setActivatingId(null)
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
        {(['active', 'review', 'expired'] as const)
          .filter((t) => t !== 'review' || reviewCount > 0 || tab === 'review')
          .map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`offer-tab-${t}`}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${tab === t
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'active' ? tr.active : t === 'expired' ? tr.expired : tr.offer_review_tab}
              {t === 'review' && reviewCount > 0 && (
                <span className="ms-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs leading-none text-white">{reviewCount}</span>
              )}
            </button>
          ))}
      </div>

      {tab === 'review' && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3" data-testid="offer-review-panel">
          <p className="text-sm text-amber-900">{tr.offer_review_intro}</p>
          {reviewCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => reviewAction('confirm', { all: true })}
                disabled={isPending}
                data-testid="offer-review-confirm-all"
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {tr.offer_review_confirm_all.replace('{n}', String(reviewCount))}
              </button>
              {archiveAllConfirm ? (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-amber-900">{tr.offer_review_archive_all_confirm.replace('{n}', String(reviewCount))}</span>
                  <button
                    type="button"
                    onClick={() => reviewAction('archive', { all: true })}
                    disabled={isPending}
                    data-testid="offer-review-archive-all-yes"
                    className="rounded-lg bg-orange-500 px-3 py-1.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                  >
                    {tr.archive}
                  </button>
                  <button type="button" onClick={() => setArchiveAllConfirm(false)} className="text-gray-600 hover:underline">
                    {tr.cancel}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setArchiveAllConfirm(true)}
                  disabled={isPending}
                  data-testid="offer-review-archive-all"
                  className="rounded-lg border border-orange-400 bg-white px-3 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                >
                  {tr.offer_review_archive_all.replace('{n}', String(reviewCount))}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">
          {tabItems.length > 0 ? tr.offer_no_results_filtered : tab === 'review' ? tr.offer_review_empty : tr.no_results}
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {filteredItems.map((offer) => {
            const coverPhoto = offer.item?.photos[0] ?? null
            const displayName = getDisplayName(offer)
            const categoryName = offer.item?.category_name ?? null

            return (
              <div key={offer.id} data-testid="offer-row" className="flex items-start gap-3 px-4 py-3">
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

                <div className="flex-1 min-w-0 flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
                <div className="min-w-0 lg:flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800 break-words">{displayName}</p>
                    {sourceBadge(offer.source, tr)}
                    {offer.source === 'auto_seeded' && (
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        {tr.offer_status_draft}
                      </span>
                    )}
                    {offer.ownership_review === true && (
                      <span data-testid="offer-review-badge" title={tr.offer_review_hidden_hint} className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {tr.offer_review_badge}
                      </span>
                    )}
                    {offer.listing_available === false && (
                      <span data-testid="offer-not-available-badge" className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                        {tr.offer_not_available_badge}
                      </span>
                    )}
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
                  {offer.listing_sku && (
                    <p data-testid="offer-sku" className="text-xs text-gray-500 mt-0.5">
                      {tr.offer_sku_short} <code dir="ltr" className="font-mono bg-gray-100 rounded px-1">{offer.listing_sku}</code>
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateRange(offer.promo_valid_from, offer.promo_valid_until, tr)}
                    {getPriceDisplay(offer) && ` · ${getPriceDisplay(offer)}`}
                  </p>
                </div>
                <div data-testid="offer-row-actions" className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:shrink-0 lg:flex-nowrap">
                  {tab === 'review' && (
                    <>
                      <button
                        onClick={() => reviewAction('confirm', { offer_ids: [offer.id] })}
                        disabled={isPending}
                        data-testid="offer-review-confirm"
                        className="text-xs text-white bg-green-600 px-2 py-0.5 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {tr.offer_review_confirm}
                      </button>
                      <button
                        onClick={() => reviewAction('archive', { offer_ids: [offer.id] })}
                        disabled={isPending}
                        data-testid="offer-review-archive"
                        className="text-xs text-orange-700 border border-orange-300 px-2 py-0.5 rounded hover:bg-orange-50 disabled:opacity-50"
                      >
                        {tr.offer_review_archive}
                      </button>
                    </>
                  )}
                  {offer.source === 'auto_seeded' && (
                    <button
                      onClick={() => handleActivate(offer.id)}
                      disabled={isPending && activatingId === offer.id}
                      title={tr.offer_activate_tooltip}
                      className="text-xs text-white bg-green-600 px-2 py-0.5 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {activatingId === offer.id ? '…' : tr.offer_activate}
                    </button>
                  )}
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
