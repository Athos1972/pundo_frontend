'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { tAdmin } from '@/lib/shop-admin-translations'
import { showToast } from './Toast'
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
    : (source ?? '')
  const cls = source === 'scraper' ? 'bg-gray-100 text-gray-500'
    : source === 'shop_manual' ? 'bg-green-100 text-green-700'
    : source === 'shop_upload' ? 'bg-blue-100 text-blue-700'
    : source === 'spotted' ? 'bg-purple-100 text-purple-700'
    : source === 'admin' ? 'bg-yellow-100 text-yellow-700'
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

  const items = tab === 'active' ? active : expired

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

  function getDisplayName(offer: AdminOffer): string {
    // Prefer item name from shop_listing if embedded, fall back to title
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

  return (
    <div className="flex flex-col gap-4">
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

      {items.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">{tr.no_results}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {items.map((offer) => (
            <div key={offer.id} className="flex items-start gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800">{getDisplayName(offer)}</p>
                  {sourceBadge(offer.source, tr)}
                </div>
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
                  {offer.source === 'scraper' ? tr.edit : tr.edit}
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
          ))}
        </div>
      )}
    </div>
  )
}
