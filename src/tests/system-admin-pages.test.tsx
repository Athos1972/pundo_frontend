import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const { stub } = vi.hoisted(() => ({
  // Form stubs expose the props they received as JSON so the page's data flow can be asserted.
  stub: (name: string) => (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': name, 'data-props': JSON.stringify(props, (k, v) => (k === 'tr' ? undefined : v)) }),
}))

class NotFoundError extends Error { constructor() { super('NEXT_NOT_FOUND') } }
class RedirectError extends Error { constructor(public to: string) { super('NEXT_REDIRECT') } }
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  notFound: () => { throw new NotFoundError() },
  usePathname: () => '/admin/dashboard',
  redirect: (to: string) => { throw new RedirectError(to) },
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))
vi.mock('@/lib/lang', async (orig) => ({ ...(await orig<typeof import('@/lib/lang')>()), getLangServer: vi.fn(async () => 'en') }))
vi.mock('@/lib/system-admin-api')
vi.mock('@/components/system-admin/ShopForm', () => ({ ShopForm: stub('ShopForm') }))
vi.mock('@/components/system-admin/BrandForm', () => ({ BrandForm: stub('BrandForm') }))
vi.mock('@/components/system-admin/ProductForm', () => ({ ProductForm: stub('ProductForm') }))
vi.mock('@/components/system-admin/CategoryForm', () => ({ CategoryForm: stub('CategoryForm') }))
vi.mock('@/components/system-admin/crm/ContactForm', () => ({ ContactForm: stub('ContactForm') }))
vi.mock('@/components/system-admin/crm/ContactDetailActions', () => ({ ContactDetailActions: stub('ContactDetailActions') }))
vi.mock('@/components/system-admin/crm/ContactEditForm', () => ({ ContactEditForm: stub('ContactEditForm') }))
vi.mock('@/components/system-admin/crm/ChannelEditor', () => ({ ChannelEditor: stub('ChannelEditor') }))
vi.mock('@/components/system-admin/crm/OutreachComposer', () => ({ OutreachComposer: stub('OutreachComposer') }))
vi.mock('@/components/system-admin/crm/CardImageViewer', () => ({ CardImageViewer: stub('CardImageViewer') }))
vi.mock('@/app/(system-admin)/admin/(portal)/shop-types/[id]/edit/ShopTypeEditForm', () => ({ ShopTypeEditForm: stub('ShopTypeEditForm') }))
vi.mock('@/app/(system-admin)/admin/(portal)/shop-owners/[id]/edit/ShopOwnerEditForm', () => ({ ShopOwnerEditForm: stub('ShopOwnerEditForm') }))
vi.mock('@/app/(system-admin)/admin/(portal)/shop-owner-offers/[id]/edit/ShopOwnerOfferEditForm', () => ({ ShopOwnerOfferEditForm: stub('ShopOwnerOfferEditForm') }))
vi.mock('@/app/(system-admin)/admin/(portal)/offers/new/OfferForm', () => ({ OfferForm: stub('OfferForm') }))
vi.mock('@/app/(system-admin)/admin/(portal)/item-domain-mappings/MappingForm', () => ({ MappingForm: stub('MappingForm') }))
vi.mock('@/app/(system-admin)/admin/(portal)/category-attribute-definitions/[categoryId]/[id]/edit/AttrDefEditForm', () => ({ AttrDefEditForm: stub('AttrDefEditForm') }))

import * as api from '@/lib/system-admin-api'
import { getLangServer } from '@/lib/lang'
import type { SysAdminApiKey } from '@/types/system-admin'

const tr = tSysAdmin('en')
const trEl = tSysAdmin('el')
const A = '@/app/(system-admin)/admin/(portal)'

type Page = (props: never) => Promise<React.ReactElement>
async function show(Page: unknown, props: unknown = {}) {
  const el = await (Page as Page)(props as never)
  return render(el)
}
const sp = (o: Record<string, string> = {}) => ({ searchParams: Promise.resolve(o) })
const par = (o: Record<string, string>) => ({ params: Promise.resolve(o) })
const stubProps = (name: string) => JSON.parse(screen.getByTestId(name).getAttribute('data-props')!)
const paged = <T,>(items: T[], total = items.length) => ({ items, total, limit: 20, offset: 0 })
// Loosely typed handle on an auto-mocked api function (arguments/results vary per call site).
const asMock = (f: unknown) => f as import('vitest').Mock
const bodyRows = () => screen.getAllByRole('row').slice(1)

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getLangServer).mockResolvedValue('en')
})

// ─── Dashboard ──────────────────────────────────────────────────────────────────

describe('dashboard', () => {
  it('links to every managed entity, in the admin language', async () => {
    const { default: Page } = await import(`${A}/dashboard/page`)
    await show(Page)
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/admin/shops')
    expect(hrefs).toContain('/admin/category-attribute-definitions')
    expect(hrefs).toContain('/admin/api-keys')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(tr.dashboard_title)
  })

  it('renders Greek when the admin language is el', async () => {
    vi.mocked(getLangServer).mockResolvedValue('el')
    const { default: Page } = await import(`${A}/dashboard/page`)
    await show(Page)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(trEl.dashboard_title)
  })
})

// ─── List pages ─────────────────────────────────────────────────────────────────

