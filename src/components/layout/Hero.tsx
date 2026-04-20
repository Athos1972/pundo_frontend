'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SearchBar } from '@/components/search/SearchBar'
import { CategoryChips } from '@/components/search/CategoryChips'
import type { BrandConfig } from '@/config/brands'
import type { CategoryItem } from '@/types/api'
import { t } from '@/lib/translations'

const EMOJI_MAP: Record<string, string> = {
  'Pet Supplies': '🐾',
  'Dog Supplies': '🐕',
  'Cat Supplies': '🐈',
  'Bird Supplies': '🐦',
  'Fish Supplies': '🐠',
  'Small Animal Supplies': '🐹',
  'Reptile Supplies': '🦎',
}

function getEmoji(name: string | null): string {
  if (!name) return '🏪'
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji
  }
  return '🏪'
}

interface Props {
  brand: BrandConfig
  categories: CategoryItem[]
  lang: string
}

export function Hero({ brand, categories, lang }: Props) {
  const tr = t(lang)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const key = `${brand.slug}_pain_dismissed`
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(key) === '1')
  }, [brand.slug])

  function dismiss() {
    localStorage.setItem(`${brand.slug}_pain_dismissed`, '1')
    setDismissed(true)
  }

  const catGrid = categories.slice(0, 6)

  const slug = brand.slug as 'pundo' | 'naidivse' | 'rusky'
  const titleKey = `hero_title_${slug}` as keyof typeof tr
  const taglineKey = `hero_tagline_${slug}` as keyof typeof tr
  const painPointKey = `hero_pain_point_${slug === 'naidivse' ? 'naidivse' : 'pundo'}` as keyof typeof tr
  const heroTitle = (tr[titleKey] as string) || brand.meta.heroTitle
  const heroTagline = (tr[taglineKey] as string) || brand.meta.heroTagline
  const painPointText = tr[painPointKey] as string

  return (
    <section className="bg-surface border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        <div className="max-w-2xl space-y-4">
          <div>
            <h1 className="font-display text-2xl md:text-4xl font-extrabold text-text leading-tight">
              {heroTitle}
            </h1>
            {heroTagline && (
              <p className="mt-1 text-accent font-medium text-base">{heroTagline}</p>
            )}
          </div>

          {!dismissed && (
            <div className="relative border-l-[3px] border-accent bg-accent-light pl-3 pr-10 py-2 rounded-r-md">
              <p className="text-sm text-text leading-relaxed">{painPointText}</p>
              {slug === 'pundo' && (
                <Link
                  href="/contact"
                  className="text-sm text-accent underline hover:no-underline mt-1 inline-block"
                >
                  {tr.contact_missing_something}
                </Link>
              )}
              <button
                onClick={dismiss}
                aria-label="dismiss"
                className="absolute top-2 right-2 text-text-muted hover:text-text transition-colors p-1 leading-none"
              >
                ✕
              </button>
            </div>
          )}

          {brand.features.catsfirst && catGrid.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {catGrid.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/search?category_id=${cat.id}`}
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-bg border border-border p-3 hover:border-accent hover:text-accent transition-colors text-center"
                >
                  <span className="text-2xl">{getEmoji(cat.name)}</span>
                  <span className="text-xs text-text-muted leading-tight line-clamp-2">
                    {cat.name ?? cat.external_id}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <SearchBar placeholder={tr.search_placeholder} />

          {!brand.features.catsfirst && (
            <CategoryChips categories={categories} lang={lang} />
          )}
        </div>
      </div>
    </section>
  )
}
