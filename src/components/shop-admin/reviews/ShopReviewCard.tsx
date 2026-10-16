'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary). Infrastructure from @/lib/lang and @/lib/routing is fine.

import { useState } from 'react'
import Link from 'next/link'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import type { ShopOwnerReview } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { ReviewReplyEditor } from './ReviewReplyEditor'
import { ReviewReportDialog } from './ReviewReportDialog'
import { errorCode, fill, formatDate } from './format'

interface Props {
  review: ShopOwnerReview
  lang: string
  tr: ShopAdminTranslations
  onChange: (next: ShopOwnerReview) => void
}

export function ShopReviewCard({ review, lang, tr, onChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reply = review.reply
  const hidden = !review.is_visible

  async function deleteReply() {
    if (!window.confirm(tr.shop_reviews_reply_delete_confirm)) return
    setError(null)
    try {
      const res = await fetch(`/api/shop-admin/reviews/${review.id}/reply`, {
        method: 'DELETE',
        headers: { 'Accept-Language': lang },
      })
      if (res.ok) {
        onChange({ ...review, reply: null })
        return
      }
      const code = await errorCode(res)
      const key = `shop_reviews_err_${code}` as keyof ShopAdminTranslations
      setError(code && key in tr ? (tr[key] as string) : tr.shop_reviews_err_generic)
    } catch {
      setError(tr.shop_reviews_err_generic)
    }
  }

  return (
    <article
      className={`bg-white border rounded-xl p-4 ${hidden ? 'opacity-60 border-dashed' : 'border-gray-200'}`}
      aria-label={review.user_display_name}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p dir="auto" className="font-semibold text-sm text-gray-900">{review.user_display_name}</p>
          <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2">
            <span role="img" aria-label={fill(tr.shop_reviews_stars_aria, { n: review.stars })} className="text-amber-500">
              {'★'.repeat(review.stars)}{'☆'.repeat(Math.max(0, 5 - review.stars))}
            </span>
            <time dateTime={review.created_at}>{formatDate(review.created_at, lang)}</time>
            {review.entity && review.entity.type === 'product' && (
              <Link href={localePath(lang as Lang, `/products/${review.entity.slug}`)} className="underline text-gray-700">
                {review.entity.name}
              </Link>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs shrink-0">
          {review.is_new && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">{tr.shop_reviews_badge_new}</span>}
          {review.reported_by_shop && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">{tr.shop_reviews_badge_reported}</span>}
          {hidden && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{tr.shop_reviews_badge_hidden}</span>}
        </div>
      </div>

      {hidden && <p className="text-xs text-gray-500 mt-2">{tr.shop_reviews_hidden_notice}</p>}

      {review.comment && (
        <p dir="auto" className="text-sm text-gray-700 mt-2 whitespace-pre-line">{review.comment}</p>
      )}

      {review.photos.length > 0 && (
        <ul className="flex flex-wrap gap-2 mt-2">
          {review.photos.map((p) => (
            <li key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbnail_url ?? p.url}
                alt={fill(tr.shop_reviews_photo_alt, { name: review.user_display_name })}
                className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      )}

      {reply && !editing && (
        <div className="mt-3 border-s-2 border-gray-200 ps-3">
          <p className="text-xs font-medium text-gray-500 flex flex-wrap items-center gap-2">
            {tr.shop_reviews_reply_heading}
            <time dateTime={reply.created_at}>{formatDate(reply.created_at, lang)}</time>
            {!reply.is_visible && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{tr.shop_reviews_badge_reply_hidden}</span>
            )}
          </p>
          <p dir="auto" className="text-sm text-gray-700 whitespace-pre-line mt-1">{reply.body}</p>
          {!reply.is_visible && <p className="text-xs text-gray-500 mt-1">{tr.shop_reviews_reply_hidden}</p>}
          {reply.is_visible && review.can_reply && (
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setEditing(true)} className="text-xs text-accent hover:underline">
                {tr.shop_reviews_reply_edit}
              </button>
              <button type="button" onClick={deleteReply} className="text-xs text-red-600 hover:underline">
                {tr.shop_reviews_reply_delete}
              </button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <ReviewReplyEditor
          reviewId={review.id}
          existing={reply ?? undefined}
          lang={lang}
          tr={tr}
          onSaved={(saved) => {
            onChange({ ...review, reply: saved })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 mt-3">
        {review.can_reply && !reply && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            {tr.shop_reviews_reply_btn}
          </button>
        )}
        {review.can_report && (
          <button type="button" onClick={() => setReporting(true)} className="text-xs text-gray-500 hover:text-red-600 hover:underline ms-auto">
            {tr.shop_reviews_report_btn}
          </button>
        )}
        {review.reported_by_shop && <p className="text-xs text-gray-500 ms-auto">{tr.shop_reviews_reported}</p>}
      </div>

      {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}

      {reporting && (
        <ReviewReportDialog
          reviewId={review.id}
          lang={lang}
          tr={tr}
          onReported={() => {
            onChange({ ...review, reported_by_shop: true, can_report: false })
            setReporting(false)
          }}
          onCancel={() => setReporting(false)}
        />
      )}
    </article>
  )
}
