'use client'
// System-Admin: review photos without a moderation result (F3700, /admin/reviews?filter=unmoderated_photos).
// Only imports from src/components/system-admin/ allowed.

import { useState } from 'react'
import {
  PHOTO_MODERATION_CATEGORIES,
  type PhotoModerationCategory,
  type SysAdminPhotoDecisionRequest,
  type SysAdminUnmoderatedPhoto,
} from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  photos: SysAdminUnmoderatedPhoto[]
  tr: SysAdminTranslations
}

type Decision = 'approve' | 'reject'

function fmt(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), template)
}

export function UnmoderatedPhotoList({ photos: initial, tr }: Props) {
  const [photos, setPhotos] = useState(initial)
  const [reasonById, setReasonById] = useState<Record<number, string>>({})
  const [categoriesById, setCategoriesById] = useState<Record<number, PhotoModerationCategory[]>>({})
  const [dialog, setDialog] = useState<{ id: number; kind: Decision } | null>(null)
  const [pending, setPending] = useState(false)
  const [messageById, setMessageById] = useState<Record<number, string | null>>({})

  function toggleCategory(id: number, cat: PhotoModerationCategory) {
    setCategoriesById((prev) => {
      const cur = prev[id] ?? []
      return { ...prev, [id]: cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat] }
    })
  }

  async function run(id: number, kind: Decision) {
    const reason = (reasonById[id] ?? '').trim()
    const selected = categoriesById[id] ?? []
    const body: SysAdminPhotoDecisionRequest = {
      reason: reason || null,
      // approve carries no violation categories; reject needs at least one (default "other")
      categories: kind === 'reject' ? (selected.length > 0 ? selected : ['other']) : [],
    }
    setPending(true)
    try {
      // Admin proxy: attaches the admin_token cookie.
      const res = await fetch(`/api/admin/reviews/photos/${id}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.photo_id !== id))
      } else if (res.status === 409) {
        // Decided elsewhere (LLM result or another admin): tell the admin and drop the entry.
        setPhotos((prev) => prev.filter((p) => p.photo_id !== id))
        setMessageById((prev) => ({ ...prev, [id]: tr.rev_photos_already_decided }))
      } else {
        throw new Error(String(res.status))
      }
    } catch {
      setMessageById((prev) => ({ ...prev, [id]: tr.rev_photos_action_failed }))
    } finally {
      setPending(false)
      setDialog(null)
    }
  }

  // Messages of removed entries (409) stay visible, otherwise the hint would vanish with the row.
  const orphanMessages = Object.entries(messageById).filter(
    ([id, m]) => m && !photos.some((p) => p.photo_id === Number(id)),
  )

  if (photos.length === 0 && orphanMessages.length === 0) {
    return <p className="text-sm text-gray-500">{tr.rev_photos_empty}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {orphanMessages.map(([id, m]) => (
        <p key={id} role="status" className="text-sm text-amber-700">
          #{id}: {m}
        </p>
      ))}
      {photos.map((photo) => {
        const src = photo.thumb_url ?? photo.detail_url ?? photo.url
        const full = photo.detail_url ?? photo.url
        const id = photo.photo_id
        return (
          <article key={id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 flex-wrap">
            <a href={full} target="_blank" rel="noreferrer" className="shrink-0">
              {/* Backend-served upload via /review_photos rewrite; next/image optimisation is not wanted for admin review */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={fmt(tr.rev_photos_image_alt, { id })}
                className="w-32 h-32 object-cover rounded-lg border border-gray-200 bg-gray-50"
              />
            </a>
            <div className="flex-1 min-w-60 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-sm text-gray-900">#{id}</span>
                <span className="text-gray-500">{fmt(tr.rev_photos_review, { id: photo.review_id })}</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                  {fmt(tr.rev_photos_waiting, { n: photo.waiting_minutes })}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    photo.status === 'approved' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {photo.status === 'approved' ? tr.rev_photos_status_visible : tr.rev_photos_status_pending}
                </span>
                {photo.moderation_task_id === null && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{tr.rev_photos_not_submitted}</span>
                )}
              </div>

              <label className="flex flex-col gap-1 text-xs text-gray-500">
                {tr.rev_photos_reason_label}
                <input
                  type="text"
                  maxLength={500}
                  dir="auto"
                  value={reasonById[id] ?? ''}
                  onChange={(e) => setReasonById((prev) => ({ ...prev, [id]: e.target.value }))}
                  className="text-sm border border-gray-200 rounded px-2 py-1 text-gray-900"
                />
              </label>

              <fieldset className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
                <legend className="text-xs text-gray-500 mb-1">{tr.rev_photos_categories_label}</legend>
                {PHOTO_MODERATION_CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={(categoriesById[id] ?? []).includes(cat)}
                      onChange={() => toggleCategory(id, cat)}
                    />
                    {tr[`rev_photos_category_${cat}` as keyof SysAdminTranslations] as string}
                  </label>
                ))}
              </fieldset>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDialog({ id, kind: 'approve' })}
                  className="text-xs text-green-700 hover:underline"
                >
                  {tr.rev_photos_approve}
                </button>
                <button
                  type="button"
                  onClick={() => setDialog({ id, kind: 'reject' })}
                  className="text-xs text-red-600 hover:underline"
                >
                  {tr.rev_photos_reject}
                </button>
              </div>

              {messageById[id] && (
                <p role="alert" className="text-xs text-red-600">{messageById[id]}</p>
              )}
            </div>
          </article>
        )
      })}

      <ConfirmDialog
        open={dialog !== null}
        message={dialog ? (dialog.kind === 'approve' ? tr.rev_photos_confirm_approve : tr.rev_photos_confirm_reject) : ''}
        confirmLabel={tr.rev_confirm_yes}
        cancelLabel={tr.cancel}
        isPending={pending}
        onConfirm={() => dialog && run(dialog.id, dialog.kind)}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}