describe('shops list', () => {
  const shop = (over: Record<string, unknown>) => ({ id: 1, slug: 's', status: 'active', names: { en: 'Cafe' }, address_line1: 'Main 1', city: 'Larnaca', shop_type_id: 3, ...over })

  it('maps rows: localized name, joined address, dashes for missing values', async () => {
    vi.mocked(api.getShops).mockResolvedValue(paged([
      shop({}),
      shop({ id: 2, names: { de: 'Laden' }, address_line1: null, city: null, shop_type_id: null }),
    ]) as never)
    const { default: Page } = await import(`${A}/shops/page`)
    await show(Page, sp())
    const rows = bodyRows()
    expect(within(rows[0]).getByText('Cafe')).toBeTruthy()
    expect(within(rows[0]).getByText('Main 1, Larnaca')).toBeTruthy()
    expect(within(rows[1]).getByText('Laden')).toBeTruthy()
    expect(within(rows[1]).getAllByText('—')).toHaveLength(2)
  })

  it('forwards search, id and status filters and computes the offset from the page', async () => {
    vi.mocked(api.getShops).mockResolvedValue(paged([]) as never)
    const { default: Page } = await import(`${A}/shops/page`)
    await show(Page, sp({ q: 'caf', id: '7', status: 'pending', page: '3' }))
    expect(api.getShops).toHaveBeenCalledWith({ q: 'caf', id: 7, status: 'pending', limit: 20, offset: 40 })
  })

  it('treats page=0 / garbage as page 1 and omits empty filters', async () => {
    vi.mocked(api.getShops).mockResolvedValue(paged([]) as never)
    const { default: Page } = await import(`${A}/shops/page`)
    await show(Page, sp({ page: '0' }))
    expect(api.getShops).toHaveBeenLastCalledWith({ q: undefined, id: undefined, status: undefined, limit: 20, offset: 0 })
  })

  it('shows the empty state when the backend fails', async () => {
    vi.mocked(api.getShops).mockRejectedValue(new Error('API_ERROR:500'))
    const { default: Page } = await import(`${A}/shops/page`)
    await show(Page, sp())
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })
})

describe('brands list', () => {
  it('shows logo, name, slug and the first homepage as website', async () => {
    vi.mocked(api.getBrands).mockResolvedValue(paged([
      { id: 1, slug: 'acme', names: { en: 'Acme' }, logos: [{ url: 'https://cdn/a.png' }], homepages: { de: 'https://acme.de' } },
      { id: 2, slug: 'plain', names: { en: 'Plain' }, logos: null, homepages: null },
    ]) as never)
    const { default: Page } = await import(`${A}/brands/page`)
    await show(Page, sp({ q: 'a', id: '1' }))
    expect(api.getBrands).toHaveBeenCalledWith({ q: 'a', id: 1, limit: 20, offset: 0 })
    const rows = bodyRows()
    expect(within(rows[0]).getByText('https://acme.de')).toBeTruthy()
    expect(rows[0].querySelector('img')!.getAttribute('src')).toBe('https://cdn/a.png')
    expect(rows[1].querySelector('img')).toBeNull()
    expect(within(rows[1]).getAllByText('—').length).toBeGreaterThan(0)
  })

  it('empty state on failure', async () => {
    vi.mocked(api.getBrands).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/brands/page`)
    await show(Page, sp())
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })
})

describe('products list', () => {
  it('resolves brand and category names, falling back to the raw id and a dash', async () => {
    vi.mocked(api.getProducts).mockResolvedValue(paged([
      { id: 1, slug: 'a', names: { en: 'Kibble' }, brand_id: 3, category_id: 9 },
      { id: 2, slug: 'b', names: { en: 'Toy' }, brand_id: 99, category_id: 98 },
      { id: 3, slug: 'c', names: { en: 'Bone' }, brand_id: null, category_id: null },
    ]) as never)
    vi.mocked(api.getBrandsByIds).mockResolvedValue([{ id: 3, names: { en: 'Royal Canin' } }] as never)
    vi.mocked(api.getCategoriesByIds).mockResolvedValue([{ id: 9, name: null, external_id: 'g9' }] as never)
    const { default: Page } = await import(`${A}/products/page`)
    await show(Page, sp())
    const rows = bodyRows()
    expect(within(rows[0]).getByText('Royal Canin')).toBeTruthy()
    expect(within(rows[0]).getByText('g9')).toBeTruthy()
    expect(within(rows[1]).getByText('99')).toBeTruthy()
    expect(within(rows[1]).getByText('98')).toBeTruthy()
    expect(within(rows[2]).getAllByText('—')).toHaveLength(3) // brand, category, barcode
  })

  it('still lists products when the lookup calls fail', async () => {
    vi.mocked(api.getProducts).mockResolvedValue(paged([{ id: 1, slug: 'a', names: { en: 'Kibble' }, brand_id: 3, category_id: 9 }]) as never)
    vi.mocked(api.getBrandsByIds).mockResolvedValue([])
    vi.mocked(api.getCategoriesByIds).mockResolvedValue([])
    const { default: Page } = await import(`${A}/products/page`)
    await show(Page, sp())
    expect(within(bodyRows()[0]).getByText('3')).toBeTruthy()
    // only the ids of this page are looked up (B8200-004)
    expect(api.getBrandsByIds).toHaveBeenCalledWith([3])
    expect(api.getCategoriesByIds).toHaveBeenCalledWith([9])
  })

  it('shows the empty state when the product call fails', async () => {
    vi.mocked(api.getProducts).mockRejectedValue(new Error('x'))
    vi.mocked(api.getBrandsByIds).mockResolvedValue([])
    vi.mocked(api.getCategoriesByIds).mockResolvedValue([])
    const { default: Page } = await import(`${A}/products/page`)
    await show(Page, sp({ page: '2' }))
    expect(api.getProducts).toHaveBeenCalledWith({ q: undefined, id: undefined, limit: 20, offset: 20 })
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })
})

describe('categories list', () => {
  const cats = [
    { id: 1, parent_id: null, taxonomy_type: 'google', external_id: 'root', level: 'L1', path: null, name: 'Animals' },
    { id: 2, parent_id: 1, taxonomy_type: 'google', external_id: 'dogs', level: null, path: null, name: null },
  ]

  it('tree view (default) loads up to 1000 categories and warns when the result is truncated', async () => {
    vi.mocked(api.getCategories).mockImplementation((async (p: { limit?: number }) =>
      p.limit === 1000 ? { items: cats, total: 5000, limit: 1000, offset: 0 } : { items: cats, total: 5000, limit: 50, offset: 0 }) as never)
    const { default: Page } = await import(`${A}/categories/page`)
    await show(Page, sp())
    expect(api.getCategories).toHaveBeenCalledTimes(2)
    expect(screen.getByText(tr.tree_truncated.replace('{shown}', '2').replace('{total}', '5000'))).toBeTruthy()
  })

  it('tree view without truncation shows no warning', async () => {
    vi.mocked(api.getCategories).mockResolvedValue({ items: cats, total: 2, limit: 1000, offset: 0 } as never)
    const { default: Page } = await import(`${A}/categories/page`)
    await show(Page, sp())
    expect(screen.queryByText(/tree_truncated/)).toBeNull()
    expect(screen.queryByText(tr.tree_truncated.replace('{shown}', '2').replace('{total}', '2'))).toBeNull()
  })

  it('table view fetches once and falls back to external_id / dashes', async () => {
    vi.mocked(api.getCategories).mockResolvedValue({ items: cats, total: 2, limit: 50, offset: 0 } as never)
    const { default: Page } = await import(`${A}/categories/page`)
    await show(Page, sp({ view: 'table', taxonomy_type: 'google', page: '2' }))
    expect(api.getCategories).toHaveBeenCalledTimes(1)
    expect(api.getCategories).toHaveBeenCalledWith({ q: undefined, id: undefined, taxonomy_type: 'google', limit: 50, offset: 50 })
    const rows = bodyRows()
    expect(within(rows[0]).getByText('Animals')).toBeTruthy()
    expect(within(rows[1]).getByText('dogs')).toBeTruthy()
    expect(within(rows[1]).getAllByText('—').length).toBe(1)  // level null (parent is 1)
  })

  // Regression: the view toggle built `&q=${q}` without encoding, so a search for
  // "dog food & cat" lost everything after "&" when switching views.
  it('view toggle links keep the search term intact (URL-encoded)', async () => {
    vi.mocked(api.getCategories).mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 } as never)
    const { default: Page } = await import(`${A}/categories/page`)
    await show(Page, sp({ q: 'dog food & cat', view: 'table' }))
    const href = screen.getByRole('link', { name: tr.view_tree }).getAttribute('href')!
    const url = new URL(href, 'http://x')
    expect(url.pathname).toBe('/admin/categories')
    expect(url.searchParams.get('view')).toBe('tree')
    expect(url.searchParams.get('q')).toBe('dog food & cat')
  })

  it('failures degrade to empty views', async () => {
    vi.mocked(api.getCategories).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/categories/page`)
    await show(Page, sp())
    expect(screen.getByText(tr.no_categories)).toBeTruthy()
  })
})

