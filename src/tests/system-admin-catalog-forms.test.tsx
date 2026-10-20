import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type {
  SysAdminCategory, SysAdminCategoryAttributeDef, SysAdminCategoryTranslation,
  SysAdminBrand, SysAdminProduct, SysAdminProductAttribute,
} from '@/types/system-admin'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn(), back: vi.fn() }),
}))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))

import { showToast } from '@/components/system-admin/Toast'
import { CategoryForm } from '@/components/system-admin/CategoryForm'
import { ProductForm } from '@/components/system-admin/ProductForm'
import { ProductAttributesTable } from '@/components/system-admin/ProductAttributesTable'
import { AttributeDefinitionEditor, type AttrDefDraft } from '@/components/system-admin/AttributeDefinitionEditor'

const mockFetch = vi.fn()
const tr = tSysAdmin('en')

beforeEach(() => {
  push.mockReset(); refresh.mockReset(); mockFetch.mockReset()
  vi.mocked(showToast).mockClear()
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

const ok = (body: unknown = {}, status = 200) => ({ ok: true, status, json: async () => body })
const fail = (status = 500) => ({ ok: false, status, json: async () => ({}) })

// ─── AttributeDefinitionEditor ──────────────────────────────────────────────────

describe('AttributeDefinitionEditor', () => {
  const base: AttrDefDraft = {
    attribute_key: '', attribute_type: 'text', allowed_values: null, unit: null, is_filterable: true,
    display_order: 0, override_mode: 'inherit', labels: {}, value_labels: null, created_at: '', updated_at: '',
  }
  function Harness({ initial = base, onChange }: { initial?: AttrDefDraft; onChange?: (v: AttrDefDraft) => void }) {
    const [v, setV] = React.useState(initial)
    return (
      <AttributeDefinitionEditor
        value={v}
        onChange={(n) => { setV(n); onChange?.(n) }}
        keyLabel="Key" labelLabel="Label" typeLabel="Type" optionsLabel="Options"
        optionsHint="comma separated" optionsPlaceholder="a, b"
      />
    )
  }
  const field = (label: string) => screen.getByText(new RegExp(`^${label}`)).parentElement!.querySelector('input,select') as HTMLInputElement

  it('reports key and English label edits', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.type(field('Key'), 'k')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ attribute_key: 'k' }))
    await user.type(field('Label'), 'L')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ labels: { en: 'L' } }))
  })

  it('shows the options input only for select type, parses and previews the allowed values', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    expect(screen.queryByText('Options')).toBeNull()
    await user.selectOptions(field('Type'), 'select')
    const opts = screen.getByPlaceholderText('a, b')
    await user.type(opts, 'red, , blue ,')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ allowed_values: ['red', 'blue'] }))
    expect(screen.getByText('comma separated')).toBeTruthy()
    expect(screen.getByText('red')).toBeTruthy()
    await user.clear(opts)
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ allowed_values: null }))
  })

  it('prefills existing allowed values', () => {
    render(<Harness initial={{ ...base, attribute_type: 'select', allowed_values: ['s', 'm'], labels: { en: 'Size' } }} />)
    expect((screen.getByPlaceholderText('a, b') as HTMLInputElement).value).toBe('s, m')
    expect((field('Label')).value).toBe('Size')
  })
})

// ─── ProductAttributesTable ─────────────────────────────────────────────────────

