'use client'
// Clean Boundary: only imports from @/lib/shop-admin-translations

import { tAdmin } from '@/lib/shop-admin-translations'

interface FieldCatalogProps {
  lang: string
}

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
            <tr>
              <td className="py-1.5 pe-3">
                <code dir="ltr" className="inline-block bg-gray-100 rounded px-1 font-mono">name</code>
              </td>
              <td className="py-1.5 pe-3">
                <span className="text-red-600 font-medium">{tr.field_catalog_required_yes}</span>
              </td>
              <td className="py-1.5 pe-3 text-gray-600">{tr.field_name_desc}</td>
              <td className="py-1.5">
                <code dir="ltr" className="inline-block bg-gray-100 rounded px-1 font-mono text-gray-700">Royal Canin Adult Cat 5kg</code>
              </td>
            </tr>
            <tr>
              <td className="py-1.5 pe-3">
                <code dir="ltr" className="inline-block bg-gray-100 rounded px-1 font-mono">category</code>
              </td>
              <td className="py-1.5 pe-3 text-gray-500">{tr.field_catalog_required_no}</td>
              <td className="py-1.5 pe-3 text-gray-600">{tr.field_category_desc}</td>
              <td className="py-1.5">
                <code dir="ltr" className="inline-block bg-gray-100 rounded px-1 font-mono text-gray-700">Cat Food</code>
              </td>
            </tr>
            <tr>
              <td className="py-1.5 pe-3">
                <code dir="ltr" className="inline-block bg-gray-100 rounded px-1 font-mono">available</code>
              </td>
              <td className="py-1.5 pe-3 text-gray-500">{tr.field_catalog_required_no}</td>
              <td className="py-1.5 pe-3 text-gray-600">{tr.field_available_desc}</td>
              <td className="py-1.5">
                <code dir="ltr" className="inline-block bg-gray-100 rounded px-1 font-mono text-gray-700">true</code>
              </td>
            </tr>
            <tr>
              <td className="py-1.5 pe-3">
                <code dir="ltr" className="inline-block bg-gray-100 rounded px-1 font-mono">image_url</code>
              </td>
              <td className="py-1.5 pe-3 text-gray-500">{tr.field_catalog_required_no}</td>
              <td className="py-1.5 pe-3 text-gray-600">{tr.field_image_url_desc}</td>
              <td className="py-1.5">
                <code dir="ltr" className="inline-block bg-gray-100 rounded px-1 font-mono text-gray-700">https://example.com/product.jpg</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400 italic">{tr.field_catalog_footnote}</p>
    </details>
  )
}