describe('shop types / owners / offers / api keys lists', () => {
  it('shop types: uses computed name, falls back to canonical', async () => {
    vi.mocked(api.getShopTypes).mockResolvedValue(paged([
      { id: 1, canonical: 'pet_store', name: 'Pet store', translations: {} },
      { id: 2, canonical: 'bakery', name: null, translations: {} },
    ]) as never)
    const { default: Page } = await import(`${A}/shop-types/page`)
    await show(Page, sp({ page: '2' }))
    expect(api.getShopTypes).toHaveBeenCalledWith({ limit: 50, offset: 50 })
    expect(within(bodyRows()[0]).getByText('Pet store')).toBeTruthy()
    expect(within(bodyRows()[1]).getAllByText('bakery').length).toBeGreaterThan(0)
  })

  it('shop owners: forwards filters and renders the status as badge text', async () => {
    vi.mocked(api.getShopOwners).mockResolvedValue(paged([
      { id: 1, email: 'a@b.io', name: 'Olga', status: 'approved', shop_id: 3 },
      { id: 2, email: 'c@d.io', name: 'Ivo', status: 'pre_signup', shop_id: null },
    ]) as never)
    const { default: Page } = await import(`${A}/shop-owners/page`)
    await show(Page, sp({ q: 'o', status: 'approved' }))
    expect(api.getShopOwners).toHaveBeenCalledWith({ q: 'o', status: 'approved', limit: 20, offset: 0 })
    expect(within(bodyRows()[0]).getByText('approved')).toBeTruthy()
    expect(within(bodyRows()[1]).getByText('pre_signup')).toBeTruthy()
  })

  it('shop owners: empty state on failure', async () => {
    vi.mocked(api.getShopOwners).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/shop-owners/page`)
    await show(Page, sp())
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })

  it('offers: title falls back to a dash, archived is shown as Yes/No, SKU and listing are columns', async () => {
    vi.mocked(api.getOffers).mockResolvedValue(paged([
      { id: 1, shop_listing_id: 5, item_name: 'Cola', sku: 'A-100', title: null, source: 'owner', currency: 'EUR', price_type: 'fixed', archived: true },
      { id: 2, shop_listing_id: 6, item_name: null, sku: null, title: 'Deal', source: 'crawl', currency: 'EUR', price_type: 'free', archived: false },
    ]) as never)
    const { default: Page } = await import(`${A}/offers/page`)
    await show(Page, sp({ q: 'x', page: '2' }))
    expect(api.getOffers).toHaveBeenCalledWith(expect.objectContaining({ q: 'x', limit: 20, offset: 20 }))
    expect(screen.getByRole('columnheader', { name: tr.sku })).toBeTruthy()
    expect(within(bodyRows()[0]).getByText('A-100')).toBeTruthy()
    expect(within(bodyRows()[0]).getByText('Cola')).toBeTruthy()
    expect(within(bodyRows()[0]).getByText('5')).toBeTruthy()
    expect(within(bodyRows()[0]).getByText('Yes')).toBeTruthy()
    expect(within(bodyRows()[0]).getByText('—')).toBeTruthy()
    expect(within(bodyRows()[1]).getByText('No')).toBeTruthy()
  })

  it('offers: sku and shop_listing_id filters reach the API; there is no "new" link', async () => {
    vi.mocked(api.getOffers).mockResolvedValue(paged([]) as never)
    const { default: Page } = await import(`${A}/offers/page`)
    await show(Page, sp({ sku: ' A-100 ', shop_listing_id: '7' }))
    expect(api.getOffers).toHaveBeenCalledWith(expect.objectContaining({ sku: 'A-100', shop_listing_id: 7 }))
    expect((screen.getByLabelText(tr.filter_sku) as HTMLInputElement).defaultValue).toBe('A-100')
    expect(document.querySelector('a[href="/admin/offers/new"]')).toBeNull()
  })

  it('offers: ignores a non-numeric shop_listing_id', async () => {
    vi.mocked(api.getOffers).mockResolvedValue(paged([]) as never)
    const { default: Page } = await import(`${A}/offers/page`)
    await show(Page, sp({ shop_listing_id: 'abc' }))
    expect(api.getOffers).toHaveBeenCalledWith(expect.objectContaining({ shop_listing_id: undefined, sku: undefined }))
  })

  it('offers: empty state on failure', async () => {
    vi.mocked(api.getOffers).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/offers/page`)
    await show(Page, sp())
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })

  it('shop owner offers: paginated and failure-tolerant', async () => {
    vi.mocked(api.getShopOwnerOffers).mockResolvedValueOnce(paged([
      { id: 1, shop_listing_id: 2, sku: 'S-9', title: 'T', price: '12.50', currency: 'EUR', archived: false },
    ]) as never)
    const { default: Page } = await import(`${A}/shop-owner-offers/page`)
    const { unmount } = await show(Page, sp({ page: '2' }))
    expect(api.getShopOwnerOffers).toHaveBeenCalledWith({ limit: 20, offset: 20 })
    expect(within(bodyRows()[0]).getByText('12.50')).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: tr.valid_from })).toBeNull()
    expect(within(bodyRows()[0]).getByText('S-9')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: tr.sku })).toBeTruthy()
    unmount()
    vi.mocked(api.getShopOwnerOffers).mockRejectedValueOnce(new Error('x'))
    await show(Page, sp())
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })

  it('api keys: formats dates and shows "never" for unused keys', async () => {
    vi.mocked(api.getApiKeys).mockResolvedValue(paged([
      // the shape the backend really sends (AdminApiKeyResponse): `scopes` list and `owner_id`; type-checked on purpose
      {
        id: 1, key_prefix: 'pk_ab12', name: 'ci', key_type: 'internal', owner_id: 2, scopes: ['internal:write', 'read'],
        is_active: true, expires_at: null, created_at: '2026-03-04T10:00:00Z', created_by: null, last_used_at: null,
      } satisfies SysAdminApiKey,
    ]) as never)
    const { default: Page } = await import(`${A}/api-keys/page`)
    await show(Page, sp())
    const row = bodyRows()[0]
    expect(within(row).getByText(tr.never)).toBeTruthy()
    expect(within(row).getByText(new Date('2026-03-04T10:00:00Z').toLocaleDateString())).toBeTruthy()
    expect(within(row).getByText('internal:write, read'), 'scopes column (was always empty)').toBeTruthy()
    expect(within(row).getByText('2'), 'owner id column (was always empty)').toBeTruthy()
    expect(within(row).getByRole('button', { name: tr.revoke })).toBeTruthy()
  })

  it('api keys: shows prefix, status (active / revoked / expired) and expiry', async () => {
    const key = (id: number, over: Partial<SysAdminApiKey>): SysAdminApiKey => ({
      id, key_prefix: `pk_${id}`, name: `k${id}`, key_type: 'internal', owner_id: null, scopes: [], is_active: true, expires_at: null,
      created_at: '2026-03-04T10:00:00Z', created_by: null, last_used_at: null, ...over,
    })
    vi.mocked(api.getApiKeys).mockResolvedValue(paged([
      key(1, {}),
      key(2, { is_active: false }),
      key(3, { expires_at: '2020-01-01T00:00:00Z' }),
      key(4, { is_active: false, expires_at: '2020-01-01T00:00:00Z' }),
    ]) as never)
    const { default: Page } = await import(`${A}/api-keys/page`)
    await show(Page, sp())
    const rows = bodyRows()
    expect(within(rows[0]).getByText('pk_1')).toBeTruthy()
    expect(within(rows[0]).getByText(tr.api_key_active)).toBeTruthy()
    expect(within(rows[1]).getByText(tr.api_key_revoked)).toBeTruthy()
    expect(within(rows[2]).getByText(tr.api_key_expired)).toBeTruthy()
    expect(within(rows[2]).getByText(new Date('2020-01-01T00:00:00Z').toLocaleDateString())).toBeTruthy()
    expect(within(rows[3]).getByText(tr.api_key_revoked), 'revoked wins over expired').toBeTruthy()
  })

  it('api keys: empty state on failure', async () => {
    vi.mocked(api.getApiKeys).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/api-keys/page`)
    await show(Page, sp())
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })
})

describe('category attribute definitions pages', () => {
  it('overview forwards the search and links to the per-category management page', async () => {
    vi.mocked(api.getCategories).mockResolvedValue(paged([{ id: 4, name: 'Dogs', level: 'L2' }]) as never)
    const { default: Page } = await import(`${A}/category-attribute-definitions/page`)
    await show(Page, sp({ q: 'dog' }))
    expect(api.getCategories).toHaveBeenCalledWith({ q: 'dog', limit: 50, offset: 0 })
    expect(screen.getByRole('link', { name: 'Manage defs' }).getAttribute('href')).toBe('/admin/category-attribute-definitions/4')
  })

  it('overview: empty state on failure', async () => {
    vi.mocked(api.getCategories).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/category-attribute-definitions/page`)
    await show(Page, sp())
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })

  it('detail: 404 for an unknown category', async () => {
    vi.mocked(api.getCategory).mockRejectedValue(new Error('API_ERROR:404'))
    vi.mocked(api.getCategoryAttributeDefs).mockResolvedValue([])
    const { default: Page } = await import(`${A}/category-attribute-definitions/[categoryId]/page`)
    await expect(show(Page, par({ categoryId: '9' }))).rejects.toBeInstanceOf(NotFoundError)
  })

  it('detail: lists definitions with joined options and a delete action on the real backend route', async () => {
    vi.mocked(api.getCategory).mockResolvedValue({ id: 9, name: null, external_id: 'dogs' } as never)
    vi.mocked(api.getCategoryAttributeDefs).mockResolvedValue([
      { id: 1, attribute_key: 'size', attribute_type: 'select', allowed_values: ['S', 'M'], labels: { de: 'Größe' } },
      { id: 2, attribute_key: 'organic', attribute_type: 'bool', allowed_values: null, labels: {} },
    ] as never)
    const { default: Page } = await import(`${A}/category-attribute-definitions/[categoryId]/page`)
    await show(Page, par({ categoryId: '9' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent?.trim()).toBe('dogs')
    const rows = bodyRows()
    expect(within(rows[0]).getByText('S, M')).toBeTruthy()
    expect(within(rows[0]).getByText('Größe')).toBeTruthy()   // no English label -> first available
    expect(within(rows[1]).getAllByText('—')).toHaveLength(2)
    expect(screen.getByRole('link', { name: `+ ${tr.add_new}` }).getAttribute('href')).toBe('/admin/category-attribute-definitions/9/new')
    expect(within(rows[0]).getAllByRole('link', { name: tr.edit })[0].getAttribute('href')).toBe('/admin/category-attribute-definitions/9/1/edit')
  })

  it('detail: delete uses the category-attribute-definitions endpoint', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(api.getCategory).mockResolvedValue({ id: 9, name: 'Dogs', external_id: 'dogs' } as never)
    vi.mocked(api.getCategoryAttributeDefs).mockResolvedValue([
      { id: 7, attribute_key: 'size', attribute_type: 'text', allowed_values: null, labels: { en: 'Size' } },
    ] as never)
    const { default: Page } = await import(`${A}/category-attribute-definitions/[categoryId]/page`)
    await show(Page, par({ categoryId: '9' }))
    await user.click(screen.getByRole('button', { name: tr.delete }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: tr.delete }))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/category-attribute-definitions/7')
    vi.unstubAllGlobals()
  })

  it('edit: 404 for an unknown definition, otherwise passes it to the form', async () => {
    vi.mocked(api.getCategoryAttributeDefs).mockResolvedValue([{ id: 3, attribute_key: 'size' }] as never)
    const { default: Page } = await import(`${A}/category-attribute-definitions/[categoryId]/[id]/edit/page`)
    await expect(show(Page, par({ categoryId: '9', id: '999' }))).rejects.toBeInstanceOf(NotFoundError)
    await show(Page, par({ categoryId: '9', id: '3' }))
    expect(stubProps('AttrDefEditForm')).toMatchObject({ categoryId: '9', def: { id: 3 } })
  })

  it('edit: a failing backend lookup is a 404, not a crash', async () => {
    vi.mocked(api.getCategoryAttributeDefs).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/category-attribute-definitions/[categoryId]/[id]/edit/page`)
    await expect(show(Page, par({ categoryId: '9', id: '3' }))).rejects.toBeInstanceOf(NotFoundError)
  })
})

// ─── New / edit pages ───────────────────────────────────────────────────────────

describe('edit pages: 404 when the record cannot be loaded, otherwise hand the record to the form', () => {
  it.each([
    ['shops/[id]/edit/page', 'getShop', 'ShopForm', 'shop'],
    ['brands/[id]/edit/page', 'getBrand', 'BrandForm', 'brand'],
    ['products/[id]/edit/page', 'getProduct', 'ProductForm', 'product'],
    ['categories/[id]/edit/page', 'getCategory', 'CategoryForm', 'category'],
    ['shop-types/[id]/edit/page', 'getShopType', 'ShopTypeEditForm', 'shopType'],
    ['offers/[id]/edit/page', 'getOffer', 'OfferForm', 'offer'],
    ['shop-owners/[id]/edit/page', 'getShopOwner', 'ShopOwnerEditForm', 'owner'],
    ['shop-owner-offers/[id]/edit/page', 'getShopOwnerOffer', 'ShopOwnerOfferEditForm', 'offer'],
    ['item-domain-mappings/[id]/edit/page', 'getItemDomainMapping', 'MappingForm', 'mapping'],
  ] as const)('%s', async (file, getter, stubName, prop) => {
    // Siblings of the main record: tolerate failures
    for (const k of ['getAllShopTypes', 'getAllCategories', 'getAllBrands', 'getCategoriesByIds', 'getBrandsByIds', 'getProductAttributes', 'getCategoryTranslations', 'getCategoryAttributeDefs'] as const) {
      asMock(api[k]).mockResolvedValue([])
    }
    const { default: Page } = await import(`${A}/${file}`)

    asMock(api[getter]).mockRejectedValueOnce(new Error('API_ERROR:404'))
    await expect(show(Page, par({ id: '5' }))).rejects.toBeInstanceOf(NotFoundError)

    asMock(api[getter]).mockResolvedValueOnce({ id: 5, slug: 's', names: { en: 'N' }, name: 'N', title: 'T', canonical: 'c', translations: {} })
    await show(Page, par({ id: '5' }))
    expect(asMock(api[getter])).toHaveBeenLastCalledWith(5)
    expect(stubProps(stubName)[prop]).toMatchObject({ id: 5 })
  })

  it('shop edit sorts shop types by (localized) name for the form', async () => {
    vi.mocked(api.getShop).mockResolvedValue({ id: 1, slug: 's', names: { en: 'S' } } as never)
    vi.mocked(api.getAllShopTypes).mockResolvedValue([
      { id: 1, canonical: 'zoo', name: null },
      { id: 2, canonical: 'bakery', name: 'Bakery' },
      { id: 3, canonical: 'a_store', name: 'Alpha' },
    ] as never)
    const { default: Page } = await import(`${A}/shops/[id]/edit/page`)
    await show(Page, par({ id: '1' }))
    expect(stubProps('ShopForm').shopTypes.map((s: { id: number }) => s.id)).toEqual([3, 2, 1])
  })

  it('shop edit still renders when shop types cannot be loaded', async () => {
    vi.mocked(api.getShop).mockResolvedValue({ id: 1, slug: 's', names: { en: 'S' } } as never)
    vi.mocked(api.getAllShopTypes).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/shops/[id]/edit/page`)
    await show(Page, par({ id: '1' }))
    expect(stubProps('ShopForm').shopTypes).toEqual([])
  })

  it('product edit passes the attributes and only the selected category and brand (B8200-004)', async () => {
    vi.mocked(api.getProduct).mockResolvedValue({ id: 5, slug: 'p', names: { en: 'P' }, category_id: 1, brand_id: 7 } as never)
    vi.mocked(api.getProductAttributes).mockRejectedValue(new Error('x'))
    vi.mocked(api.getCategoriesByIds).mockResolvedValue([{ id: 1 }] as never)
    vi.mocked(api.getBrandsByIds).mockResolvedValue([])
    const { default: Page } = await import(`${A}/products/[id]/edit/page`)
    await show(Page, par({ id: '5' }))
    expect(api.getCategoriesByIds).toHaveBeenCalledWith([1])
    expect(api.getBrandsByIds).toHaveBeenCalledWith([7])
    expect(stubProps('ProductForm')).toMatchObject({ attributes: [], brands: [], categories: [{ id: 1 }] })
  })

  it('category edit passes translations, definitions and the full category list', async () => {
    vi.mocked(api.getCategory).mockResolvedValue({ id: 5, name: 'Dogs' } as never)
    vi.mocked(api.getCategoryTranslations).mockResolvedValue([{ id: 1, lang: 'en' }] as never)
    vi.mocked(api.getCategoryAttributeDefs).mockResolvedValue([{ id: 2 }] as never)
    vi.mocked(api.getAllCategories).mockResolvedValue([{ id: 5 }, { id: 6 }] as never)
    const { default: Page } = await import(`${A}/categories/[id]/edit/page`)
    await show(Page, par({ id: '5' }))
    expect(stubProps('CategoryForm')).toMatchObject({ translations: [{ id: 1 }], attrDefs: [{ id: 2 }], allCategories: [{ id: 5 }, { id: 6 }] })
  })
})

