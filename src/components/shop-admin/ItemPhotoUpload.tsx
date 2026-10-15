'use client'
// Clean Boundary: only imports from src/components/ui/, @/lib/shop-admin-*, @/types/shop-admin

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { tAdmin } from '@/lib/shop-admin-translations'
import { resizeImageForUpload } from '@/lib/shop-admin-image-resize'
import type { AdminItemPhoto } from '@/types/shop-admin'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_PHOTOS = 8

// The backend answers 404 (not 403) for photos/listings of other shops so their existence isn't leaked.
const isNotOwnStatus = (status: number) => status === 403 || status === 404
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface UploadingItem {
  localId: string
  previewUrl: string
}

interface ItemPhotoUploadProps {
  /** undefined → upload not possible yet (item not saved) */
  itemId?: number
  photos: AdminItemPhoto[]
  onChange: (photos: AdminItemPhoto[]) => void
  lang: string
  /** Shop of the logged-in owner. undefined/null → no photo counts as "own". */
  ownShopId?: number | null
}

function bySortOrder(a: AdminItemPhoto, b: AdminItemPhoto) {
  return a.sort_order - b.sort_order
}

export function ItemPhotoUpload({ itemId, photos, onChange, lang, ownShopId = null }: ItemPhotoUploadProps) {
  const tr = tAdmin(lang)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<UploadingItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const previewUrlsRef = useRef<Set<string>>(new Set())

  // Revoke any remaining blob URLs on unmount
  useEffect(() => {
    const urls = previewUrlsRef.current
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.clear()
    }
  }, [])

  const sorted = [...photos].sort(bySortOrder)
  const isOwn = (p: AdminItemPhoto) => p.contributed_by_shop_id != null && p.contributed_by_shop_id === ownShopId
  const allOwn = sorted.length > 0 && sorted.every(isOwn)
  const totalCount = sorted.length + uploading.length
  const canAddMore = totalCount < MAX_PHOTOS

  async function readDetail(res: Response): Promise<string> {
    const body = await res.json().catch(() => ({})) as { detail?: unknown }
    return typeof body.detail === 'string' ? body.detail : ''
  }

  function uploadErrorMessage(status: number, detail: string): string {
    if (status === 400 && detail.startsWith('File too large')) return tr.product_photos_size_error
    if (status === 413) return tr.product_photos_size_error
    if (status === 400 || status === 415) return tr.product_photos_type_error
    if (status === 409) return tr.product_photos_limit_error
    if (isNotOwnStatus(status)) return tr.photo_not_own_error
    return tr.product_photos_upload_error
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (fileRef.current) fileRef.current.value = ''
    if (files.length === 0) return

    setError(null)

    if (!itemId) { setError(tr.photo_save_item_first); return }

    const free = MAX_PHOTOS - totalCount
    if (free <= 0) { setError(tr.product_photos_limit_error); return }
    const batch = files.slice(0, free)
    let firstError: string | null = files.length > free ? tr.product_photos_limit_error : null

    // Local accumulator: props are stale between sequential uploads.
    let current = [...sorted]

    for (const original of batch) {
      if (!ACCEPTED_TYPES.includes(original.type)) { firstError ??= tr.product_photos_type_error; continue }

      const file = await resizeImageForUpload(original)
      if (!file || file.size > MAX_BYTES) { firstError ??= tr.product_photos_size_error; continue }

      const previewUrl = URL.createObjectURL(file)
      previewUrlsRef.current.add(previewUrl)
      const localId = previewUrl // blob URLs are unique per upload
      setUploading((prev) => [...prev, { localId, previewUrl }])

      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`/api/shop-admin/items/${itemId}/photos`, { method: 'POST', body: form })
        if (res.ok) {
          const data = await res.json() as AdminItemPhoto
          // SHA duplicate: backend returns the existing photo with 201 — do not insert twice.
          if (!current.some((p) => p.id === data.id)) {
            current = [...current, { ...data, item_id: data.item_id ?? itemId }]
            onChange(current)
          }
        } else {
          firstError ??= uploadErrorMessage(res.status, await readDetail(res))
        }
      } catch {
        firstError ??= tr.product_photos_upload_error
      } finally {
        URL.revokeObjectURL(previewUrl)
        previewUrlsRef.current.delete(previewUrl)
        setUploading((prev) => prev.filter((u) => u.localId !== localId))
      }
    }

    if (firstError) setError(firstError)
  }

  async function handleDelete(photoId: number) {
    if (!itemId) return
    setError(null)
    try {
      const res = await fetch(`/api/shop-admin/items/${itemId}/photos/${photoId}`, { method: 'DELETE' })
      if (!res.ok) {
        setError(isNotOwnStatus(res.status) ? tr.photo_not_own_error : tr.photo_delete_error)
        return
      }
      const wasCover = sorted[0]?.id === photoId
      const remaining = sorted
        .filter((p) => p.id !== photoId)
        .map((p, i) => ({ ...p, sort_order: i }))

      // Workaround: the backend does not compact sort_order after DELETE. If the cover was
      // deleted, promote the new first photo to sort_order 0 (only possible for own photos).
      if (wasCover && remaining[0] && isOwn(remaining[0])) {
        try {
          await fetch(`/api/shop-admin/items/${itemId}/photos/${remaining[0].id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order: 0 }),
          })
        } catch { /* ignore — list is still updated */ }
      }
      onChange(remaining)
    } catch {
      setError(tr.photo_delete_error)
    }
  }

  async function handleSetMain(photoId: number) {
    if (!itemId) return
    setError(null)
    try {
      const res = await fetch(`/api/shop-admin/items/${itemId}/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: 0 }),
      })
      if (!res.ok) {
        setError(isNotOwnStatus(res.status) ? tr.photo_not_own_error : tr.photo_set_main_error)
        return
      }
      const photo = sorted.find((p) => p.id === photoId)
      if (!photo) return
      const rest = sorted.filter((p) => p.id !== photoId)
      onChange([photo, ...rest].map((p, i) => ({ ...p, sort_order: i })))
    } catch {
      setError(tr.photo_set_main_error)
    }
  }

  function originLabel(p: AdminItemPhoto) {
    if (isOwn(p)) return tr.photo_from_shop
    if (p.contributed_by_shop_id == null) return tr.photo_from_pundo
    return tr.photo_from_other_shop
  }

  return (
    <div className="flex flex-col gap-3" data-testid="item-photo-upload">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{tr.photo_upload_label}</span>
        <span className="text-xs text-gray-400">{totalCount}/{MAX_PHOTOS}</span>
      </div>
      <p className="text-xs text-gray-500">{tr.photo_section_hint}</p>

      {sorted.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={tr.photo_upload_label}>
          {sorted.map((photo, idx) => {
            const own = isOwn(photo)
            return (
              <li key={photo.id} className="flex items-center gap-3" data-testid={`item-photo-${photo.id}`}>
                <div className="relative w-14 h-14 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                  <Image
                    src={photo.thumbnail_url ?? photo.url}
                    alt={`${tr.photo_upload_label} ${idx + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {idx === 0 && (
                    <div
                      data-testid="item-photo-cover-badge"
                      title={tr.photo_cover_badge}
                      className="absolute bottom-0 inset-x-0 bg-accent/80 text-white text-[9px] text-center py-0.5"
                    >
                      <span aria-hidden="true">★</span>
                      <span className="sr-only">{tr.photo_cover_badge}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{originLabel(photo)}</p>
                </div>

                {own && itemId && (
                  <div className="flex items-center gap-2 shrink-0">
                    {idx > 0 && allOwn && (
                      <button
                        type="button"
                        data-testid={`item-photo-set-main-${photo.id}`}
                        onClick={() => handleSetMain(photo.id)}
                        className="text-xs text-accent hover:underline"
                      >
                        {tr.photo_set_main}
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid={`item-photo-delete-${photo.id}`}
                      onClick={() => handleDelete(photo.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={tr.photo_delete}
                    >
                      {tr.photo_delete}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {sorted.length > 0 && !allOwn && (
        <p className="text-xs text-gray-500" data-testid="item-photo-shared-hint">{tr.photo_shared_item_hint}</p>
      )}

      {uploading.length > 0 && (
        <ul className="flex flex-col gap-2">
          {uploading.map((item) => (
            <li key={item.localId} className="flex items-center gap-3">
              <div className="relative w-14 h-14 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                <Image
                  src={item.previewUrl}
                  alt={tr.photo_upload_label}
                  fill
                  className="object-cover opacity-60"
                  unoptimized
                />
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <span className="text-xs text-gray-500 animate-pulse">...</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAddMore ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            data-testid="item-photo-add"
            onClick={() => fileRef.current?.click()}
            disabled={uploading.length > 0}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-300 bg-white
              px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            aria-label={tr.product_photos_add}
          >
            + {tr.product_photos_add}
          </button>
          <p className="text-xs text-gray-400">{tr.product_photos_hint}</p>
        </div>
      ) : (
        <p className="text-xs text-gray-400" data-testid="item-photo-limit">{tr.photo_upload_limit}</p>
      )}

      {/* No `capture` attribute: mobile browsers offer camera AND gallery */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        data-testid="item-photo-input"
        onChange={handleFileChange}
        aria-label={tr.product_photos_add}
      />

      {error && (
        <p className="text-xs text-red-600" role="alert" data-testid="item-photo-error">{error}</p>
      )}
    </div>
  )
}
