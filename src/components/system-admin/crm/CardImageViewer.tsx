'use client'
// ─── CRM Card Image Viewer (F7600 Stufe 2) ────────────────────────────────────
// Renders front/back thumbnails for business-card contacts.
// Images are loaded from the auth-gated endpoint:
//   GET /api/v1/admin/crm/contacts/{id}/card-image/{front|back}
// The endpoint requires Admin-JWT; the browser sends the cookie automatically
// since this is a same-origin GET request from within the Admin portal.
// AK6: Thumbnail click opens a lightbox with full-size image.
// AK7: Component is not rendered when card_image_front_url is null.
// AK13: Auth is enforced server-side; the URL here resolves through the proxy.

import { useState } from 'react'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface CardImageViewerProps {
  contactId: number
  frontKey: string | null
  backKey: string | null
  tr: SysAdminTranslations
}

function CardThumb({
  src,
  label,
  onExpand,
}: {
  src: string
  label: string
  onExpand: () => void
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <button
        type="button"
        onClick={onExpand}
        className="rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors
          focus:outline-none focus:ring-2 focus:ring-slate-500"
        aria-label={`Expand ${label}`}
      >
        {/* Auth-gated endpoint — cannot use next/image (requires public URL or configured loader) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          className="object-cover"
          // @csp-allow-inline-style — fixed thumbnail dimensions, not expressible as static Tailwind
          style={{ width: 120, height: 80 }}
        />
      </button>
    </div>
  )
}

export function CardImageViewer({
  contactId,
  frontKey,
  backKey,
  tr,
}: CardImageViewerProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [lightboxLabel, setLightboxLabel] = useState<string>('')

  if (!frontKey) return null

  const baseUrl = `/api/v1/admin/crm/contacts/${contactId}/card-image`
  const frontSrc = `${baseUrl}/front`
  const backSrc = backKey ? `${baseUrl}/back` : null

  function openLightbox(src: string, label: string) {
    setLightboxSrc(src)
    setLightboxLabel(label)
  }

  function closeLightbox() {
    setLightboxSrc(null)
  }

  return (
    <>
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          {tr.crm_card_images_title}
        </h2>
        <div className="flex flex-wrap gap-4">
          <CardThumb
            src={frontSrc}
            label={tr.crm_card_front}
            onExpand={() => openLightbox(frontSrc, tr.crm_card_front)}
          />
          {backSrc && (
            <CardThumb
              src={backSrc}
              label={tr.crm_card_back}
              onExpand={() => openLightbox(backSrc, tr.crm_card_back)}
            />
          )}
        </div>
      </section>

      {/* Lightbox overlay */}
      {lightboxSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxLabel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-white text-sm font-medium">{lightboxLabel}</span>
              <button
                type="button"
                onClick={closeLightbox}
                className="text-white hover:text-gray-300 text-xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxSrc}
              alt={lightboxLabel}
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}
