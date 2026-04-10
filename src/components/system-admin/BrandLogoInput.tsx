'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import Image from 'next/image'

interface BrandLogoInputProps {
  brandId: number | null
  value: string | null
  onChange: (url: string) => void
  urlTabLabel: string
  uploadTabLabel: string
  logoUrlLabel: string
  logoPreviewLabel: string
  uploadLabel: string
  uploadingLabel: string
  errorMessage: string
}

export function BrandLogoInput({
  brandId,
  value,
  onChange,
  urlTabLabel,
  uploadTabLabel,
  logoUrlLabel,
  logoPreviewLabel,
  uploadLabel,
  uploadingLabel,
  errorMessage,
}: BrandLogoInputProps) {
  const [tab, setTab] = useState<'url' | 'upload'>('url')
  const [urlInput, setUrlInput] = useState(value ?? '')
  const [uploadError, setUploadError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUrlInput(e.target.value)
    onChange(e.target.value)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || brandId == null) return
    setUploadError('')

    startTransition(async () => {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch(`/api/admin/brands/${brandId}/logo`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          setUploadError(errorMessage)
          return
        }
        const data = await res.json() as { logo_url: string }
        onChange(data.logo_url)
        setUrlInput(data.logo_url)
        setTab('url')
      } catch {
        setUploadError(errorMessage)
      }
    })
  }

  const previewUrl = tab === 'url' ? urlInput : value

  return (
    <div className="flex flex-col gap-3">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab('url')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
            ${tab === 'url' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {urlTabLabel}
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
            ${tab === 'upload' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {uploadTabLabel}
        </button>
      </div>

      {tab === 'url' ? (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{logoUrlLabel}</label>
          <input
            type="url"
            value={urlInput}
            onChange={handleUrlChange}
            placeholder="https://…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-600"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {brandId == null && (
            <p className="text-xs text-amber-600">Save the brand first to enable file upload.</p>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{uploadLabel}</span>
            <input
              type="file"
              accept="image/*"
              disabled={isPending || brandId == null}
              onChange={handleFileChange}
              className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3
                file:rounded-lg file:border-0 file:text-xs file:font-medium
                file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200
                disabled:opacity-50"
            />
          </label>
          {isPending && <p className="text-xs text-gray-500">{uploadingLabel}</p>}
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">{logoPreviewLabel}</span>
          <div className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
            <Image
              src={previewUrl}
              alt="Logo preview"
              fill
              className="object-contain p-1"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  )
}
