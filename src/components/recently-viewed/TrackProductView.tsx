'use client'

// =============================================================================
// src/components/recently-viewed/TrackProductView.tsx
//
// Side-effect-only component. On mount, records the product in recently-viewed.
// Renders nothing. Must be 'use client' for useEffect access.
// =============================================================================

import { useEffect } from 'react'
import { addProduct } from '@/lib/recently-viewed'

interface TrackProductViewProps {
  product: {
    id: number
    slug: string
    name: string
    image_url: string | null
    price_display?: string | null
  }
}

export function TrackProductView({ product }: TrackProductViewProps) {
  useEffect(() => {
    addProduct({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image_url: product.image_url,
      price_display: product.price_display ?? null,
      viewed_at: Date.now(),
    })
  // Only run once on mount — product identity is stable for the page lifetime
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  return null
}
