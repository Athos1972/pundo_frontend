/**
 * B5900-011 — Shop-Admin CategoryPicker + i18n + client helper.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CategoryPicker } from '@/components/shop-admin/CategoryPicker'
import { tAdmin } from '@/lib/shop-admin-translations'
import { tShopAdminCategoryPicker, shopAdminCategoryPickerTranslationsMap } from '@/lib/i18n/shop-admin-category-picker'
import { fetchPickerCategories, fetchCategorySuggestions, CategoryFetchError } from '@/lib/shop-admin-categories'
import type { CategorySuggestion, PickerCategory } from '@/types/shop-admin'

const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

const breads: PickerCategory = {
  id: 4608, parent_id: 4605, taxonomy_type: 'google', name: 'Breads & Buns',
  path_names: ['Food, Beverages & Tobacco', 'Food Items', 'Bakery'], child_count: 0,
}
const bakery: PickerCategory = {
  id: 4605, parent_id: 4604, taxonomy_type: 'google', name: 'Bakery',
  path_names: ['Food, Beverages & Tobacco', 'Food Items'], child_count: 2,
}
const rootB: PickerCategory = { id: 2, parent_id: null, taxonomy_type: 'google', name: 'Ärzte', path_names: [], child_count: 1 }
const rootA: PickerCategory = { id: 1, parent_id: null, taxonomy_type: 'google', name: 'Zebra', path_names: [], child_count: 0 }
const suggestion: CategorySuggestion = { ...breads, source: 'name', score: 3.5 }

const mockFetch = vi.fn()
function json(items: unknown[]) {
  return Promise.resolve(new Response(JSON.stringify({ items }), { status: 200 }))
}
function route(handlers: { suggest?: unknown[]; search?: unknown[]; roots?: unknown[]; children?: Record<string, unknown[]> }) {
  mockFetch.mockImplementation((url: string) => {
    const u = new URL(url, 'http://x')
    if (u.pathname.endsWith('/categories/suggest')) return json(handlers.suggest ?? [])
    if (u.searchParams.has('q')) return json(handlers.search ?? [])
    const pid = u.searchParams.get('parent_id')
    return json(pid ? (handlers.children?.[pid] ?? []) : (handlers.roots ?? []))
  })
}

beforeEach(() => {
  mockFetch.mockReset()
  global.fetch = mockFetch
})

describe('i18n completeness', () => {
  const enKeys = Object.keys(shopAdminCategoryPickerTranslationsMap.en)
  for (const lang of LANGS) {
    it(`${lang}: all keys present, prefixed, non-empty, reachable via tAdmin`, () => {
      const tr = shopAdminCategoryPickerTranslationsMap[lang] as Record<string, string>
      expect(Object.keys(tr).sort()).toEqual([...enKeys].sort())
      for (const k of enKeys) {
        expect(k.startsWith('category_picker_')).toBe(true)
        expect(tr[k], `${k}/${lang}`).toBeTruthy()
        expect((tAdmin(lang) as unknown as Record<string, string>)[k]).toBe(tr[k])
      }
    })
  }
  it('falls back to en for unknown language', () => {
    expect(tShopAdminCategoryPicker('xx').category_picker_back).toBe('Back')
  })
})

describe('client helper', () => {
  it('sends Accept-Language and item_type, throws typed error on !ok', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ items: [rootA] }), { status: 200 }))
    const out = await fetchPickerCategories({ lang: 'el', itemType: 'service', parentId: 5, limit: 100 })
    expect(out).toEqual([rootA])
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/shop-admin/categories?item_type=service&parent_id=5&limit=100')
    expect(init.headers['Accept-Language']).toBe('el')
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 502 }))
    await expect(fetchCategorySuggestions({ lang: 'en', itemType: 'product', name: 'x y' })).rejects.toBeInstanceOf(CategoryFetchError)
  })
  it('q wins over parent_id; null-safe items', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    expect(await fetchPickerCategories({ lang: 'en', itemType: 'product', q: 'brot', parentId: 3 })).toEqual([])
    expect(mockFetch.mock.calls[0][0]).toBe('/api/shop-admin/categories?item_type=product&q=brot')
  })
})

describe('CategoryPicker', () => {
  it('suggestion tap selects (1 interaction after name entry)', async () => {
    route({ suggest: [suggestion] })
    const onChange = vi.fn()
    render(<CategoryPicker lang="en" itemType="product" itemName="Sourdough bread 750 g" value={null} onChange={onChange} />)
    const btn = await screen.findByTestId('category-suggestion')
    expect(btn.textContent).toContain('Breads & Buns')
    expect(btn.textContent).toContain('Bakery')
    expect(btn.className).toContain('min-h-11')
    fireEvent.click(btn)
    expect(onChange).toHaveBeenCalledWith(suggestion)
    const sugCall = mockFetch.mock.calls.find((c) => String(c[0]).includes('/suggest'))!
    expect(sugCall[1].headers['Accept-Language']).toBe('en')
    expect(sugCall[0]).toContain('item_type=product')
  })

  it('does not request suggestions for names shorter than 2 chars', async () => {
    route({})
    render(<CategoryPicker lang="en" itemType="product" itemName=" a " value={null} onChange={vi.fn()} />)
    await new Promise((r) => setTimeout(r, 500))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('search starts at 2 chars, shows options, select via click and via keyboard', async () => {
    route({ search: [breads, bakery] })
    const onChange = vi.fn()
    render(<CategoryPicker lang="en" itemType="product" itemName="" value={null} onChange={onChange} />)
    const input = screen.getByTestId('category-search') as HTMLInputElement
    expect(input.type).toBe('search')
    fireEvent.change(input, { target: { value: 'b' } })
    await new Promise((r) => setTimeout(r, 350))
    expect(mockFetch).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: 'bread' } })
    const options = await screen.findAllByTestId('category-option')
    expect(options).toHaveLength(2)
    expect(mockFetch.mock.calls[0][0]).toContain('q=bread')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(breads)
  })

  it('search option click selects', async () => {
    route({ search: [breads, bakery] })
    const onChange = vi.fn()
    render(<CategoryPicker lang="en" itemType="product" itemName="" value={null} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('category-search'), { target: { value: 'bread' } })
    const options = await screen.findAllByTestId('category-option')
    fireEvent.click(options[1])
    expect(onChange).toHaveBeenCalledWith(bakery)
  })

  it('shows no-results hint', async () => {
    route({ search: [] })
    render(<CategoryPicker lang="en" itemType="product" itemName="" value={null} onChange={vi.fn()} />)
    fireEvent.change(screen.getByTestId('category-search'), { target: { value: 'zzzz' } })
    expect(await screen.findByText(tAdmin('en').category_picker_no_results)).toBeInTheDocument()
  })

  it('selected state shows card with path and change resets to null', () => {
    const onChange = vi.fn()
    render(<CategoryPicker lang="en" itemType="product" itemName="x" value={breads} onChange={onChange} />)
    const card = screen.getByTestId('category-selected')
    expect(card.textContent).toContain('Breads & Buns')
    expect(card.textContent).toContain('Food Items')
    fireEvent.click(screen.getByTestId('category-change'))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('item type switch clears a selection of the other taxonomy', async () => {
    const onChange = vi.fn()
    route({})
    const { rerender } = render(<CategoryPicker lang="en" itemType="product" itemName="" value={breads} onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
    rerender(<CategoryPicker lang="en" itemType="service" itemName="" value={breads} onChange={onChange} />)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null))
  })

  it('drill-down: roots sorted by locale, navigate, choose intermediate level', async () => {
    route({ roots: [rootB, rootA], children: { '2': [bakery, breads] } })
    const onChange = vi.fn()
    render(<CategoryPicker lang="de" itemType="product" itemName="" value={null} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('category-browse'))
    const rows = await screen.findAllByTestId('category-browse-item')
    expect(rows.map((r) => r.textContent)).toEqual(['Ärzte', 'Zebra'])
    expect(screen.queryByTestId('category-choose-current')).toBeNull()
    // Row with children navigates (does not select)
    fireEvent.click(rows[0])
    await waitFor(() => expect(screen.getByTestId('category-choose-current')).toBeInTheDocument())
    expect(onChange).not.toHaveBeenCalled()
    expect(mockFetch.mock.calls.at(-1)![0]).toContain('parent_id=2')
    // Intermediate node selectable
    fireEvent.click(screen.getByTestId('category-choose-current'))
    expect(onChange).toHaveBeenCalledWith(rootB)
  })

  it('drill-down: leaf row selects directly', async () => {
    route({ roots: [rootA] })
    const onChange = vi.fn()
    render(<CategoryPicker lang="en" itemType="product" itemName="" value={null} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('category-browse'))
    fireEvent.click(await screen.findByTestId('category-browse-item'))
    expect(onChange).toHaveBeenCalledWith(rootA)
  })

  it('load error shows inline hint, form stays usable', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 500 }))
    render(<CategoryPicker lang="en" itemType="product" itemName="bread loaf" value={null} onChange={vi.fn()} />)
    expect(await screen.findByText(tAdmin('en').category_picker_load_error)).toBeInTheDocument()
    expect(screen.getByTestId('category-search')).toBeInTheDocument()
  })

  it('error prop is rendered', () => {
    render(<CategoryPicker lang="en" itemType="product" itemName="" value={null} onChange={vi.fn()} error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('he: dir=rtl, Hebrew UI strings, only logical utilities (no pl-/pr-/ml-/mr-/left-/right-)', async () => {
    route({ suggest: [suggestion], roots: [rootA] })
    const { container } = render(<CategoryPicker lang="he" itemType="product" itemName="לחם שיפון" value={null} onChange={vi.fn()} />)
    await screen.findByTestId('category-suggestion')
    fireEvent.click(screen.getByTestId('category-browse'))
    await screen.findByTestId('category-browse-item')
    expect(screen.getByTestId('category-picker').getAttribute('dir')).toBe('rtl')
    expect(container.textContent).toContain(tAdmin('he').category_picker_suggestions)
    expect(container.innerHTML).not.toMatch(/class="[^"]*(?:^|\s)(?:pl|pr|ml|mr|left|right|text-left|text-right)-/)
    expect(container.innerHTML).not.toMatch(/\s(?:pl|pr|ml|mr)-\d/)
  })

  it('en: dir=ltr', () => {
    render(<CategoryPicker lang="en" itemType="product" itemName="" value={null} onChange={vi.fn()} />)
    expect(screen.getByTestId('category-picker').getAttribute('dir')).toBe('ltr')
  })
})
