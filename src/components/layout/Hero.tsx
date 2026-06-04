'use client'

import Link from 'next/link'
import { SearchBar } from '@/components/search/SearchBar'
import { CategoryChips } from '@/components/search/CategoryChips'
import type { BrandConfig } from '@/config/brands'
import type { CategoryItem } from '@/types/api'
import { t } from '@/lib/translations'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import { ContactCtaLink } from '@/components/contact/ContactCtaLink'
import { HomepageHeroVisual } from '@/components/home/HomepageHeroVisual'

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
  lang: Lang
  preserveOrder?: boolean
}

export function Hero({ brand, categories, lang, preserveOrder = false }: Props) {
  const tr = t(lang)

  const catGrid = categories.slice(0, 6)

  const slug = brand.slug as 'pundo' | 'naidivse'
  const titleKey = `hero_title_${slug}` as keyof typeof tr
  const taglineKey = `hero_tagline_${slug}` as keyof typeof tr
  const heroTitle = (tr[titleKey] as string) || brand.meta.heroTitle
  const heroTagline = (tr[taglineKey] as string) || brand.meta.heroTagline

  return (
    <section className="bg-surface border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left column — text + search */}
          <div className="space-y-4 max-w-2xl">
            {/* Eyebrow chip */}
            <div className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span className="text-xs font-semibold text-accent uppercase tracking-widest">
                {tr.homepage_eyebrow}
              </span>
            </div>

            <div>
              <h1 className="font-display text-2xl md:text-4xl font-extrabold text-text leading-tight">
                {heroTitle}{' '}
                {tr.homepage_headline_accent && (
                  <span className="text-accent">{tr.homepage_headline_accent}</span>
                )}
              </h1>
              {heroTagline && (
                <p className="mt-1 text-text-muted font-medium text-base">{heroTagline}</p>
              )}
            </div>

            {/* Sub-headline from homepage_sub — only for pundo brand */}
            {slug === 'pundo' && tr.homepage_sub && (
              <p className="text-sm text-text-muted leading-relaxed">{tr.homepage_sub}</p>
            )}

            {/* catsfirst grid — BYTE-IDENTICAL feature-flag block */}
            {brand.features.catsfirst && catGrid.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {catGrid.map((cat) => (
                  <Link
                    key={cat.id}
                    href={localePath(lang, `/search?category_id=${cat.id}`)}
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

            <SearchBar placeholder={tr.search_placeholder} lang={lang} />

            <ContactCtaLink variant="inline" lang={lang} />

            {/* CategoryChips — BYTE-IDENTICAL feature-flag block */}
            {!brand.features.catsfirst && (
              <CategoryChips categories={categories} lang={lang} preserveOrder={preserveOrder} />
            )}

            {/* Trust row — pundo brand only */}
            {slug === 'pundo' && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                <span className="text-xs text-text-muted font-medium">{tr.homepage_trust_businesses}</span>
                <span className="text-text-muted/40 text-xs">·</span>
                <span className="text-xs text-text-muted font-medium">{tr.homepage_trust_cities}</span>
                <span className="text-text-muted/40 text-xs">·</span>
                <span className="text-xs text-text-muted font-medium">{tr.homepage_trust_languages}</span>
              </div>
            )}
          </div>

          {/* Right column — Cyprus map visual (pundo only, desktop only) */}
          {slug === 'pundo' && (
            <HomepageHeroVisual className="hidden md:flex" />
          )}
        </div>
      </div>
    </section>
  )
}
