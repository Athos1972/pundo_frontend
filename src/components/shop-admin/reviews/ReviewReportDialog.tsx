'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState } from 'react'
import type { ShopReviewReportReason } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { errorCode } from './format'

const REASONS: ShopReviewReportReason[] = ['spam', 'offensive', 'legal', 'wrong_shop', 'other']

interface Props {
  reviewId: number
  lang: string
  tr: ShopAdminTranslations
  /** called after 201 or 409 already_reported: either way the review is reported by this shop now */
  onReported: () => void
  onCancel: () => void
}

export function ReviewReportDialog({ reviewId, lang, tr, onReported, onCancel }: Props) {
  const [reason, setReason] = useState<ShopReviewReportReason | null>(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!reason || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/shop-admin/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ reason, ...(comment.trim() ? { comment: comment.trim() } : {}) }),
      })
      if (res.ok) {
        onReported()
        return
      }
      const code = await errorCode(res)
      if (code === 'already_reported') {
        onReported()
        return
      }
      const key = `shop_reviews_err_${code}` as keyof ShopAdminTranslations
      setError(code && key in tr ? (tr[key] as string) : tr.shop_reviews_err_generic)
    } catch {
      setError(tr.shop_reviews_err_generic)
    } finally {
      setSending(false)
    }
  }

  const titleId = `report-title-${reviewId}`
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={send}
        className="bg-white rounded-xl shadow-xl p-5 max-w-md w-full flex flex-col gap-3"
      >
        <h2 id={titleId} className="text-base font-semibold text-gray-900">{tr.shop_reviews_report_title}</h2>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-medium text-gray-700 mb-1">{tr.shop_reviews_report_reason_label}</legend>
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-gray-800">
              <input type="radio" name={`report-reason-${reviewId}`} value={r} checked={reason === r} onChange={() => setReason(r)} />
              {tr[`shop_reviews_report_reason_${r}` as keyof ShopAdminTranslations] as string}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
          {tr.shop_reviews_report_comment_label}
          <textarea
            dir="auto"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal text-start"
          />
        </label>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} disabled={sending} className="text-sm px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg">
            {tr.shop_reviews_report_cancel}
          </button>
          <button type="submit" disabled={!reason || sending} className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50">
            {tr.shop_reviews_report_send}
          </button>
        </div>
      </form>
    </div>
  )
}
