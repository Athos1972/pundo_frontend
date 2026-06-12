// src/components/home/HomepageCategoryGrid.tsx — Server Component
// Hover effects are pure CSS (group-hover) — no state, no 'use client'
import Link from 'next/link'
import Image from 'next/image'
import type { Lang } from '@/lib/lang'
import { tHome } from '@/lib/translations'
import { localePath } from '@/lib/routing'

// Seed-visual paths are centrally defined here.
// All 6 files verified present in public/seed-visuals/ (2026-06-04).
// V1: links via ?q=<term> (free-text). V1.1 delta: use ?category_id=<id> when
// a backend counts endpoint is available (see architecture §2.3).
const CATEGORIES = [
  {
    labelKey: 'cat_fashion' as const,
    image: '/seed-visuals/mode-boutique-interior.webp',
    searchTerm: 'Fashion',
    icon: (
      // Heart / fashion icon
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  {
    labelKey: 'cat_tradespeople' as const,
    image: '/seed-visuals/elektroinstallation.webp',
    searchTerm: 'Electrician',
    icon: (
      // Wrench icon
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    labelKey: 'cat_health' as const,
    image: '/seed-visuals/health-store-regal.webp',
    searchTerm: 'Health',
    icon: (
      // Pulse / health icon
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    labelKey: 'cat_food' as const,
    image: '/seed-visuals/frischewaren.webp',
    searchTerm: 'Groceries',
    icon: (
      // Coffee / food icon
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/>
        <line x1="10" y1="1" x2="10" y2="4"/>
        <line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
  },
  {
    labelKey: 'cat_home' as const,
    image: '/seed-visuals/einbauschraenke.webp',
    searchTerm: 'Furniture',
    icon: (
      // Home icon
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    labelKey: 'cat_services' as const,
    image: '/seed-visuals/dienstleistungen-schreibtisch.webp',
    searchTerm: 'Services',
    icon: (
      // Sun / services icon
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
  },
] as const

interface Props {
  lang: Lang
}

export function HomepageCategoryGrid({ lang }: Props) {
  const tr = tHome(lang)

  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-1">
            {tr.category_grid_eyebrow}
          </p>
          <h2 className="font-display text-2xl font-bold text-text">
            {tr.category_grid_title}
          </h2>
        </div>

        {/* 6-card grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => {
            const label = tr[cat.labelKey]
            const href = localePath(lang, `/search?q=${encodeURIComponent(cat.searchTerm)}`)

            return (
              <Link
                key={cat.labelKey}
                href={href}
                className="group relative block aspect-[3/4] rounded-2xl overflow-hidden bg-surface-alt"
              >
                {/* Photo */}
                <Image
                  src={cat.image}
                  alt={label}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Gradient overlay for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Icon badge — top left */}
                <div className="absolute top-2 left-2 p-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white">
                  {cat.icon}
                </div>

                {/* Label — bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-2 transition-transform duration-300 group-hover:-translate-y-1">
                  <p className="text-white text-xs font-semibold leading-tight">{label}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
