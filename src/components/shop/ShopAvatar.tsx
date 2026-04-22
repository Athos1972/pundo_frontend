'use client'

import { useState } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

export type ShopAvatarSize = 'sm' | 'md' | 'lg'

interface ShopAvatarProps {
  /** External favicon URL from backend — null triggers fallback immediately */
  favicon_url?: string | null
  /** Shop name — used for fallback initial and alt text */
  name: string | null
  /** Shop ID — determines fallback background colour deterministically */
  shopId: number
  /** Visual size: sm=32px, md=40px, lg=80px (default: md) */
  size?: ShopAvatarSize
  className?: string
}

// ── Colour palette ───────────────────────────────────────────────────────────
// 8 pairs — index = shopId % 8

const COLOURS = [
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
] as const

// ── Size maps ────────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<ShopAvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm font-medium',
  lg: 'w-20 h-20 text-2xl font-bold',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function colourClass(shopId: number): string {
  return COLOURS[Math.abs(shopId) % COLOURS.length]
}

function fallbackInitial(name: string | null): string {
  if (!name) return '?'
  const first = name.trim()[0]
  return first ? first.toUpperCase() : '?'
}

// ── Component ────────────────────────────────────────────────────────────────

export function ShopAvatar({ favicon_url, name, shopId, size = 'md', className = '' }: ShopAvatarProps) {
  const [imgError, setImgError] = useState(false)

  const sizeClass = SIZE_CLASSES[size]
  const base = `rounded-full flex-shrink-0 overflow-hidden ${sizeClass} ${className}`

  // Show image when URL available and not yet broken
  if (favicon_url && !imgError) {
    return (
      <div className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={favicon_url}
          alt={name ?? ''}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  // Fallback: coloured circle with shop name initial
  return (
    <div
      className={`${base} flex items-center justify-center select-none ${colourClass(shopId)}`}
      aria-label={name ?? undefined}
      role="img"
    >
      {fallbackInitial(name)}
    </div>
  )
}
