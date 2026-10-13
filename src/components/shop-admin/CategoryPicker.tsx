'use client'
// Clean Boundary: only imports from @/lib/shop-admin-*, @/types/shop-admin, @/lib/lang

import { useEffect, useId, useMemo, useState } from 'react'
import { isRTL } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import {
  fetchCategorySuggestions,
  fetchPickerCategories,
  taxonomyForItemType,
} from '@/lib/shop-admin-categories'
import type { CategorySuggestion, ItemType, PickerCategory } from '@/types/shop-admin'

export interface CategoryPickerProps {
  lang: string
  itemType: ItemType
  itemName: string
  value: PickerCategory | null
  onChange: (category: PickerCategory | null) => void
  error?: string
}

const SUGGEST_DEBOUNCE_MS = 400
const SEARCH_DEBOUNCE_MS = 250
const SEARCH_LIMIT = 8
const BROWSE_LIMIT = 100

interface Fetched<T> {
  key: string
  items: T[]
  failed: boolean
}

/** UI state that must reset when the item type changes (derived, no sync setState in effects). */
interface PickerUi {
  itemType: ItemType
  query: string
  browseOpen: boolean
  stack: PickerCategory[]
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 rtl:rotate-180 ${className}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PathText({ names }: { names: string[] }) {
  if (names.length === 0) return null
  return (
    <span className="block text-xs text-gray-500 text-start">
      {names.map((n, i) => (
        <span key={`${i}-${n}`}>
          {i > 0 && (
            <span aria-hidden="true" className="inline-block mx-1 rtl:rotate-180">›</span>
          )}
          {n}
        </span>
      ))}
    </span>
  )
}

const rowCls =
  'w-full min-h-11 flex items-center justify-between gap-2 px-3 py-2 text-start text-sm rounded-lg border border-gray-200 bg-white hover:border-accent hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'

export function CategoryPicker({ lang, itemType, itemName, value, onChange, error }: CategoryPickerProps) {
  const tr = tAdmin(lang)
  const uid = useId()
  const listId = `${uid}-listbox`
  const rtl = isRTL(lang as Parameters<typeof isRTL>[0])
  const expectedTaxonomy = taxonomyForItemType(itemType)

  const [ui, setUi] = useState<PickerUi>({ itemType, query: '', browseOpen: false, stack: [] })
  const cur: PickerUi = ui.itemType === itemType ? ui : { itemType, query: '', browseOpen: false, stack: [] }
  const patch = (p: Partial<PickerUi>) => setUi({ ...cur, ...p })
  const [activeIndex, setActiveIndex] = useState(-1)

  // Type switch: a selection of the other taxonomy is no longer valid.
  useEffect(() => {
    if (value && value.taxonomy_type !== expectedTaxonomy) onChange(null)
  }, [value, expectedTaxonomy, onChange])

  // ── Suggestions ────────────────────────────────────────────────────────────
  const debouncedName = useDebounced(itemName.trim(), SUGGEST_DEBOUNCE_MS)
  const sugKey = `${lang}|${itemType}|${debouncedName}`
  const [sug, setSug] = useState<Fetched<CategorySuggestion> | null>(null)
  const sugWanted = !value && debouncedName.length >= 2
  useEffect(() => {
    if (!sugWanted) return
    const ctrl = new AbortController()
    fetchCategorySuggestions({ lang, itemType, name: debouncedName, signal: ctrl.signal })
      .then((items) => { if (!ctrl.signal.aborted) setSug({ key: sugKey, items, failed: false }) })
      .catch(() => { if (!ctrl.signal.aborted) setSug({ key: sugKey, items: [], failed: true }) })
    return () => ctrl.abort()
  }, [sugWanted, sugKey, lang, itemType, debouncedName])
  const suggestions = sugWanted && sug?.key === sugKey ? sug : null

  // ── Search ─────────────────────────────────────────────────────────────────
  const debouncedQuery = useDebounced(cur.query.trim(), SEARCH_DEBOUNCE_MS)
  const searchKey = `${lang}|${itemType}|${debouncedQuery}`
  const [search, setSearch] = useState<Fetched<PickerCategory> | null>(null)
  const searchWanted = !value && debouncedQuery.length >= 2
  useEffect(() => {
    if (!searchWanted) return
    const ctrl = new AbortController()
    fetchPickerCategories({ lang, itemType, q: debouncedQuery, limit: SEARCH_LIMIT, signal: ctrl.signal })
      .then((items) => { if (!ctrl.signal.aborted) setSearch({ key: searchKey, items, failed: false }) })
      .catch(() => { if (!ctrl.signal.aborted) setSearch({ key: searchKey, items: [], failed: true }) })
    return () => ctrl.abort()
  }, [searchWanted, searchKey, lang, itemType, debouncedQuery])
  const searchResult = searchWanted && search?.key === searchKey && cur.query.trim() === debouncedQuery ? search : null

  // ── Browse (drill-down) ────────────────────────────────────────────────────
  const parent = cur.stack[cur.stack.length - 1] ?? null
  const browseKey = `${lang}|${itemType}|${parent?.id ?? 'root'}`
  const [browse, setBrowse] = useState<Fetched<PickerCategory> | null>(null)
  const browseWanted = !value && cur.browseOpen
  useEffect(() => {
    if (!browseWanted) return
    const ctrl = new AbortController()
    fetchPickerCategories({ lang, itemType, parentId: parent?.id ?? null, limit: BROWSE_LIMIT, signal: ctrl.signal })
      .then((items) => { if (!ctrl.signal.aborted) setBrowse({ key: browseKey, items, failed: false }) })
      .catch(() => { if (!ctrl.signal.aborted) setBrowse({ key: browseKey, items: [], failed: true }) })
    return () => ctrl.abort()
  }, [browseWanted, browseKey, lang, itemType, parent?.id])
  const browseResult = browseWanted && browse?.key === browseKey ? browse : null
  const browseSorted = useMemo(() => {
    if (!browseResult) return []
    const collator = new Intl.Collator(lang)
    return [...browseResult.items].sort((a, b) => collator.compare(a.name, b.name))
  }, [browseResult, lang])

  function choose(c: PickerCategory) {
    setUi({ itemType, query: '', browseOpen: false, stack: [] })
    setActiveIndex(-1)
    onChange(c)
  }

  const typeHint = itemType === 'product' ? tr.category_picker_type_hint_product : tr.category_picker_type_hint_service
  const searchItems = searchResult?.items ?? []

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (searchItems.length) setActiveIndex((i) => (i + 1) % searchItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (searchItems.length) setActiveIndex((i) => (i <= 0 ? searchItems.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault() // never submit the surrounding form from the search box
      const pick = searchItems[activeIndex] ?? (searchItems.length === 1 ? searchItems[0] : undefined)
      if (pick) choose(pick)
    } else if (e.key === 'Escape') {
      setActiveIndex(-1)
    }
  }

  const errorMsg = error ? <p className="text-xs text-red-600 mt-1" role="alert">{error}</p> : null

  // ── Selected ───────────────────────────────────────────────────────────────
  if (value) {
    return (
      <div data-testid="category-picker" dir={rtl ? 'rtl' : 'ltr'}>
        <div
          data-testid="category-selected"
          className="flex items-center justify-between gap-3 rounded-lg border border-accent bg-accent/5 px-3 py-2"
          aria-label={tr.category_picker_selected}
        >
          <div className="min-w-0 flex items-start gap-2">
            <span aria-hidden="true" className="text-accent font-bold">✓</span>
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900 text-start">{value.name}</span>
              <PathText names={value.path_names} />
            </div>
          </div>
          <button
            type="button"
            data-testid="category-change"
            onClick={() => onChange(null)}
            className="min-h-11 shrink-0 px-3 text-sm text-accent hover:underline"
          >
            {tr.category_picker_change}
          </button>
        </div>
        {errorMsg}
      </div>
    )
  }

  // ── Not selected ───────────────────────────────────────────────────────────
  const loadFailed = !!(suggestions?.failed || searchResult?.failed || browseResult?.failed)
  const suggestionItems = suggestions?.items ?? []
  const showNoResults = searchWanted && searchResult && !searchResult.failed && searchResult.items.length === 0

  return (
    <div data-testid="category-picker" dir={rtl ? 'rtl' : 'ltr'} className="flex flex-col gap-3 min-w-0">
      <p className="text-xs text-gray-500">{typeHint}</p>

      {suggestionItems.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">{tr.category_picker_suggestions}</p>
          <ul className="flex flex-col gap-2">
            {suggestionItems.map((s) => (
              <li key={s.id}>
                <button type="button" data-testid="category-suggestion" onClick={() => choose(s)} className={rowCls}>
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-900 text-start">{s.name}</span>
                    <PathText names={s.path_names} />
                  </span>
                  {s.source !== 'name' && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                      {s.source === 'recent' ? tr.category_picker_recent : tr.category_picker_domain}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label htmlFor={`${uid}-search`} className="block text-xs font-medium text-gray-700 mb-1">
          {tr.category_picker_search_label}
        </label>
        <input
          id={`${uid}-search`}
          type="search"
          data-testid="category-search"
          role="combobox"
          aria-expanded={searchItems.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 && searchItems[activeIndex] ? `${uid}-opt-${searchItems[activeIndex].id}` : undefined}
          value={cur.query}
          onChange={(e) => { patch({ query: e.target.value }); setActiveIndex(-1) }}
          onKeyDown={onSearchKeyDown}
          placeholder={tr.category_picker_search_placeholder}
          autoComplete="off"
          className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <ul id={listId} role="listbox" aria-label={tr.category_picker_search_label} className="mt-2 flex flex-col gap-2">
          {searchItems.map((c, i) => (
            <li key={c.id} role="presentation">
              <button
                type="button"
                id={`${uid}-opt-${c.id}`}
                role="option"
                aria-selected={i === activeIndex}
                data-testid="category-option"
                onClick={() => choose(c)}
                className={`${rowCls} ${i === activeIndex ? 'border-accent bg-accent/5' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block font-medium text-gray-900 text-start">{c.name}</span>
                  <PathText names={c.path_names} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        {showNoResults && <p className="text-xs text-gray-500 mt-1">{tr.category_picker_no_results}</p>}
      </div>

      {!cur.browseOpen ? (
        <button
          type="button"
          data-testid="category-browse"
          onClick={() => patch({ browseOpen: true, stack: [] })}
          className="min-h-11 self-start px-1 text-sm text-accent hover:underline"
        >
          {tr.category_picker_browse}
        </button>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-2" data-testid="category-browse-panel">
          <div className="flex items-center justify-between gap-2 mb-2">
            <nav aria-label={tr.category_picker_browse_all} className="min-w-0 flex flex-wrap items-center gap-1 text-xs text-gray-600">
              <button
                type="button"
                onClick={() => patch({ stack: [] })}
                className="min-h-11 px-1 hover:underline"
              >
                {tr.category_picker_browse_all}
              </button>
              {cur.stack.map((n, i) => (
                <span key={n.id} className="flex items-center gap-1">
                  <span aria-hidden="true" className="rtl:rotate-180">›</span>
                  <button
                    type="button"
                    onClick={() => patch({ stack: cur.stack.slice(0, i + 1) })}
                    className="min-h-11 px-1 hover:underline"
                  >
                    {n.name}
                  </button>
                </span>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-1">
              {cur.stack.length > 0 && (
                <button
                  type="button"
                  onClick={() => patch({ stack: cur.stack.slice(0, -1) })}
                  className="min-h-11 px-2 text-sm text-gray-600 hover:underline"
                >
                  {tr.category_picker_back}
                </button>
              )}
            </div>
          </div>

          {parent && (
            <button
              type="button"
              data-testid="category-choose-current"
              onClick={() => choose(parent)}
              className="mb-2 w-full min-h-11 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              {tr.category_picker_choose_this}: {parent.name}
            </button>
          )}

          <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto" aria-label={tr.category_picker_children}>
            {browseSorted.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  data-testid="category-browse-item"
                  onClick={() => (c.child_count > 0 ? patch({ stack: [...cur.stack, c] }) : choose(c))}
                  className={rowCls}
                >
                  <span className="block font-medium text-gray-900 text-start">{c.name}</span>
                  {c.child_count > 0 && <Chevron className="text-gray-400" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loadFailed && <p className="text-xs text-red-600" role="alert">{tr.category_picker_load_error}</p>}
      {errorMsg}
    </div>
  )
}
