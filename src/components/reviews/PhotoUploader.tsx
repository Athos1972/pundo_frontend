'use client'

import { useRef, useState } from 'react'
import type { Translations } from '@/lib/translations'

const MAX_FILE_MB = 10
const MAX_PHOTOS = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface Props {
  reviewId: number
  tr: Translations
  onUploaded: () => void
}

export function PhotoUploader({ reviewId, tr, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const [error, setError] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError('')

    const remaining = MAX_PHOTOS - uploadCount
    const toUpload = Array.from(files).slice(0, remaining)

    for (const file of toUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(tr.reviews_photo_wrong_type)
        return
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(tr.reviews_photo_too_large)
        return
      }
    }

    setUploading(true)
    try {
      // Client-side compress before upload
      const { default: compress } = await import('browser-image-compression')

      for (const file of toUpload) {
        const compressed = await compress(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })

        const form = new FormData()
        form.append('file', compressed, file.name)

        const res = await fetch(`/api/customer/customer/reviews/${reviewId}/photos`, {
          method: 'POST',
          body: form,
        })

        if (res.ok) {
          setUploadCount((n) => n + 1)
          onUploaded()
        }
      }
    } catch {
      setError(tr.error_generic)
    } finally {
      setUploading(false)
    }
  }

  if (uploadCount >= MAX_PHOTOS) {
    return <p className="text-xs text-text-muted">{tr.reviews_max_photos(MAX_PHOTOS)}</p>
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        aria-label={tr.reviews_add_photos}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-sm text-accent hover:underline disabled:opacity-50"
      >
        {uploading ? '...' : tr.reviews_add_photos}
        {uploadCount > 0 && ` (${uploadCount}/${MAX_PHOTOS})`}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
