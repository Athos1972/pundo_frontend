// Only imports from src/components/ui/ allowed (Clean Boundary)
// Pure/server-safe — no hooks.

import { LANGS } from '@/lib/lang'
import type { CatalogCaseSampleResponse } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { SampleItemCard } from './SampleItemCard'

interface Props {
  sample: CatalogCaseSampleResponse
  tr: ShopAdminTranslations
}

// R1 (02-architecture.md §0.1): CatalogCaseListItem has no authoritative language-coverage
// field. Derived here from the sample's names dicts and explicitly labelled "(sample)" —
// not a case-wide metric.
function deriveLangCoverage(items: CatalogCaseSampleResponse['sample']): number {
  const covered = new Set<string>()
  for (const item of items) {
    for (const lang of LANGS) {
      if (item.names?.[lang]) covered.add(lang)
    }
  }
  return covered.size
}

export function SampleComparison({ sample, tr }: Props) {
  const coverage = deriveLangCoverage(sample.sample)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-gray-500">
        <span>{tr.catalog_review_lang_coverage.replace('{n}', String(coverage))}</span>
        <span>
          {tr.catalog_review_sample_count
            .replace('{returned}', String(sample.sample_size_returned))
            .replace('{requested}', String(sample.sample_size_requested))}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {sample.sample.map((item) => (
          <SampleItemCard key={item.catalog_case_item_id} item={item} tr={tr} />
        ))}
      </div>
    </div>
  )
}
