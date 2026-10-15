'use client'
// Clean Boundary: only imports from @/lib/shop-admin-translations

import { tAdmin } from '@/lib/shop-admin-translations'

interface FieldCatalogProps {
  lang: string
}

type DescKey = 'field_name_desc' | 'field_category_desc' | 'field_available_desc' | 'field_image_url_desc'
  | 'fc_sku_desc' | 'fc_language_desc' | 'fc_ean_desc' | 'fc_price_desc' | 'fc_currency_desc'

// The nine columns of the import template, in template order. Column names and example values stay literal.
const FIELDS: { col: string; required?: boolean; desc: DescKey; example: string }[] = [
  { col: 'sku', desc: 'fc_sku_desc', example: 'RC-CAT-5' },
  { col: 'name', required: true, desc: 'field_name_desc', example: 'Royal Canin Adult Cat 5kg' },
  { col: 'language', desc: 'fc_language_desc', example: 'en' },
  { col: 'ean', desc: 'fc_ean_desc', example: '4006381333931' },
  { col: 'category', desc: 'field_category_desc', example: 'Cat Food' },
  { col: 'available', desc: 'field_available_desc', example: 'true' },
  { col: 'price', desc: 'fc_price_desc', example: '29.99' },
  { col: 'currency', desc: 'fc_currency_desc', example: 'EUR' },
  { col: 'image_url', desc: 'field_image_url_desc', example: 'https://example.com/product.jpg' },
]

export function FieldCatalog({ lang }: FieldCatalogProps) {
  const tr = tAdmin(lang)

  return (
    <details open className="border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
      <summary className="font-semibold text-gray-800 cursor-pointer list-none flex items-center gap-2">
        <span className="text-base">&#9660;</span>
        {tr.field_catalog_title}
      </summary>

      <p className="mt-3 text-xs text-gray-500">{tr.field_catalog_intro}</p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-start py-1.5 pe-3 font-medium text-gray-600">{tr.field_catalog_col_name}</th>
              <th className="text-start py-1.5 pe-3 font-medium text-gray-600">{tr.field_catalog_col_required}</th>
              <th className="text-start py-1.5 pe-3 font-medium text-gray-600">{tr.field_catalog_col_desc}</th>
              <th className="text-start py-1.5 font-medium text-gray-600">{tr.field_catalog_col_example}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {FIELDS.map((f) => (
              <tr key={f.col}>
                <td className="py-1.5 pe-3">
                  <code dir="ltr" className="inline-block bg-gray-100 rounded px-1 font-mono">{f.col}</code>
                </td>
                <td className="py-1.5 pe-3">
                  {f.required ? (
                    <span className="text-red-600 font-medium">{tr.field_catalog_required_yes}</span>
                  ) : (
                    <span className="text-gray-500">{tr.field_catalog_required_no}</span>
                  )}
                </td>
                <td className="py-1.5 pe-3 text-gray-600">{tr[f.desc]}</td>
                <td className="py-1.5">
                  <code dir="ltr" className="inline-block bg-gray-100 rounded px-1 font-mono text-gray-700 break-all">{f.example}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-4" aria-labelledby="fc-recognition-title">
        <h3 id="fc-recognition-title" className="text-xs font-semibold text-gray-800">{tr.fc_recognition_title}</h3>
        <p className="mt-1 text-xs text-gray-500">{tr.fc_recognition_intro}</p>
        <ol className="mt-1 ps-5 list-decimal text-xs text-gray-600 space-y-0.5">
          <li>{tr.fc_recognition_sku}</li>
          <li>{tr.fc_recognition_ean}</li>
          <li>{tr.fc_recognition_name}</li>
        </ol>
        <p className="mt-1 text-xs text-gray-500">{tr.fc_recognition_none}</p>
        <p className="mt-2 text-xs text-gray-500">{tr.fc_full_list_note}</p>
      </section>

      <p className="mt-3 text-xs text-gray-400 italic">{tr.field_catalog_footnote}</p>
    </details>
  )
}
