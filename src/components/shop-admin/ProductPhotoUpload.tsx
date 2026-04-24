'use client'
// Clean Boundary: only imports from src/components/ui/, @/lib/shop-admin-translations,
// @/types/shop-admin, React/Next primitives allowed here.

import { useRef, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { AdminProductImage } from '@/types/shop-admin'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_IMAGES = 8
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// A pending file waiting to be uploaded (used in create-mode before productId is known)
export interface PendingFile {
  localId: string   // random key for React
  file: File
  previewUrl: string  // blob URL for preview
}

interface ProductPhotoUploadProps {
  /** undefined in create-mode — upload deferred until after product POST */
  productId?: number
  /** Already-saved server images */
  images: AdminProductImage[]
  /** Called whenever the committed image list changes */
  onChange: (images: AdminProductImage[]) => void
  /** Called in create-mode whenever pending files change */
  onPendingFilesChange?: (files: File[]) => void
  lang: string
}

interface UploadingItem {
  localId: string
  previewUrl: string
  uploading: boolean
  error: string | null
}

export function ProductPhotoUpload({
  productId,
  images,
  onChange,
  onPendingFilesChange,
  lang,
}: ProductPhotoUploadProps) {
  const tr = tAdmin(lang)
  const fileRef = useRef<HTMLInputElement>(null)

  // Uploading items shown with spinner / inline error during actual upload
  const [uploading, setUploading] = useState<UploadingItem[]>([])
  // Pending files for create-mode (no productId yet)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  // Global inline error (size / type / limit before upload attempt)
  const [error, setError] = useState<string | null>(null)

  // Notify parent whenever pendingFiles change
  useEffect(() => {
    onPendingFilesChange?.(pendingFiles.map((p) => p.file))
  }, [pendingFiles, onPendingFilesChange])

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      uploading.forEach((u) => {
        if (u.previewUrl.startsWith('blob:')) URL.revokeObjectURL(u.previewUrl)
      })
    }
    // intentionally only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalCount = images.length + pendingFiles.length + uploading.length

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      // reset input so same file can be re-selected after error
      if (fileRef.current) fileRef.current.value = ''

      setError(null)

      // Validate size
      if (file.size > MAX_BYTES) {
        setError(tr.product_photos_size_error)
        return
      }

      // Validate type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(tr.product_photos_type_error)
        return
      }

      // Validate limit
      if (totalCount >= MAX_IMAGES) {
        setError(tr.product_photos_limit_error)
        return
      }

      const previewUrl = URL.createObjectURL(file)

      if (!productId) {
        // Create-mode: just queue locally
        const localId = `pending-${Date.now()}-${Math.random()}`
        setPendingFiles((prev) => [...prev, { localId, file, previewUrl }])
        return
      }

      // Edit-mode: upload immediately
      const localId = `uploading-${Date.now()}-${Math.random()}`
      setUploading((prev) => [...prev, { localId, previewUrl, uploading: true, error: null }])

      try {
        const form = new FormData()
        form.append('file', file)

        const res = await fetch(`/api/shop-admin/products/${productId}/images`, {
          method: 'POST',
          body: form,
        })

        if (res.ok) {
          const data = await res.json() as { id: number; url: string; sort_order: number }
          URL.revokeObjectURL(previewUrl)
          // Remove from uploading list and add to committed images
          setUploading((prev) => prev.filter((u) => u.localId !== localId))
          onChange([...images, { id: data.id, url: data.url, sort_order: data.sort_order }])
        } else {
          const body = await res.json().catch(() => ({}))
          const detail = (body as { detail?: string }).detail ?? ''
          const errMsg = detail === 'max_images_reached'
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
            u.localId === localId
              ? { ...u, uploading: false, error: tr.product_photos_upload_error }
              : u
          )
        )
      }
    },
    [productId, totalCount, images, onChange, tr]
  )

  function handleRemoveCommitted(imageId: number) {
    onChange(images.filter((img) => img.id !== imageId))
  }

  function handleRemovePending(localId: string) {
    setPendingFiles((prev) => {
      const item = prev.find((p) => p.localId === localId)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((p) => p.localId !== localId)
    })
  }

  function handleRemoveUploading(localId: string) {
    setUploading((prev) => {
      const item = prev.find((u) => u.localId === localId)
      if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((u) => u.localId !== localId)
    })
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    const next = [...images]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange(next.map((img, i) => ({ ...img, sort_order: i })))
  }

  function handleMoveDown(index: number) {
    if (index >= images.length - 1) return
    const next = [...images]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    onChange(next.map((img, i) => ({ ...img, sort_order: i })))
  }

  const canAddMore = totalCount < MAX_IMAGES

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {tr.product_photos}
        </label>
        <span className="text-xs text-gray-400">
          {totalCount}/{MAX_IMAGES}
        </span>
      </div>

      {/* Committed server images */}
      {images.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={tr.product_photos}>
          {images.map((img, idx) => (
            <li
              key={img.id}
              className="flex items-center gap-3 rtl:flex-row-reverse"
            >
              {/* Thumbnail */}
              <div className="relative w-14 h-14 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                <Image
                  src={img.url}
                  alt={`${tr.product_photos} ${idx + 1} / ${images.length}`}
                  fill
                  className="object-cover"
                  unoptimized
                  aria-label={`${tr.product_photos} ${idx + 1} / ${images.length}`}
                />
              </div>

              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  aria-label={tr.product_photos_move_up}
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400
                    hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
                    transition-colors"
                >
                  &#9650;
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === images.length - 1}
                  aria-label={tr.product_photos_move_down}
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400
                    hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
                    transition-colors"
                >
                  &#9660;
                </button>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveCommitted(img.id)}
                aria-label={`${tr.product_photos_remove} ${idx + 1}`}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 rtl:mr-auto ltr:ml-auto"
              >
                {tr.product_photos_remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Pending (create-mode) previews */}
      {pendingFiles.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="pending photos">
          {pendingFiles.map((pf, idx) => (
            <li
              key={pf.localId}
              className="flex items-center gap-3 rtl:flex-row-reverse"
            >
              <div className="relative w-14 h-14 shrink-0 rounded-lg border border-blue-200 bg-blue-50 overflow-hidden">
                <Image
                  src={pf.previewUrl}
                  alt={`${tr.product_photos} ${images.length + idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {/* Pending indicator */}
                <div className="absolute inset-0 bg-blue-500/10 flex items-end justify-center pb-0.5">
                  <span className="text-[9px] text-blue-700 font-medium bg-white/80 px-1 rounded">
                    pending
                  </span>
                </div>
              </div>
              <span className="flex-1 min-w-0 text-xs text-gray-500 truncate">
                {pf.file.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemovePending(pf.localId)}
                aria-label={`${tr.product_photos_remove} pending ${idx + 1}`}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
              >
                {tr.product_photos_remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Uploading in-progress / error items */}
      {uploading.length > 0 && (
        <ul className="flex flex-col gap-2">
          {uploading.map((item) => (
            <li
              key={item.localId}
              className="flex items-center gap-3 rtl:flex-row-reverse"
            >
              <div className="relative w-14 h-14 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                <Image
                  src={item.previewUrl}
                  alt={tr.product_photos}
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
                  aria-label={tr.product_photos_remove}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
                >
                  {tr.product_photos_remove}
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
          <p className="text-xs text-gray-400">{tr.product_photos_hint}</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        aria-label={tr.product_photos_add}
      />

      {/* Global validation error */}
      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}
