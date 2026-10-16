'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState } from 'react'
import type { ShopOwnerReviewReply } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { errorCode, fill } from './format'

const MAX_LENGTH = 1000

interface Props {
  reviewId: number
  /** present = edit an existing reply (PATCH), absent = write a new one (POST) */
  existing?: ShopOwnerReviewReply
  lang: string
  tr: ShopAdminTranslations
  onSaved: (reply: ShopOwnerReviewReply) => void
  onCancel: () => void
}

export function ReviewReplyEditor({ reviewId, existing, lang, tr, onSaved, onCancel }: Props) {
  const [body, setBody] = useState(existing?.body ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = body.trim()
  const tooLong = body.length > MAX_LENGTH

  function messageFor(code: string | null, status: number): string {
    if (status === 422) return trimmed.length === 0 ? tr.shop_reviews_reply_empty : tr.shop_reviews_reply_too_long
    const key = `shop_reviews_err_${code}` as keyof ShopAdminTranslations
    return code && key in tr ? (tr[key] as string) : tr.shop_reviews_err_generic
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (trimmed.length === 0 || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/shop-admin/reviews/${reviewId}/reply`, {
        method: existing ? 'PATCH' : 'POST',
        // Accept-Language explicit: the proxy would otherwise pass on the browser language, not the app language
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ body: trimmed }),
      })
      if (!res.ok) {
        setError(messageFor(await errorCode(res), res.status))
        return
      }
      onSaved((await res.json()) as ShopOwnerReviewReply)
    } catch {
      setError(tr.shop_reviews_err_generic)
    } finally {
      setSaving(false)
    }
  }

  const fieldId = `reply-${reviewId}`
  return (
    <form onSubmit={save} className="mt-3 flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-xs font-medium text-gray-700">
        {tr.shop_reviews_reply_label}
      </label>
      <textarea
        id={fieldId}
        dir="auto"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder={tr.shop_reviews_reply_placeholder}
        aria-describedby={`${fieldId}-note`}
        aria-invalid={error !== null || tooLong}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-start"
      />
      <div className="flex items-center justify-between gap-2 text-xs">
        <p id={`${fieldId}-note`} className="text-gray-500">{tr.shop_reviews_reply_public_note}</p>
        <span className={tooLong ? 'text-red-600 font-medium' : 'text-gray-500'}>
          {fill(tr.shop_reviews_reply_counter, { n: body.length })}
        </span>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={trimmed.length === 0 || saving}
          className="text-xs px-3 py-1.5 bg-accent text-white rounded-lg disabled:opacity-50"
        >
          {saving ? tr.shop_reviews_reply_saving : tr.shop_reviews_reply_save}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="text-xs text-gray-500 hover:text-gray-700">
          {tr.shop_reviews_reply_cancel}
        </button>
      </div>
    </form>
  )
}
