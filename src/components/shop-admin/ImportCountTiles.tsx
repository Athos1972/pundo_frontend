'use client'
// Only imports from shop-admin translations/types (Clean Boundary)

import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import type { ImportPreviewCounts } from '@/types/shop-admin'

export type ImportTileTone = 'green' | 'blue' | 'gray' | 'red' | 'amber' | 'orange'

export interface ImportTile {
  key: string
  label: string
  value: number
  tone: ImportTileTone
}

const TONE: Record<ImportTileTone, string> = {
  green: 'bg-green-50 border-green-200 text-green-800',
  blue: 'bg-blue-50 border-blue-200 text-blue-800',
  gray: 'bg-gray-50 border-gray-200 text-gray-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  orange: 'bg-orange-50 border-orange-200 text-orange-800',
}

/** Tiles for the preview counters. "Will be set to not available" only for a complete list. */
export function previewTiles(counts: ImportPreviewCounts, fullList: boolean, tr: ShopAdminTranslations): ImportTile[] {
  const tiles: ImportTile[] = [
    { key: 'new', label: tr.count_new, value: counts.new, tone: 'green' },
    { key: 'updated', label: tr.count_updated, value: counts.updated, tone: 'blue' },
    { key: 'unchanged', label: tr.count_unchanged, value: counts.unchanged, tone: 'gray' },
    { key: 'error', label: tr.count_error, value: counts.error, tone: 'red' },
    { key: 'possible_duplicate', label: tr.count_possible_duplicate, value: counts.possible_duplicate, tone: 'amber' },
  ]
  if (fullList) tiles.push({ key: 'deactivate', label: tr.count_deactivate, value: counts.deactivate, tone: 'orange' })
  return tiles
}

interface ImportCountTilesProps {
  tiles: ImportTile[]
  /** compact = single wrapping line of small chips (Google-Sheets status) */
  compact?: boolean
  testId?: string
}

export function ImportCountTiles({ tiles, compact = false, testId = 'import-count-tiles' }: ImportCountTilesProps) {
  if (compact) {
    return (
      <ul data-testid={testId} className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {tiles.map((t) => (
          <li key={t.key} data-tile={t.key} className={t.value > 0 && t.tone === 'red' ? 'text-red-600' : 'text-gray-600'}>
            <span dir="ltr" className="font-semibold">{t.value}</span> {t.label}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <dl data-testid={testId} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {tiles.map((t) => (
        <div key={t.key} data-tile={t.key} className={`flex flex-col-reverse rounded-lg border px-3 py-2 ${TONE[t.tone]}`}>
          <dt className="text-xs leading-tight">{t.label}</dt>
          <dd dir="ltr" className="text-xl font-bold text-start">{t.value}</dd>
        </div>
      ))}
    </dl>
  )
}
