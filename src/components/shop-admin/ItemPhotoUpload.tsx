'use client'
// Clean Boundary: only imports from src/components/ui/, @/lib/shop-admin-*, @/types/shop-admin

import { useRef, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { AdminItemPhoto } from '@/types/shop-admin'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_PHOTOS = 8
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface UploadingItem {
  localId: string
  previewUrl: string
  uploading: boolean
  error: string | null
}

interface ItemPhotoUploadProps {
  /** undefined in create-mode — upload deferred until itemId is known */
  itemId?: number
  photos: AdminItemPhoto[]
  onChange: (photos: AdminItemPhoto[]) => void
  lang: string
}

export function ItemPhotoUpload({ itemId, photos, onChange, lang }: ItemPhotoUploadProps) {
  const tr = tAdmin(lang)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<UploadingItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      uploading.forEach((u) => {
        if (u.previewUrl.startsWith('blob:')) URL.revokeObjectURL(u.previewUrl)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalCount = photos.length + uploading.length

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (fileRef.current) fileRef.current.value = ''

      setError(null)

      if (file.size > MAX_BYTES) { setError(tr.product_photos_size_error); return }
      if (!ACCEPTED_TYPES.includes(file.type)) { setError(tr.product_photos_type_error); return }
      if (totalCount >= MAX_PHOTOS) { setError(tr.product_photos_limit_error); return }

      if (!itemId) {
        setError('Item must be saved before uploading photos.')
        return
      }

      const previewUrl = URL.createObjectURL(file)
      const localId = `uploading-${Date.now()}-${Math.random()}`
      setUploading((prev) => [...prev, { localId, previewUrl, uploading: true, error: null }])

      try {
        const form = new FormData()
        form.append('file', file)

        const res = await fetch(`/api/shop-admin/items/${itemId}/photos`, {
          method: 'POST',
          body: form,
        })

        if (res.ok) {
          const data = await res.json() as AdminItemPhoto
          URL.revokeObjectURL(previewUrl)
          setUploading((prev) => prev.filter((u) => u.localId !== localId))
          onChange([...photos, data])
        } else {
          const body = await res.json().catch(() => ({})) as { detail?: string }
          const errMsg = body.detail === 'max_images_reached'
            ? tr.product_photos_limit_error
            : (res.status === 409)
              ? tr.product_photos_limit_error
              : (res.status === 415 || res.status === 400)
                ? tr.product_photos_type_error
                : tr.product_photos_upload_error
          setUploading((prev) =>
            prev.map((u) => u.localId === localId ? { ...u, uploading: false, error: errMsg } : u)
          )
        }
      } catch {
        setUploading((prev) =>
          prev.map((u) =>
            u.localId === localId ? { ...u, uploading: false, error: tr.product_photos_upload_error } : u
          )
        )
      }
    },
    [itemId, totalCount, photos, onChange, tr]
  )

  async function handleDelete(photoId: number) {
    if (!itemId) return
    try {
      const res = await fetch(`/api/shop-admin/items/${itemId}/photos/${photoId}`, { method: 'DELETE' })
      if (res.ok) {
        onChange(photos.filter((p) => p.id !== photoId))
      }
    } catch { /* ignore */ }
  }

  async function handleSetMain(photoId: number) {
    if (!itemId) return
    try {
      const res = await fetch(`/api/shop-admin/items/${itemId}/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: 0 }),
      })
      if (res.ok) {
        // Re-order: moved photo goes to front, rest shift
        const photo = photos.find((p) => p.id === photoId)
        if (!photo) return
        const rest = photos.filter((p) => p.id !== photoId)
        onChange([
          { ...photo, sort_order: 0 },
          ...rest.map((p, i) => ({ ...p, sort_order: i + 1 })),
        ])
      }
    } catch { /* ignore */ }
  }

  function handleRemoveUploading(localId: string) {
    setUploading((prev) => {
      const item = prev.find((u) => u.localId === localId)
      if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((u) => u.localId !== localId)
    })
  }

  const canAddMore = totalCount < MAX_PHOTOS

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{tr.photo_upload_label}</label>
        <span className="text-xs text-gray-400">{totalCount}/{MAX_PHOTOS}</span>
      </div>

      {/* Committed photos */}
      {photos.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={tr.photo_upload_label}>
          {photos.map((photo, idx) => (
            <li key={photo.id} className="flex items-center gap-3 rtl:flex-row-reverse">
              <div className="relative w-14 h-14 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                <Image
                  src={photo.thumbnail_url ?? photo.url}
                  alt={`${tr.photo_upload_label} ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {photo.sort_order === 0 && (
                  <div className="absolute bottom-0 inset-x-0 bg-accent/80 text-white text-[9px] text-center py-0.5">
                    ★
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">
                  {photo.contributed_by_shop_id !== null ? tr.photo_from_shop : tr.photo_from_pundo}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {photo.sort_order !== 0 && itemId && (
                  <button
                    type="button"
                    onClick={() => handleSetMain(photo.id)}
                    className="text-xs text-accent hover:underline"
                  >
                    {tr.photo_set_main}
                  </button>
                )}
                {itemId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={tr.photo_delete}
                  >
                    {tr.photo_delete}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Uploading in-progress / error items */}
      {uploading.length > 0 && (
        <ul className="flex flex-col gap-2">
          {uploading.map((item) => (
            <li key={item.localId} className="flex items-center gap-3 rtl:flex-row-reverse">
              <div className="relative w-14 h-14 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                <Image
                  src={item.previewUrl}
                  alt={tr.photo_upload_label}
                  fill
                  className="object-cover opacity-60"
                  unoptimized
                />
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  {item.uploading
                    ? <span className="text-xs text-gray-500 animate-pulse">...</span>
                    : <span className="text-xs text-red-500">!</span>}
                </div>
              </div>
              {item.error && (
                <p className="flex-1 text-xs text-red-600" role="alert">{item.error}</p>
              )}
              {!item.uploading && (
                <button
                  type="button"
                  onClick={() => handleRemoveUploading(item.localId)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  aria-label={tr.photo_delete}
                >
                  {tr.photo_delete}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add photo button */}
      {canAddMore && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-300 bg-white
              px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label={tr.product_photos_add}
          >
            + {tr.product_photos_add}
          </button>
          <p className="text-xs text-gray-400">{tr.photo_upload_limit} · JPEG, PNG, WebP, max 5 MB</p>
        </div>
      )}

      {!canAddMore && (
        <p className="text-xs text-gray-400">{tr.photo_upload_limit}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        aria-label={tr.product_photos_add}
      />

      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}
