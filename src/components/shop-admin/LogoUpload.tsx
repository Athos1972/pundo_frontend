'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useRef, useState } from 'react'
import Image from 'next/image'
import { tAdmin } from '@/lib/shop-admin-translations'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

interface LogoUploadProps {
  currentLogoUrl: string | null
  lang: string
  onLogoUploaded: (newLogoUrl: string) => void
}

export function LogoUpload({ currentLogoUrl, lang, onLogoUploaded }: LogoUploadProps) {
  const tr = tAdmin(lang)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (file.size > MAX_BYTES) {
      setError(tr.logo_upload_size_error)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setIsUploading(true)

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/shop-admin/shop/logo', {
        method: 'POST',
        body: form,
      })

      if (res.ok) {
        const data: { logo_url: string } = await res.json()
        onLogoUploaded(data.logo_url)
        setPreview(data.logo_url)
      } else {
        const body = await res.json().catch(() => ({}))
        const detail: string = (body as { detail?: string }).detail ?? tr.logo_upload_error
        setError(detail)
        setPreview(currentLogoUrl)
      }
    } catch {
      setError(tr.logo_upload_error)
      setPreview(currentLogoUrl)
    } finally {
      setIsUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{tr.logo_upload_label}</label>

      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="relative w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
          {preview ? (
            <Image
              src={preview}
              alt="Shop logo"
              fill
              className="object-contain"
              unoptimized={preview.startsWith('blob:')}
            />
          ) : (
            <span className="text-2xl text-gray-300 select-none">&#128247;</span>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-xs text-gray-500">...</span>
            </div>
          )}
        </div>

        {/* Upload button */}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white
              px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? '...' : tr.logo_upload_button}
          </button>
          <p className="text-xs text-gray-400">JPEG, PNG, WebP &mdash; max 5 MB</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          aria-label={tr.logo_upload_label}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}

      {/* URL fallback toggle */}
      <button
        type="button"
        onClick={() => setShowUrlInput((v) => !v)}
        className="self-start text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
      >
        {tr.logo_or_url}
      </button>

      {showUrlInput && (
        <input
          type="url"
          placeholder="https://..."
          defaultValue={preview && !preview.startsWith('blob:') ? preview : ''}
          onChange={(e) => {
            const val = e.target.value.trim()
            if (val) {
              setPreview(val)
              onLogoUploaded(val)
            }
          }}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          aria-label={tr.logo_url}
        />
      )}
    </div>
  )
}
