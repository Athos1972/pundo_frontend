import Image from 'next/image'
import type { AdminOfferItemEmbed } from '@/types/shop-admin'
import { getSeedVisualPath } from '@/lib/seed-visuals'

interface OfferItemHeaderProps {
  item: AdminOfferItemEmbed | null | undefined
  lang: string
  offerId: number
}

export function resolveLocalizedName(names: Record<string, string>, lang: string): string | null {
  return names[lang] ?? names['en'] ?? names['de'] ?? Object.values(names)[0] ?? null
}

export function OfferItemHeader({ item, lang, offerId }: OfferItemHeaderProps) {
  if (!item) return null

  const primaryName = resolveLocalizedName(item.names, lang)
  const description = item.descriptions
    ? (item.descriptions[lang] ?? item.descriptions['en'] ?? null)
    : null
  // Prefer actual item photo; fall back to seed-visual for tmpl- items (transitional until backfill runs)
  const rawPhotoUrl = item.photos[0]?.thumbnail_url ?? item.photos[0]?.url ?? null
  const coverUrl = rawPhotoUrl ?? getSeedVisualPath(item.slug)
  const altText = primaryName ?? `Item #${item.id}`

  // Alle weiteren Sprachnamen als Sekundärzeile (alle außer dem primären)
  const otherNames = Object.entries(item.names).filter(([code]) => code !== lang)

  return (
    <div className="flex items-start gap-4 bg-gray-50 rounded-xl border border-gray-200 p-4 rtl:flex-row-reverse">
      {/* Foto oder Platzhalter */}
      <div className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={altText}
            width={96}
            height={96}
            className="object-cover w-full h-full"
            unoptimized
          />
        ) : (
          <svg aria-hidden="true" className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 10V7" />
          </svg>
        )}
      </div>
      {/* Texte */}
      <div className="flex-1 min-w-0">
        {primaryName && (
          <p className="text-lg font-semibold text-gray-900 truncate">{primaryName}</p>
        )}
        {otherNames.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {otherNames.map(([code, name]) => `${code}: ${name}`).join('  ')}
          </p>
        )}
        {item.category_name && (
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
            {item.category_name}
          </span>
        )}
        {description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  )
}
