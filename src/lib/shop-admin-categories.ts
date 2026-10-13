// Shop-Admin category picker client (B5900-011).
// Browser-side fetch helpers via the same-origin proxy /api/shop-admin/[...path].
// Clean Boundary: only imports from @/types/shop-admin.

import type { CategorySuggestion, ItemType, PickerCategory } from '@/types/shop-admin'

export class CategoryFetchError extends Error {
  status: number
  constructor(status: number) {
    super(`Category request failed with status ${status}`)
    this.name = 'CategoryFetchError'
    this.status = status
  }
}

async function getItems<T>(url: string, lang: string, signal?: AbortSignal): Promise<T[]> {
  const res = await fetch(url, { headers: { 'Accept-Language': lang }, signal })
  if (!res.ok) throw new CategoryFetchError(res.status)
  const data = (await res.json()) as { items?: T[] }
  return data.items ?? []
}

export interface FetchPickerCategoriesParams {
  lang: string
  itemType: ItemType
  parentId?: number | null
  q?: string
  limit?: number
  signal?: AbortSignal
}

export function fetchPickerCategories(p: FetchPickerCategoriesParams): Promise<PickerCategory[]> {
  const qs = new URLSearchParams({ item_type: p.itemType })
  if (p.q !== undefined) qs.set('q', p.q)
  else if (p.parentId != null) qs.set('parent_id', String(p.parentId))
  if (p.limit) qs.set('limit', String(p.limit))
  return getItems<PickerCategory>(`/api/shop-admin/categories?${qs}`, p.lang, p.signal)
}

export interface FetchCategorySuggestionsParams {
  lang: string
  itemType: ItemType
  name: string
  limit?: number
  signal?: AbortSignal
}

export function fetchCategorySuggestions(p: FetchCategorySuggestionsParams): Promise<CategorySuggestion[]> {
  const qs = new URLSearchParams({ name: p.name, item_type: p.itemType })
  if (p.limit) qs.set('limit', String(p.limit))
  return getItems<CategorySuggestion>(`/api/shop-admin/categories/suggest?${qs}`, p.lang, p.signal)
}

export function taxonomyForItemType(itemType: ItemType): 'google' | 'unspsc' {
  return itemType === 'service' ? 'unspsc' : 'google'
}
