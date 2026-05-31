'use client'
import { useEffect } from 'react'
import { trackPixelEvent, PixelEvents } from '@/lib/meta-pixel'

interface Props {
  contentName: string
  contentId: string
  contentType: 'product' | 'shop'
}

export function PixelViewContent({ contentName, contentId, contentType }: Props) {
  useEffect(() => {
    trackPixelEvent(PixelEvents.ViewContent, {
      content_name: contentName,
      content_ids: [contentId],
      content_type: contentType,
    })
  }, [contentName, contentId, contentType])

  return null
}