describe('ProductAttributesTable', () => {
  const labels = {
    key: 'Key', value: 'Value', source: 'Source', confidence: 'Conf', add: 'Add attr', delete: 'Delete',
    confirmDelete: 'Really delete?', cancel: 'Cancel', saved: 'Saved', deleted: 'Deleted', error: 'Oops',
  }
  const attr = (id: number, key: string, value: unknown, extra: Partial<SysAdminProductAttribute> = {}): SysAdminProductAttribute => ({
    id, item_id: 1, attribute_key: key, attribute_value: value, source: 'llm', confidence: 0.5,
    created_at: '', updated_at: '', ...extra,
  })

  it('renders values and tolerates null source/confidence/value', () => {
    render(<ProductAttributesTable productId={1} labels={labels} attributes={[
      attr(1, 'color', 'red'),
      attr(2, 'weight', null, { source: null, confidence: null }),
      attr(3, 'organic', true, { confidence: 0.333 }),
    ]} />)
    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('0.50')).toBeTruthy()
    expect(within(rows[2]).getAllByText('—')).toHaveLength(3)
    expect(within(rows[3]).getByText('true')).toBeTruthy()
    expect(within(rows[3]).getByText('0.33')).toBeTruthy()
  })

  it('adds an attribute: save is disabled without a key, then posts and appends', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok(attr(9, 'size', 'XL')))
    render(<ProductAttributesTable productId={4} labels={labels} attributes={[]} />)
    await user.click(screen.getByRole('button', { name: /Add attr/ }))
    expect(screen.queryByRole('button', { name: /Add attr/ })).toBeNull()
    expect((screen.getByRole('button', { name: '✓' }) as HTMLButtonElement).disabled).toBe(true)
    await user.type(screen.getByPlaceholderText('Key'), 'size')
    await user.type(screen.getByPlaceholderText('Value'), 'XL')
    await user.click(screen.getByRole('button', { name: '✓' }))
    await waitFor(() => expect(screen.getByText('XL')).toBeTruthy())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/admin/products/4/attributes')
    expect(JSON.parse(init.body)).toEqual({ attribute_key: 'size', attribute_value: 'XL', source: 'manual', confidence: 1 })
    expect(showToast).toHaveBeenCalledWith('Saved', 'success')
    expect(refresh).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Add attr/ })).toBeTruthy()
  })

  it('keeps the draft and toasts an error when saving fails (rejection and network)', async () => {
    const user = userEvent.setup()
    render(<ProductAttributesTable productId={4} labels={labels} attributes={[]} />)
    await user.click(screen.getByRole('button', { name: /Add attr/ }))
    await user.type(screen.getByPlaceholderText('Key'), 'k')
    mockFetch.mockResolvedValueOnce(fail())
    await user.click(screen.getByRole('button', { name: '✓' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Oops', 'error'))
    mockFetch.mockRejectedValueOnce(new Error('down'))
    vi.mocked(showToast).mockClear()
    await user.click(screen.getByRole('button', { name: '✓' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Oops', 'error'))
    expect(screen.getByPlaceholderText('Key')).toBeTruthy()
  })

  it('discarding the draft restores the add button', async () => {
    const user = userEvent.setup()
    render(<ProductAttributesTable productId={4} labels={labels} attributes={[]} />)
    await user.click(screen.getByRole('button', { name: /Add attr/ }))
    await user.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByPlaceholderText('Key')).toBeNull()
  })

  it('asks for confirmation before deleting; cancel keeps the row', async () => {
    const user = userEvent.setup()
    render(<ProductAttributesTable productId={4} labels={labels} attributes={[attr(1, 'color', 'red')]} />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Really delete?')).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
    expect(screen.getByText('color')).toBeTruthy()
  })

  it('deletes after confirmation (204 counts as success)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 204 })
    render(<ProductAttributesTable productId={4} labels={labels} attributes={[attr(1, 'color', 'red'), attr(2, 'size', 'M')]} />)
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByText('color')).toBeNull())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/products/4/attributes/1')
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
    expect(screen.getByText('size')).toBeTruthy()
    expect(showToast).toHaveBeenCalledWith('Deleted', 'success')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('failed delete keeps the row, toasts an error and closes the dialog', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(fail(500))
    render(<ProductAttributesTable productId={4} labels={labels} attributes={[attr(1, 'color', 'red')]} />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Oops', 'error'))
    expect(screen.getByText('color')).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('network error while deleting toasts an error', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('down'))
    render(<ProductAttributesTable productId={4} labels={labels} attributes={[attr(1, 'color', 'red')]} />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Oops', 'error'))
    expect(screen.getByText('color')).toBeTruthy()
  })
})

// ─── ProductForm ────────────────────────────────────────────────────────────────

describe('ProductForm', () => {
  const categories: SysAdminCategory[] = [
    { id: 1, parent_id: null, taxonomy_type: 'google', external_id: 'g1', level: 'L1', path: 'Food', name: 'Food' },
    { id: 2, parent_id: 1, taxonomy_type: 'google', external_id: 'g2', level: 'L2', path: 'Food > Dog', name: null },
  ]
  const brands: SysAdminBrand[] = [
    { id: 3, slug: 'rc', names: { en: 'Royal Canin' }, country_code: null, created_at: '', updated_at: '' },
  ]
  const product: SysAdminProduct = {
    id: 11, slug: 'rc-adult', item_type: 'product', status: 'active', names: { en: 'RC Adult' }, brand_id: 3, category_id: 2,
  }
  const attrs: SysAdminProductAttribute[] = [
    { id: 1, item_id: 11, attribute_key: 'flavour', attribute_value: 'chicken', source: null, confidence: null, created_at: '', updated_at: '' },
    { id: 2, item_id: 11, attribute_key: 'weight', attribute_value: '3kg', source: null, confidence: null, created_at: '', updated_at: '' },
  ]

  it('create: validates name and slug (blank after trim), no request', async () => {
    const user = userEvent.setup()
    render(<ProductForm product={null} attributes={[]} categories={categories} brands={brands} tr={tr} />)
    await user.type(screen.getByLabelText(new RegExp(`${tr.product_name} — English`)), '  ')
    await user.type(screen.getByLabelText(new RegExp(`^${tr.slug}`)), '  ')
    await user.click(screen.getByRole('button', { name: tr.save }))
    expect(await screen.findByText('Name is required')).toBeTruthy()
    expect(screen.getByText('Slug is required')).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // brand/category choices are searched on the server (B8200-004)
  function mockSearchAndSave() {
    mockFetch.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (init?.method) return ok()
      if (url.startsWith('/api/admin/brands')) return ok({ items: [{ id: 3, names: { en: 'Royal Canin' } }] })
      if (url.startsWith('/api/admin/categories')) {
        // two translation rows of the same category: the form shows it once
        const row = { id: 2, name: null, external_id: 'g2', path: 'Food > Dog' }
        return ok({ items: [row, row] })
      }
      return ok({ items: [] })
    })
  }

  it('create: posts with numeric brand/category ids picked via the server-side search', async () => {
    const user = userEvent.setup()
    mockSearchAndSave()
    render(<ProductForm product={null} attributes={[]} categories={[]} brands={[]} tr={tr} />)
    await user.type(screen.getByLabelText(new RegExp(`${tr.product_name} — English`)), 'Kibble')
    await user.type(screen.getByLabelText(new RegExp(`^${tr.slug}`)), 'kibble')
    await user.click(screen.getByText(tr.brand, { selector: 'label' }).parentElement!.querySelector('button')!)
    await user.click(await screen.findByRole('option', { name: /Royal Canin/ }))
    await user.click(screen.getByText(tr.category, { selector: 'label' }).parentElement!.querySelector('button')!)
    const options = await screen.findAllByRole('option', { name: /Food > Dog/ })
    expect(options).toHaveLength(1)
    await user.click(options[0])
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/products'))
    const save = mockFetch.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(save[0]).toBe('/api/admin/products')
    expect(JSON.parse(save[1].body)).toEqual({ names: { en: 'Kibble' }, slug: 'kibble', category_id: 2, brand_id: 3 })
  })

  it('typing in the category dropdown searches on the server with q and a page limit', async () => {
    const user = userEvent.setup()
    mockSearchAndSave()
    render(<ProductForm product={null} attributes={[]} categories={[]} brands={[]} tr={tr} />)
    await user.click(screen.getByText(tr.category, { selector: 'label' }).parentElement!.querySelector('button')!)
    await user.type(screen.getByPlaceholderText(tr.category), 'dog')
    await waitFor(() => expect(mockFetch.mock.calls.some(([u]) => String(u).includes('categories?') && String(u).includes('q=dog'))).toBe(true))
    expect(String(mockFetch.mock.calls.at(-1)![0])).toContain('limit=50')
  })

  it('edit: shows the label of the selected category and brand without loading any list', () => {
    mockFetch.mockResolvedValue(ok({ items: [] }))
    render(<ProductForm product={product} attributes={[]} categories={[categories[0]]} brands={brands} tr={tr} />)
    expect(screen.getByText('Royal Canin')).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('edit: PATCHes, sends null ids when unset and shows no attribute section on create', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    render(<ProductForm product={{ ...product, brand_id: null, category_id: null }} attributes={attrs} categories={categories} brands={brands} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/products/11')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({ category_id: null, brand_id: null })
  })

  it('edit: keeps other languages, sends "" for a cleared one, edits descriptions and barcode (B8000-004)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    render(
      <ProductForm
        product={{ ...product, names: { en: 'RC Adult', de: 'RC Erwachsen' }, descriptions: { de: 'Alt' }, ean: '4006381333931' }}
        attributes={[]} categories={categories} brands={brands} tr={tr}
      />,
    )
    expect((screen.getByLabelText(new RegExp(`${tr.product_name} — Deutsch`)) as HTMLInputElement).value).toBe('RC Erwachsen')
    await user.clear(screen.getByLabelText(new RegExp(`${tr.product_name} — Deutsch`)))
    await user.type(screen.getByLabelText(new RegExp(`${tr.product_name} — Ελληνικά`)), 'RC Ενήλικες')
    await user.clear(screen.getByLabelText(new RegExp(`${tr.description} — Deutsch`)))
    await user.clear(screen.getByLabelText(tr.barcode))
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.names).toEqual({ en: 'RC Adult', de: '', el: 'RC Ενήλικες' })
    expect(body.descriptions).toEqual({ de: '' })
    expect(body.ean).toBeNull()
  })

  it('accepts a name in any language and rejects an invalid barcode', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    render(<ProductForm product={null} attributes={[]} categories={categories} brands={brands} tr={tr} />)
    await user.type(screen.getByLabelText(new RegExp(`${tr.product_name} — Deutsch`)), 'Futter')
    await user.type(screen.getByLabelText(new RegExp(`^${tr.slug}`)), 'futter')
    await user.type(screen.getByLabelText(tr.barcode), '12ab')
    await user.click(screen.getByRole('button', { name: tr.save }))
    expect(await screen.findByText(tr.error_barcode_invalid)).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText(tr.barcode))
    await user.type(screen.getByLabelText(tr.barcode), '4006381333931')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      names: { de: 'Futter' }, slug: 'futter', category_id: null, brand_id: null, ean: '4006381333931',
    })
  })

  it('does not render the attribute section when creating', () => {
    render(<ProductForm product={null} attributes={attrs} categories={categories} brands={brands} tr={tr} />)
    expect(screen.queryByText('flavour')).toBeNull()
  })

  it('toasts on rejection and on network failure', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(fail())
    render(<ProductForm product={product} attributes={[]} categories={categories} brands={brands} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_generic, 'error'))
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_backend, 'error'))
    expect(push).not.toHaveBeenCalled()
  })

  // Regression: the attribute filter input had no effect because the table copied
  // its `attributes` prop into state once and ignored later prop changes.
  it('attribute filter narrows the visible attribute rows', async () => {
    const user = userEvent.setup()
    render(<ProductForm product={product} attributes={attrs} categories={categories} brands={brands} tr={tr} />)
    expect(screen.getByText('flavour')).toBeTruthy()
    expect(screen.getByText('weight')).toBeTruthy()
    await user.type(screen.getByPlaceholderText(`${tr.search} ${tr.attribute_key}…`), 'FLA')
    expect(screen.getByText('flavour')).toBeTruthy()
    expect(screen.queryByText('weight')).toBeNull()
  })
})

