'use client'
// System-Admin review queue for borderline backfill categorisations (B5982-001, /admin/category-review).
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary).

import { useCallback, useState } from 'react'
import type { SysAdminCategoryReviewItem, SysAdminCategory } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { Combobox } from './Combobox'
import type { ComboboxItem } from './Combobox'
import { showToast } from './Toast'

interface Props {
  items: SysAdminCategoryReviewItem[]
  tr: SysAdminTranslations
}

const SEARCH_LIMIT = 50

async function searchCategories(query: string): Promise<ComboboxItem[]> {
  const qs = new URLSearchParams({ limit: String(SEARCH_LIMIT) })
  if (query) qs.set('q', query)
  const res = await fetch(`/api/admin/categories?${qs}`)
  if (!res.ok) return []
  const data = (await res.json()) as { items?: SysAdminCategory[] }
  const seen = new Set<number>() // the category search joins translations: one row per matching translation
  return (data.items ?? [])
    .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
    .map((c) => ({ value: String(c.id), label: c.name ?? c.external_id, subLabel: c.path ?? c.external_id }))
}

function pct(v: number | null): string {
  return v == null ? '–' : `${Math.round(v * 100)} %`
}

export function CategoryReviewList({ items: initial, tr }: Props) {
  const [items, setItems] = useState(initial)
  const [busy, setBusy] = useState<number | null>(null)
  const [chosen, setChosen] = useState<Record<number, string>>({})
  const load = useCallback((q: string) => searchCategories(q), [])

  async function decide(item: SysAdminCategoryReviewItem, action: 'accept' | 'assign' | 'reject') {
    setBusy(item.item_id)
    try {
      const body = action === 'assign' ? JSON.stringify({ category_id: Number(chosen[item.item_id]) }) : undefined
      // Admin proxy: attaches the admin_token cookie.
      const res = await fetch(`/api/admin/category-review/${item.item_id}/${action}`, {
        method: 'POST',
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body } : {}),
      })
      if (!res.ok) {
        showToast(tr.crv_error, 'error')
        return
      }
      showToast(tr.crv_saved, 'success')
      setItems((list) => list.filter((i) => i.item_id !== item.item_id))
    } catch {
      showToast(tr.crv_error, 'error')
    } finally {
      setBusy(null)
    }
  }

  if (items.length === 0) return <p className="text-sm text-gray-600">{tr.crv_empty}</p>

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.item_id} className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium text-gray-900">{item.name ?? `#${item.item_id}`}</p>
            {item.product_url && (
              <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 underline">
                {tr.crv_open_product}
              </a>
            )}
          </div>
          <p className="text-sm text-gray-700">
            <span className="text-gray-500">{tr.crv_proposal}: </span>
            {item.proposed_category_path ?? tr.crv_no_proposal}
            <span className="ml-3 text-xs text-gray-500">
              {tr.crv_confidence}: {pct(item.descent_confidence)} {tr.crv_confidence_final} · {pct(item.first_confidence)} {tr.crv_confidence_first}
            </span>
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              disabled={busy === item.item_id || item.proposed_category_id == null}
              onClick={() => decide(item, 'accept')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg disabled:opacity-50"
            >
              {tr.crv_accept}
            </button>
            <div className="w-72">
              <Combobox
                items={[]}
                loadItems={load}
                value={chosen[item.item_id] ?? ''}
                onChange={(v) => setChosen((c) => ({ ...c, [item.item_id]: v }))}
                placeholder={tr.crv_assign_search}
                noResultsLabel={tr.no_results}
                disabled={busy === item.item_id}
              />
            </div>
            <button
              type="button"
              disabled={busy === item.item_id || !chosen[item.item_id]}
              onClick={() => decide(item, 'assign')}
              className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {tr.crv_assign}
            </button>
            <button
              type="button"
              disabled={busy === item.item_id}
              onClick={() => decide(item, 'reject')}
              className="px-3 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {tr.crv_reject}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
