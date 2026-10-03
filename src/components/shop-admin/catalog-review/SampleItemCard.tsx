// Only imports from src/components/ui/ allowed (Clean Boundary)
// Pure/server-safe — no hooks.

import { LANGS, LANG_NATIVE_NAMES } from '@/lib/lang'
import type { CatalogCaseSampleItem } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface Props {
  item: CatalogCaseSampleItem
  tr: ShopAdminTranslations
}

export function SampleItemCard({ item, tr }: Props) {
  return (
    <article className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-4">
      {item.last_error && (
        <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
          {tr.catalog_review_item_error}
        </p>
      )}

      {/* RTL-safe: grid columns reflow automatically via logical utilities on children (ps-/pe-, border-s) */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Vorher — Rohdaten */}
        <div className="flex flex-col gap-2 md:border-e md:pe-4 border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{tr.catalog_review_before}</h3>
          <p className="text-sm font-medium text-gray-900">{item.raw_name ?? '—'}</p>
          {item.raw_description && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.raw_description}</p>
          )}
          <p className="text-xs text-gray-500">
            {tr.catalog_review_raw_category}: {item.raw_category_path ?? '—'}
          </p>
        </div>

        {/* Nachher — angereichert */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{tr.catalog_review_after}</h3>

          <div className="flex flex-col gap-1">
            {LANGS.map((lang) => {
              const name = item.names?.[lang]
              const description = item.descriptions?.[lang]
              return (
                <div key={lang} className="text-sm">
                  <span className="text-xs text-gray-400 me-1">{LANG_NATIVE_NAMES[lang]}:</span>
                  {name ? (
                    <span className="text-gray-900">{name}</span>
                  ) : (
                    <span className="text-gray-300 italic" title={tr.catalog_review_missing_field}>—</span>
                  )}
                  {description && (
                    <span className="block text-xs text-gray-500">{description}</span>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-gray-500">
            {tr.catalog_review_pundo_category}: {item.category_path ?? '—'}
          </p>

          {item.attributes && Object.keys(item.attributes).length > 0 && (
            <div className="text-xs text-gray-500">
              <p className="font-medium text-gray-700">{tr.catalog_review_attributes}</p>
              <ul className="list-disc list-inside">
                {Object.entries(item.attributes).map(([key, value]) => (
                  <li key={key}>{key}: {String(value)}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400">
            {tr.catalog_review_embedding_status.replace('{status}', item.status)}
          </p>
        </div>
      </div>
    </article>
  )
}
