'use client'
// ─── CRM card image viewer (F7600 Stufe 2; org cut: the images are proofs of a source) ───────────────────────────────
// Front/back thumbnails of the business card behind one source of an organisation. Images come from the auth-gated
// endpoint GET /api/v1/admin/crm/orgs/{org_id}/sources/{source_id}/card-image/{front|back}; the browser sends the admin
// cookie (same origin through the /api/v1 rewrite). Thumbnail click opens a lightbox. Renders nothing without a front
// image (`has_card_image.front`).

import { useState } from 'react'
import { crmPath } from './crmPaths'
import type { CrmSourceOut } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface CardImageViewerProps {
  orgId: number
  source: Pick<CrmSourceOut, 'id' | 'has_card_image'>
  tr: SysAdminTranslations
}

export function cardImageUrl(orgId: number, sourceId: number, side: 'front' | 'back'): string {
  return `/api/v1/admin/${crmPath('orgCardImage', { org_id: orgId, source_id: sourceId, side })}`
}

function CardThumb({ src, label, onExpand, expandLabel }: { src: string; label: string; onExpand: () => void; expandLabel: string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <button
        type="button"
        onClick={onExpand}
        className="rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
        aria-label={expandLabel}
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

export function CardImageViewer({ orgId, source, tr }: CardImageViewerProps) {
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null)

  if (!source.has_card_image.front) return null

  const frontSrc = cardImageUrl(orgId, source.id, 'front')
  const backSrc = source.has_card_image.back ? cardImageUrl(orgId, source.id, 'back') : null

  return (
    <div className="flex flex-col gap-2" data-testid={`crm-card-images-${source.id}`}>
      <h3 className="text-xs font-semibold text-gray-700">{tr.crm_card_images_title}</h3>
      <div className="flex flex-wrap gap-4">
        <CardThumb
          src={frontSrc}
          label={tr.crm_card_front}
          expandLabel={`${tr.crm_card_expand}: ${tr.crm_card_front}`}
          onExpand={() => setLightbox({ src: frontSrc, label: tr.crm_card_front })}
        />
        {backSrc && (
          <CardThumb
            src={backSrc}
            label={tr.crm_card_back}
            expandLabel={`${tr.crm_card_expand}: ${tr.crm_card_back}`}
            onExpand={() => setLightbox({ src: backSrc, label: tr.crm_card_back })}
          />
        )}
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.label}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-white text-sm font-medium">{lightbox.label}</span>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="text-white hover:text-gray-300 text-xl leading-none"
                aria-label={tr.close}
              >
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.src} alt={lightbox.label} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
