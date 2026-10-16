'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary). Infrastructure from @/lib/lang and @/lib/routing is fine.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import type { ShopOwnerReview, ShopOwnerReviewPage } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { ShopReviewCard } from './ShopReviewCard'
import { SHOP_REVIEWS_SEEN_EVENT } from './events'

const PAGE_SIZE = 20

interface Props {
  initial: ShopOwnerReviewPage
  shopSlug: string
  lang: string
  tr: ShopAdminTranslations
}

export function ShopReviewList({ initial, shopSlug, lang, tr }: Props) {
  const [items, setItems] = useState<ShopOwnerReview[]>(initial.items)
  const [total] = useState(initial.total)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const markedSeen = useRef(false)

  // Opening the list marks both scopes as seen (A4). "New" markers stay in this view (no refresh).
  useEffect(() => {
    if (markedSeen.current) return
    markedSeen.current = true
    void (async () => {
      try {
        const res = await fetch('/api/shop-admin/reviews/mark-seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
          body: JSON.stringify({ seen_until: initial.generated_at }),
        })
        if (res.ok) window.dispatchEvent(new Event(SHOP_REVIEWS_SEEN_EVENT))
      } catch {
        // badge just stays until the next page load
      }
    })()
  }, [initial.generated_at, lang])

  async function loadMore() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(
        `/api/shop-admin/reviews?scope=${initial.scope}&limit=${PAGE_SIZE}&offset=${items.length}`,
        { headers: { 'Accept-Language': lang } },
      )
      if (!res.ok) throw new Error(String(res.status))
      const page = (await res.json()) as ShopOwnerReviewPage
      setItems((prev) => [...prev, ...page.items.filter((n) => !prev.some((p) => p.id === n.id))])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {initial.scope === 'products' && <p className="text-sm text-gray-500">{tr.shop_reviews_products_hint}</p>}
        <p className="text-sm text-gray-500">
          {initial.scope === 'products' ? tr.shop_reviews_empty_products : tr.shop_reviews_empty_shop}
        </p>
        <Link href={localePath(lang as Lang, `/shops/${shopSlug}`)} className="text-sm text-accent underline">
          {tr.shop_reviews_empty_link}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {initial.scope === 'products' && <p className="text-sm text-gray-500">{tr.shop_reviews_products_hint}</p>}
      {items.map((review) => (
        <ShopReviewCard
          key={review.id}
          review={review}
          lang={lang}
          tr={tr}
          onChange={(next) => setItems((prev) => prev.map((r) => (r.id === next.id ? next : r)))}
        />
      ))}
      {error && <p role="alert" className="text-xs text-red-600">{tr.shop_reviews_list_error}</p>}
      {items.length < total && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="self-center text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? tr.shop_reviews_loading : tr.shop_reviews_load_more}
        </button>
      )}
    </div>
  )
}
