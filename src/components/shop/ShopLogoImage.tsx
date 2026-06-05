'use client'

import { useState } from 'react'
import Image from 'next/image'

// Size map — matches ShopAvatar sizes
const SIZE_PX: Record<'lg' | 'md', number> = {
  lg: 96,
  md: 64,
}

const SIZE_CLASSES: Record<'lg' | 'md', string> = {
  lg: 'w-24 h-24',
  md: 'w-16 h-16',
}

const SIZE_TO_API: Record<'lg' | 'md', 'large' | 'medium'> = {
  lg: 'large',
  md: 'medium',
}

const COLOUR_PAIRS = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
] as const

function colourClass(name: string | null): string {
  if (!name) return COLOUR_PAIRS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return COLOUR_PAIRS[hash % COLOUR_PAIRS.length]
}

function initial(name: string | null): string {
  if (!name) return '?'
  const first = name.trim()[0]
  return first ? first.toUpperCase() : '?'
}

interface ShopLogoImageProps {
  /** Absolute or root-relative URL for the shop logo */
  url: string | null
  /** Shop name — used for alt text and fallback initial */
  name: string | null
  /** Visual size */
  size: 'lg' | 'md'
  /** Shop ID — when provided, used as intermediate fallback via favicon API before showing letter */
  shopId?: number
}

/**
 * Renders the shop logo via next/image.
 * Fallback chain: logo URL → favicon API (when shopId provided) → coloured initial.
 * Keeps rounded-xl shape throughout (distinct from ShopAvatar's rounded-full).
 */
export function ShopLogoImage({ url, name, size, shopId }: ShopLogoImageProps) {
  const [urlError, setUrlError] = useState(false)
  const [faviconError, setFaviconError] = useState(false)

  const px = SIZE_PX[size]
  const sizeClass = SIZE_CLASSES[size]

  if (url && !urlError) {
    return (
      <div className={`shrink-0 ${sizeClass}`}>
        <Image
          src={url}
          alt={name ?? ''}
          width={px}
          height={px}
          className="rounded-xl object-cover bg-surface border border-border w-full h-full"
          onError={() => setUrlError(true)}
        />
      </div>
    )
  }

  // Favicon API fallback — only when shopId is available and favicon not yet failed
  if (shopId !== undefined && !faviconError) {
    const faviconUrl = `/api/v1/shops/${shopId}/favicon?size=${SIZE_TO_API[size]}`
    return (
      <div className={`shrink-0 ${sizeClass} rounded-xl overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={faviconUrl}
          alt={name ?? ''}
          className="w-full h-full object-cover"
          onError={() => setFaviconError(true)}
        />
      </div>
    )
  }

  // Letter fallback
  const textSize = size === 'lg' ? 'text-2xl font-bold' : 'text-lg font-semibold'
  return (
    <div
      className={`shrink-0 ${sizeClass} rounded-xl flex items-center justify-center select-none ${colourClass(name)} ${textSize}`}
      aria-label={name ?? undefined}
      role="img"
    >
      {initial(name)}
    </div>
  )
}