describe('new pages', () => {
  it.each([
    ['shops/new/page', 'ShopForm', { shop: null }],
    ['brands/new/page', 'BrandForm', { brand: null }],
    ['products/new/page', 'ProductForm', { product: null, attributes: [] }],
    ['categories/new/page', 'CategoryForm', { category: null, translations: [], attrDefs: [] }],
    ['item-domain-mappings/new/page', 'MappingForm', { mode: 'create' }],
    ['crm/contacts/new/page', 'ContactForm', {}],
  ] as const)('%s renders an empty form', async (file, stubName, expected) => {
    vi.mocked(api.getAllShopTypes).mockRejectedValue(new Error('x'))
    vi.mocked(api.getAllCategories).mockRejectedValue(new Error('x'))
    vi.mocked(api.getAllBrands).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/${file}`)
    await show(Page)
    expect(stubProps(stubName)).toMatchObject(expected)
  })

  it('offers/new explains that offers are created elsewhere instead of rendering a form that ends in 405', async () => {
    const { default: Page } = await import(`${A}/offers/new/page`)
    await show(Page)
    expect(screen.getByText(tr.offers_created_elsewhere)).toBeTruthy()
    expect(screen.queryByRole('button', { name: tr.save })).toBeNull()
  })

  it('social link rule and onboarding domain pages render their content', async () => {
    const { default: NewRule } = await import(`${A}/social-link-rules/new/page`)
    const { unmount } = await show(NewRule)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(tr.slr_new)
    expect(screen.getByLabelText(new RegExp(`^${tr.slr_host}`))).toBeTruthy()
    unmount()
    const { default: Od } = await import(`${A}/onboarding-domains/page`)
    await show(Od)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(tr.od_title)
  })
})

// ─── Item-domain mappings, social link rules, CRM list ──────────────────────────

describe('item-domain-mappings pages', () => {
  it('list forwards filters; failures show the empty state', async () => {
    vi.mocked(api.getItemDomainMappings).mockResolvedValueOnce({ items: [
      { id: 1, item_id: 10, item_name: 'Food', domain_id: 1, onboarding_domain_slug: 'pets', specialty_id: null, auto_assign: true, created_at: '' },
    ], total: 1, limit: 50, offset: 0 } as never)
    const { default: Page } = await import(`${A}/item-domain-mappings/page`)
    const { unmount } = await show(Page, sp({ domain: 'pets', specialty: 'vet', page: '2' }))
    expect(api.getItemDomainMappings).toHaveBeenCalledWith({ domain: 'pets', specialty: 'vet', limit: 50, offset: 50 })
    expect(screen.getByText('Food')).toBeTruthy()
    expect(screen.getByRole('link', { name: tr.clear })).toBeTruthy()
    unmount()
    vi.mocked(api.getItemDomainMappings).mockRejectedValueOnce(new Error('x'))
    await show(Page, sp())
    expect(screen.getByText(tr.idm_no_mappings)).toBeTruthy()
    expect(screen.queryByRole('link', { name: tr.clear })).toBeNull()
  })

  it('gaps: shows uncovered domains and specialties, hides covered ones', async () => {
    vi.mocked(api.getMappingGaps).mockResolvedValue([
      { kind: 'domain', slug: 'pets', domain_id: 1, specialty_id: null, auto_assign_item_count: 0 },
      { kind: 'specialty', slug: null, domain_id: null, specialty_id: 8, auto_assign_item_count: 0 },
      { kind: 'domain', slug: 'food', domain_id: 2, specialty_id: null, auto_assign_item_count: 4 },
    ] as never)
    const { default: Page } = await import(`${A}/item-domain-mappings/gaps/page`)
    await show(Page)
    const rows = bodyRows()
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('pets')).toBeTruthy()
    expect(within(rows[1]).getByText('#8')).toBeTruthy()
    expect(screen.queryByText('food')).toBeNull()
  })

  it('gaps: success message when nothing is uncovered or the report fails', async () => {
    vi.mocked(api.getMappingGaps).mockResolvedValueOnce([])
    const { default: Page } = await import(`${A}/item-domain-mappings/gaps/page`)
    const { unmount } = await show(Page)
    expect(screen.getByText(tr.idm_gaps_none)).toBeTruthy()
    unmount()
    vi.mocked(api.getMappingGaps).mockRejectedValueOnce(new Error('x'))
    await show(Page)
    expect(screen.getByText(tr.idm_gaps_none)).toBeTruthy()
  })
})

describe('social link rules page', () => {
  it('forwards query, category and page; shows the clear link only when filtered', async () => {
    vi.mocked(api.getSocialLinkRules).mockResolvedValueOnce({ items: [
      { id: 1, host: 'bad.com', category: 'adult', source: 'admin', note: null, external_batch_id: null, created_at: '2026-01-01T00:00:00Z' },
    ], total: 1, limit: 50, offset: 0 } as never)
    const { default: Page } = await import(`${A}/social-link-rules/page`)
    const { unmount } = await show(Page, sp({ q: 'bad', category: 'adult', page: '2' }))
    expect(api.getSocialLinkRules).toHaveBeenCalledWith({ q: 'bad', category: 'adult', limit: 50, offset: 50 })
    expect(screen.getByText('bad.com')).toBeTruthy()
    expect(screen.getByRole('link', { name: tr.clear })).toBeTruthy()
    unmount()
    vi.mocked(api.getSocialLinkRules).mockRejectedValueOnce(new Error('x'))
    await show(Page, sp())
    expect(screen.getByText(tr.no_items)).toBeTruthy()
    expect(screen.queryByRole('link', { name: tr.clear })).toBeNull()
  })
})

describe('CRM pages', () => {
  it('contacts list: forwards filters, offset 50 per page, empty state on failure', async () => {
    vi.mocked(api.getCrmContacts).mockResolvedValueOnce({ items: [
      { id: 1, display_name: 'Mia', org_name: 'Acme', primary_email: 'm@a.io', lifecycle_state: 'QUEUED', version: 1, updated_at: '2026-01-01T00:00:00Z' },
    ], total: 1, limit: 50, offset: 0 } as never)
    const { default: Page } = await import(`${A}/crm/contacts/page`)
    const { unmount } = await show(Page, sp({ q: 'acme', lifecycle_state: 'QUEUED', page: '3' }))
    expect(api.getCrmContacts).toHaveBeenCalledWith({ q: 'acme', lifecycle_state: 'QUEUED', limit: 50, offset: 100 })
    expect(screen.getByText('Acme')).toBeTruthy()
    expect(screen.getByRole('link', { name: tr.clear })).toBeTruthy()
    unmount()
    vi.mocked(api.getCrmContacts).mockRejectedValueOnce(new Error('x'))
    await show(Page, sp())
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })

  const detail = (over: Record<string, unknown> = {}) => ({
    id: 5, version: 2, display_name: 'Mia', role_title: 'Owner', lifecycle_state: 'QUEUED',
    org: { id: 1, name: 'Acme', legal_name: 'Acme Ltd', city: 'Larnaca', category: 'cafe', business_status: 'unconfirmed' },
    shop_id: 77, needs_human: true, agent_paused: false, effective_legal_tier: 'B', effective_legal_basis: 'li',
    card_image_front_url: null, card_image_back_url: null, channels: [], sources: [], interactions: [], messages: [],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', ...over,
  })
  const me = (over: Record<string, unknown>) => ({ id: 1, email: 'a@b.io', role: 'editor', permissions: null, ...over })

  it('detail: non-numeric id is a 404 without hitting the backend', async () => {
    const { default: Page } = await import(`${A}/crm/contacts/[id]/page`)
    await expect(show(Page, par({ id: 'abc' }))).rejects.toBeInstanceOf(NotFoundError)
    expect(api.getCrmContact).not.toHaveBeenCalled()
  })

  it('detail: backend 404 -> notFound, other errors propagate', async () => {
    const { default: Page } = await import(`${A}/crm/contacts/[id]/page`)
    vi.mocked(api.getCrmContact).mockRejectedValueOnce(new Error('API_ERROR:404'))
    await expect(show(Page, par({ id: '5' }))).rejects.toBeInstanceOf(NotFoundError)
    vi.mocked(api.getCrmContact).mockRejectedValueOnce(new Error('API_ERROR:500'))
    await expect(show(Page, par({ id: '5' }))).rejects.toThrow('API_ERROR:500')
  })

  it('detail: shows org data, flags, sources and hides the card viewer without a front image', async () => {
    vi.mocked(api.getCrmContact).mockResolvedValue(detail({
      sources: [{ id: 1, source: 'business_card', source_ref: 'ref-1', legal_basis: 'li', observed_at: '2026-01-01T00:00:00Z' }],
    }) as never)
    vi.mocked(api.getAdminMe).mockResolvedValue(me({}) as never)
    const { default: Page } = await import(`${A}/crm/contacts/[id]/page`)
    await show(Page, par({ id: '5' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mia')
    expect(screen.getByText('Acme Ltd')).toBeTruthy()
    expect(screen.getByText(tr.crm_state_QUEUED)).toBeTruthy()
    expect(screen.getByText('77')).toBeTruthy()
    expect(screen.getByText(/ref-1/)).toBeTruthy()
    expect(screen.getByText(tr.yes)).toBeTruthy()
    expect(screen.queryByTestId('CardImageViewer')).toBeNull()
    expect(stubProps('ContactDetailActions').me).toMatchObject({ role: 'editor' })
  })

  it('detail: write permission decides whether edit form and channel editing are offered', async () => {
    vi.mocked(api.getCrmContact).mockResolvedValue(detail({ card_image_front_url: 'k' }) as never)
    const { default: Page } = await import(`${A}/crm/contacts/[id]/page`)

    vi.mocked(api.getAdminMe).mockResolvedValueOnce(me({ permissions: ['crm:lifecycle:write'] }) as never)
    const first = await show(Page, par({ id: '5' }))
    expect(screen.queryByTestId('ContactEditForm')).toBeNull()
    expect(stubProps('ChannelEditor').canWrite).toBe(false)
    expect(stubProps('CardImageViewer')).toMatchObject({ contactId: 5, frontKey: 'k', backKey: null })
    first.unmount()

    vi.mocked(api.getAdminMe).mockResolvedValueOnce(me({ permissions: ['crm:contacts:write'] }) as never)
    const second = await show(Page, par({ id: '5' }))
    expect(screen.getByTestId('ContactEditForm')).toBeTruthy()
    expect(stubProps('ChannelEditor').canWrite).toBe(true)
    second.unmount()

    vi.mocked(api.getAdminMe).mockResolvedValueOnce(me({ role: 'superadmin', permissions: [] }) as never)
    await show(Page, par({ id: '5' }))
    expect(stubProps('ChannelEditor').canWrite).toBe(true)
  })

  it('detail: empty sources show the empty state', async () => {
    vi.mocked(api.getCrmContact).mockResolvedValue(detail() as never)
    vi.mocked(api.getAdminMe).mockResolvedValue(me({}) as never)
    const { default: Page } = await import(`${A}/crm/contacts/[id]/page`)
    await show(Page, par({ id: '5' }))
    expect(screen.getAllByText(tr.no_items).length).toBeGreaterThan(0)
  })
})

// ─── Layouts ────────────────────────────────────────────────────────────────────

describe('portal layout', () => {
  it('renders the shell with the admin email', async () => {
    vi.mocked(api.getAdminMe).mockResolvedValue({ id: 1, email: 'root@pundo.io', role: 'superadmin', permissions: null })
    const { default: Layout } = await import(`${A}/layout`)
    await show(Layout, { children: React.createElement('p', null, 'inner') })
    expect(screen.getByText('inner')).toBeTruthy()
    expect(screen.getAllByText('root@pundo.io').length).toBeGreaterThan(0)
  })

  it.each(['UNAUTHORIZED', 'FORBIDDEN'])('redirects to the login on %s', async (msg) => {
    vi.mocked(api.getAdminMe).mockRejectedValue(new Error(msg))
    const { default: Layout } = await import(`${A}/layout`)
    await expect(show(Layout, { children: null })).rejects.toMatchObject({ to: '/admin/login' })
  })

  it('lets the page render its own error state when the backend is down', async () => {
    vi.mocked(api.getAdminMe).mockRejectedValue(new Error('fetch failed'))
    const { default: Layout } = await import(`${A}/layout`)
    await show(Layout, { children: React.createElement('p', null, 'inner') })
    expect(screen.getByText('inner')).toBeTruthy()
  })
})
