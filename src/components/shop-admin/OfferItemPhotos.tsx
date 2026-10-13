'use client'
// Clean Boundary: only imports from react, @/lib/shop-admin-*, @/types/shop-admin, sibling shop-admin components

import { useCallback, useEffect, useState } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { ItemPhotoUpload } from './ItemPhotoUpload'
import type { AdminItem, AdminItemPhoto } from '@/types/shop-admin'

interface OfferItemPhotosProps {
  itemId: number
  ownShopId: number | null
  lang: string
  /** Called after every change with the new cover URL (thumbnail_url ?? url) or null. */
  onCoverChange?: (coverUrl: string | null) => void
}

type LoadState = 'loading' | 'error' | 'ready'

function coverOf(photos: AdminItemPhoto[]): string | null {
  const first = [...photos].sort((a, b) => a.sort_order - b.sort_order)[0]
  return first ? (first.thumbnail_url ?? first.url) : null
}

export function OfferItemPhotos({ itemId, ownShopId, lang, onCoverChange }: OfferItemPhotosProps) {
  const tr = tAdmin(lang)
  const [photos, setPhotos] = useState<AdminItemPhoto[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/shop-admin/items/${itemId}`)
        if (!res.ok) throw new Error(String(res.status))
        const item = await res.json() as Pick<AdminItem, 'photos'>
        if (cancelled) return
        setPhotos(
          (item.photos ?? [])
            .map((p) => ({ ...p, item_id: itemId }))
            .sort((a, b) => a.sort_order - b.sort_order),
        )
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => { cancelled = true }
  }, [itemId, attempt])

  const handleChange = useCallback((next: AdminItemPhoto[]) => {
    setPhotos(next)
    onCoverChange?.(coverOf(next))
  }, [onCoverChange])

  if (state === 'loading') {
    return <p className="text-xs text-gray-400 animate-pulse" data-testid="offer-item-photos-loading">...</p>
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col gap-2" data-testid="offer-item-photos-error">
        <p className="text-xs text-red-600" role="alert">{tr.photo_load_error}</p>
        <button
          type="button"
          onClick={() => { setState('loading'); setAttempt((a) => a + 1) }}
          className="self-start text-xs text-accent hover:underline"
        >
          {tr.photo_retry}
        </button>
      </div>
    )
  }

  return (
    <ItemPhotoUpload
      itemId={itemId}
      photos={photos}
      onChange={handleChange}
      lang={lang}
      ownShopId={ownShopId}
    />
  )
}