// ─── CategoryForm ───────────────────────────────────────────────────────────────

describe('CategoryForm', () => {
  const cats: SysAdminCategory[] = [
    { id: 1, parent_id: null, taxonomy_type: 'google', external_id: 'root', level: 'L1', path: null, name: 'Root' },
    { id: 2, parent_id: 1, taxonomy_type: 'google', external_id: 'kid', level: 'L2', path: null, name: null },
  ]
  const translations: SysAdminCategoryTranslation[] = [{ id: 5, category_id: 2, lang: 'en', name: 'Kid', rtl: false }]
  const defs: SysAdminCategoryAttributeDef[] = [{
    id: 40, category_id: 2, attribute_key: 'size', attribute_type: 'text', allowed_values: null, unit: null,
    is_filterable: true, display_order: 0, override_mode: 'inherit', labels: { en: 'Size' }, created_at: '', updated_at: '',
  }]

  it('create: requires taxonomy type and an English name, offers translations, posts nulls for no parent (B5900-032)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ...ok(), json: async () => ({ id: 9 }) }).mockResolvedValueOnce(ok())
    render(<CategoryForm category={null} allCategories={cats} translations={[]} attrDefs={[]} tr={tr} />)
    expect(screen.getByText(tr.translations_tab)).toBeTruthy()  // a new category can be named right away
    await user.type(screen.getByLabelText(new RegExp(tr.external_id)), ' new-cat ')
    // native `required` on the select prevents submit; choose then save
    await user.selectOptions(screen.getByLabelText(new RegExp(tr.taxonomy_type)), 'unspsc')
    await user.click(screen.getByRole('button', { name: tr.save }))
    expect(await screen.findByText(`EN: ${tr.error_required}`)).toBeTruthy()  // no English name -> nothing is sent
    expect(mockFetch).not.toHaveBeenCalled()

    const rows = screen.getAllByRole('row').slice(1, 7)
    await user.type(within(rows[0]).getByRole('textbox'), 'New category')  // en
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/categories'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/categories')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ external_id: 'new-cat', parent_id: null, taxonomy_type: 'unspsc' })
    const [url, init] = mockFetch.mock.calls[1]
    expect(url).toBe('/api/admin/categories/9/translations')  // id of the new category from the POST answer
    expect(JSON.parse(init.body)[0]).toEqual({ lang: 'en', name: 'New category', rtl: false })
  })

  it('validates a whitespace-only external id', async () => {
    const user = userEvent.setup()
    render(<CategoryForm category={null} allCategories={cats} translations={[]} attrDefs={[]} tr={tr} />)
    await user.type(screen.getByLabelText(new RegExp(tr.external_id)), '   ')
    await user.selectOptions(screen.getByLabelText(new RegExp(tr.taxonomy_type)), 'google')
    await user.click(screen.getByRole('button', { name: tr.save }))
    expect(await screen.findByText('External ID is required')).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('edit: parent list excludes the category itself; keeps unknown legacy taxonomy selectable', () => {
    render(<CategoryForm category={{ ...cats[1], taxonomy_type: 'old' }} allCategories={cats} translations={translations} attrDefs={[]} tr={tr} />)
    const parent = screen.getByLabelText(tr.parent_category)
    const labels = within(parent).getAllByRole('option').map((o) => o.textContent)
    expect(labels).toEqual([tr.none, 'Root (L1)'])
    expect(screen.getByRole('option', { name: `old ${tr.legacy_suffix}` })).toBeTruthy()
  })

  it('edit: saves category then PUTs all six languages (an emptied field deletes that language) with rtl flag', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    render(<CategoryForm category={cats[1]} allCategories={cats} translations={translations} attrDefs={[]} tr={tr} />)
    const rows = screen.getAllByRole('row').slice(1, 7)
    expect(rows).toHaveLength(6)
    await user.type(within(rows[4]).getByRole('textbox'), 'فرعي')   // ar
    await user.type(within(rows[1]).getByRole('textbox'), '   ')     // de, blank -> empty name = delete that language
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/categories'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/categories/2')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    const [url, init] = mockFetch.mock.calls[1]
    expect(url).toBe('/api/admin/categories/2/translations')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual([
      { lang: 'en', name: 'Kid', rtl: false },
      { lang: 'de', name: '', rtl: false },
      { lang: 'el', name: '', rtl: false },
      { lang: 'ru', name: '', rtl: false },
      { lang: 'ar', name: 'فرعي', rtl: true },
      { lang: 'he', name: '', rtl: true },
    ])
  })

  it('edit: a failed translation save is reported, not swallowed (B5900-032)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(ok()).mockRejectedValueOnce(new Error('down'))
    render(<CategoryForm category={cats[1]} allCategories={cats} translations={translations} attrDefs={[]} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_generic, 'error'))
    expect(push).not.toHaveBeenCalled()  // the user stays on the form and can retry
    expect(showToast).not.toHaveBeenCalledWith(tr.saved, 'success')
  })

  it('does not touch translations when the category save is rejected', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(fail())
    render(<CategoryForm category={cats[1]} allCategories={cats} translations={translations} attrDefs={[]} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_generic, 'error'))
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('network error on save toasts backend error', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValueOnce(new Error('down'))
    render(<CategoryForm category={cats[1]} allCategories={cats} translations={translations} attrDefs={[]} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_backend, 'error'))
  })

  it('edit: lists attribute definitions and removes one after DELETE succeeds', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 204 })
    render(<CategoryForm category={cats[1]} allCategories={cats} translations={translations} attrDefs={defs} tr={tr} />)
    expect(screen.getByText('size')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: tr.delete }))
    await waitFor(() => expect(screen.queryByText('size')).toBeNull())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/category-attribute-definitions/40')
  })

  it('keeps the attribute definition when DELETE fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(fail(500))
    render(<CategoryForm category={cats[1]} allCategories={cats} translations={translations} attrDefs={defs} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.delete }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(screen.getByText('size')).toBeTruthy()
  })

  it('adds an attribute definition via the inline editor', async () => {
    const user = userEvent.setup()
    const created = { ...defs[0], id: 41, attribute_key: 'color' }
    mockFetch.mockResolvedValue(ok(created))
    render(<CategoryForm category={cats[1]} allCategories={cats} translations={translations} attrDefs={defs} tr={tr} />)
    await user.click(screen.getByRole('button', { name: new RegExp(tr.add_attr_def) }))
    const keyInput = screen.getByText(tr.attribute_key, { selector: 'label' }).parentElement!.querySelector('input')!
    await user.type(keyInput, 'color')
    const saveButtons = screen.getAllByRole('button', { name: tr.save })
    await user.click(saveButtons[0])
    await waitFor(() => expect(screen.getByText('color', { selector: 'td' })).toBeTruthy())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/admin/category-attribute-definitions')
    expect(JSON.parse(init.body)).toMatchObject({ category_id: 2, attribute_key: 'color', attribute_type: 'text', display_order: 1, override_mode: 'inherit' })
    expect(showToast).toHaveBeenCalledWith(tr.saved, 'success')
    // editor closed again
    expect(screen.getByRole('button', { name: new RegExp(tr.add_attr_def) })).toBeTruthy()
  })

  it('shows an error toast when adding a definition fails; cancel discards the draft', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(fail(422))
    render(<CategoryForm category={cats[1]} allCategories={cats} translations={translations} attrDefs={[]} tr={tr} />)
    await user.click(screen.getByRole('button', { name: new RegExp(tr.add_attr_def) }))
    await user.click(screen.getAllByRole('button', { name: tr.save })[0])
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_generic, 'error'))
    const cancels = screen.getAllByRole('button', { name: tr.cancel })
    await user.click(cancels[0])
    expect(screen.getByRole('button', { name: new RegExp(tr.add_attr_def) })).toBeTruthy()
  })
})
