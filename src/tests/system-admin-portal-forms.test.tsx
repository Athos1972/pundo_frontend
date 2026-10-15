import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type {
  SysAdminOffer, SysAdminShopType, SysAdminShopOwner, SysAdminItemDomainMapping,
  SysAdminSocialLinkRule, SysAdminCategoryAttributeDef,
} from '@/types/system-admin'

const push = vi.fn()
const refresh = vi.fn()
let routeParams: Record<string, string> = { categoryId: '12' }
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn(), back: vi.fn() }),
  useParams: () => routeParams,
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))

import { showToast } from '@/components/system-admin/Toast'

const P = '@/app/(system-admin)/admin/(portal)'
import { ShopTypeEditForm } from '@/app/(system-admin)/admin/(portal)/shop-types/[id]/edit/ShopTypeEditForm'
import { ShopOwnerEditForm } from '@/app/(system-admin)/admin/(portal)/shop-owners/[id]/edit/ShopOwnerEditForm'
import { ShopOwnerOfferEditForm } from '@/app/(system-admin)/admin/(portal)/shop-owner-offers/[id]/edit/ShopOwnerOfferEditForm'
import { OfferForm } from '@/app/(system-admin)/admin/(portal)/offers/new/OfferForm'
import { MappingForm } from '@/app/(system-admin)/admin/(portal)/item-domain-mappings/MappingForm'
import { MappingList } from '@/app/(system-admin)/admin/(portal)/item-domain-mappings/MappingList'
import { RuleForm } from '@/app/(system-admin)/admin/(portal)/social-link-rules/RuleForm'
import { RuleList } from '@/app/(system-admin)/admin/(portal)/social-link-rules/RuleList'
import { AttrDefEditForm } from '@/app/(system-admin)/admin/(portal)/category-attribute-definitions/[categoryId]/[id]/edit/AttrDefEditForm'
import NewCategoryAttrDefPage from '@/app/(system-admin)/admin/(portal)/category-attribute-definitions/[categoryId]/new/page'
import NewShopTypePage from '@/app/(system-admin)/admin/(portal)/shop-types/new/page'
void P

const mockFetch = vi.fn()
const tr = tSysAdmin('en')
const trEl = tSysAdmin('el')
const ok = (status = 200, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

beforeEach(() => {
  push.mockReset(); refresh.mockReset(); mockFetch.mockReset()
  vi.mocked(showToast).mockClear()
  routeParams = { categoryId: '12' }
  vi.stubGlobal('fetch', mockFetch)
  vi.stubGlobal('alert', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

// ─── ShopTypeEditForm / NewShopTypePage ──────────────────────────────────────────

describe('ShopTypeEditForm', () => {
  const st: SysAdminShopType = { id: 4, canonical: 'pet_store', translations: { en: 'Pet store', el: 'Pet' }, name: 'Pet store', created_at: '' }

  it('shows existing translations for all six languages and PATCHes canonical + translations', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    render(<ShopTypeEditForm shopType={st} tr={tr} />)
    const inputs = screen.getAllByRole('textbox').slice(1)
    expect(inputs).toHaveLength(6)
    expect((inputs[0] as HTMLInputElement).value).toBe('Pet store')
    expect((inputs[1] as HTMLInputElement).value).toBe('')
    await user.type(inputs[4], 'متجر')   // ar
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/shop-types'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/shop-types/4')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      canonical: 'pet_store', translations: { en: 'Pet store', el: 'Pet', ar: 'متجر' },
    })
  })

  it('toasts errors and stays on the page', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(ok(500))
    render(<ShopTypeEditForm shopType={st} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_generic, 'error'))
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_backend, 'error'))
    expect(push).not.toHaveBeenCalled()
  })

  it('cancel returns to the list', async () => {
    const user = userEvent.setup()
    render(<ShopTypeEditForm shopType={st} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(push).toHaveBeenCalledWith('/admin/shop-types')
  })
})

describe('NewShopTypePage', () => {
  it('creates a shop type with a trimmed name and null description', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok(201))
    render(<NewShopTypePage />)
    await user.type(screen.getByLabelText(new RegExp(`^${tr.name}`)), '  Bakery ')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/shop-types'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/shop-types')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ name: 'Bakery', description: null })
  })
})

// ─── ShopOwnerEditForm ──────────────────────────────────────────────────────────

describe('ShopOwnerEditForm', () => {
  const owner = (status: SysAdminShopOwner['status']): SysAdminShopOwner => ({ id: 8, email: 'o@x.io', name: 'Olga', status, shop_id: 33 })

  it('pending owner: both approve and reject are available', () => {
    render(<ShopOwnerEditForm owner={owner('pending')} tr={tr} />)
    expect(screen.getByRole('button', { name: tr.approve })).toBeTruthy()
    expect(screen.getByRole('button', { name: tr.reject })).toBeTruthy()
    expect(screen.getByText('o@x.io')).toBeTruthy()
  })

  it('approved owner can only be rejected, rejected only approved', () => {
    const { unmount } = render(<ShopOwnerEditForm owner={owner('approved')} tr={tr} />)
    expect(screen.queryByRole('button', { name: tr.approve })).toBeNull()
    expect(screen.getByRole('button', { name: tr.reject })).toBeTruthy()
    unmount()
    render(<ShopOwnerEditForm owner={owner('rejected')} tr={tr} />)
    expect(screen.getByRole('button', { name: tr.approve })).toBeTruthy()
    expect(screen.queryByRole('button', { name: tr.reject })).toBeNull()
  })

  it('approving PATCHes the status, updates the badge and refreshes', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    render(<ShopOwnerEditForm owner={owner('pending')} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.approve }))
    await waitFor(() => expect(screen.getByText('approved')).toBeTruthy())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/shop-owners/8')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ status: 'approved' })
    expect(refresh).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(tr.saved, 'success')
    expect(screen.queryByRole('button', { name: tr.approve })).toBeNull()
  })

  it('keeps the old status when the backend refuses', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok(403))
    render(<ShopOwnerEditForm owner={owner('pending')} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.reject }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_generic, 'error'))
    expect(screen.getByText('pending')).toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('network failure toasts backend error; cancel goes to the list', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('down'))
    render(<ShopOwnerEditForm owner={owner('pending')} tr={trEl} />)
    await user.click(screen.getByRole('button', { name: trEl.approve }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(trEl.error_backend, 'error'))
    await user.click(screen.getByRole('button', { name: trEl.cancel }))
    expect(push).toHaveBeenCalledWith('/admin/shop-owners')
  })
})

// ─── Offer forms ────────────────────────────────────────────────────────────────

describe('OfferForm', () => {
  const offer: SysAdminOffer = {
    id: 21, shop_listing_id: 5, title: 'Sale', description: null, price_type: 'free', price_tiers: [], currency: 'USD',
    valid_from: null, valid_until: null, source: 'admin', offer_url: null, archived: false, crawled_at: null, created_at: '',
  }

  it('create: defaults to fixed price in EUR; blank texts become null; no listing id -> null', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok(201))
    render(<OfferForm offer={null} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/offers'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/offers')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      shop_listing_id: null, currency: 'EUR', price_type: 'fixed', title: null, description: null, offer_url: null, price_tiers: [],
    })
  })

  it('edit: prefills and PATCHes with edited values', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    render(<OfferForm offer={offer} tr={tr} />)
    expect((screen.getByLabelText(tr.shop_listing_id) as HTMLInputElement).value).toBe('5')
    expect((screen.getByLabelText(tr.price_type) as HTMLSelectElement).value).toBe('free')
    await user.type(screen.getByLabelText(tr.offer_desc), ' Details ')
    await user.selectOptions(screen.getByLabelText(tr.price_type), 'on_request')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/offers/21')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      shop_listing_id: 5, currency: 'USD', price_type: 'on_request', title: 'Sale', description: 'Details',
    })
  })

  it('toasts on rejection and network failure', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(ok(422))
    render(<OfferForm offer={offer} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_generic, 'error'))
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_backend, 'error'))
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(push).toHaveBeenCalledWith('/admin/offers')
  })
})

describe('ShopOwnerOfferEditForm', () => {
  it('PATCHes the edited offer, blank dates become null', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    const offer = { id: 3, shop_listing_id: 1, title: 'T', description: 'D', price_type: 'fixed', price_tiers: [], currency: 'EUR', valid_from: '2026-01-01', valid_until: null, source: 'owner', offer_url: null, archived: false, crawled_at: null, created_at: '' } as SysAdminOffer
    render(<ShopOwnerOfferEditForm offer={offer} tr={tr} />)
    expect((screen.getByLabelText(tr.valid_from) as HTMLInputElement).value).toBe('2026-01-01')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/shop-owner-offers'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/shop-owner-offers/3')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      title: 'T', description: 'D', valid_from: '2026-01-01', valid_until: null, offer_url: null,
    })
  })
})

// ─── Item domain mappings ───────────────────────────────────────────────────────

describe('MappingForm', () => {
  const mapping: SysAdminItemDomainMapping = {
    id: 9, item_id: 70, item_name: 'Dog food', domain_id: null, onboarding_domain_id: 4, onboarding_domain_slug: 'pets',
    specialty_id: 6, specialty_slug: 'vet', priority: 2, auto_assign: false, created_at: '',
  }

  it('create: rejects a missing item id without calling the API', async () => {
    const user = userEvent.setup()
    render(<MappingForm tr={tr} mode="create" />)
    const form = screen.getByRole('button', { name: tr.save }).closest('form')!
    fireEvent.submit(form)   // bypass native required validation to reach our own check
    expect(await screen.findByText(tr.error_required)).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
    void user
  })

  it('create: posts numbers, includes optional ids only when given, defaults auto_assign=true', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok(201))
    render(<MappingForm tr={tr} mode="create" />)
    await user.type(screen.getByLabelText(new RegExp(`^${tr.idm_item_id}`)), '70')
    await user.type(screen.getByLabelText(tr.idm_domain_id), '4')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/item-domain-mappings'))
    expect(refresh).toHaveBeenCalled()
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/item-domain-mappings')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ item_id: 70, auto_assign: true, priority: 0, domain_id: 4 })
  })

  it('edit: prefills (including legacy onboarding_domain_id and slugs) and PATCHes', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    render(<MappingForm tr={tr} mode="edit" mapping={mapping} />)
    expect((screen.getByLabelText(tr.idm_domain_id) as HTMLInputElement).value).toBe('4')
    expect((screen.getByLabelText(tr.idm_auto_assign) as HTMLSelectElement).value).toBe('false')
    expect(screen.getByText('Dog food')).toBeTruthy()
    expect(screen.getByText('pets')).toBeTruthy()
    expect(screen.getByText('vet')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/item-domain-mappings/9')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      item_id: 70, auto_assign: false, priority: 2, domain_id: 4, specialty_id: 6,
    })
  })

  it('shows a generic error when the backend refuses or is unreachable', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(ok(409))
    render(<MappingForm tr={tr} mode="edit" mapping={mapping} />)
    await user.click(screen.getByRole('button', { name: tr.save }))
    expect(await screen.findByText(tr.error_generic)).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    expect(screen.getByText(tr.error_generic)).toBeTruthy()
  })
})

describe('MappingList', () => {
  const rows: SysAdminItemDomainMapping[] = [
    { id: 1, item_id: 10, item_name: 'Food', domain_id: 2, onboarding_domain_slug: 'pets', specialty_id: null, priority: 1, auto_assign: true, created_at: '' },
    { id: 2, item_id: 11, item_name: null, domain_id: 3, specialty_id: 5, priority: 0, auto_assign: false, created_at: '' },
    { id: 3, item_id: 12, item_name: 'Toy', domain_id: null, specialty_id: null, priority: 0, auto_assign: true, created_at: '' },
  ]
  const base = { mappings: rows, total: 3, page: 1, limit: 50, tr, domain: '', specialty: '' }

  it('renders slug, #id or dash fallbacks and the auto-assign marker', () => {
    render(<MappingList {...base} />)
    const r = screen.getAllByRole('row').slice(1)
    expect(within(r[0]).getByText('pets')).toBeTruthy()
    expect(within(r[1]).getByText('#3')).toBeTruthy()
    expect(within(r[1]).getByText('#5')).toBeTruthy()
    expect(within(r[1]).getByText('—')).toBeTruthy()      // item name missing
    expect(within(r[2]).getAllByText('—').length).toBe(2) // no domain, no specialty
    expect(within(r[0]).getByRole('link', { name: tr.edit }).getAttribute('href')).toBe('/admin/item-domain-mappings/1/edit')
  })

  it('empty state', () => {
    render(<MappingList {...base} mappings={[]} total={0} />)
    expect(screen.getByText(tr.idm_no_mappings)).toBeTruthy()
  })

  it('delete asks first; cancel does nothing; confirm DELETEs and refreshes (204 ok)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok(204))
    render(<MappingList {...base} />)
    await user.click(screen.getAllByRole('button', { name: tr.delete })[0])
    expect(screen.getByText(tr.idm_delete_confirm)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(mockFetch).not.toHaveBeenCalled()
    await user.click(screen.getAllByRole('button', { name: tr.delete })[1])
    await user.click(screen.getAllByRole('button', { name: tr.delete })[0])
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/item-domain-mappings/2')
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
  })

  it('alerts when the delete fails (backend or network)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(ok(500))
    render(<MappingList {...base} />)
    await user.click(screen.getAllByRole('button', { name: tr.delete })[0])
    await user.click(screen.getAllByRole('button', { name: tr.delete })[0])
    await waitFor(() => expect(alert).toHaveBeenCalledWith(tr.error_generic))
    expect(refresh).not.toHaveBeenCalled()
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getAllByRole('button', { name: tr.delete })[0])
    await user.click(screen.getAllByRole('button', { name: tr.delete })[0])
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(2))
  })

  it('pagination links keep the filters', () => {
    render(<MappingList {...base} total={120} page={2} limit={50} domain="pets" specialty="vet" />)
    expect(screen.getByText(tr.prev).getAttribute('href')).toBe('/admin/item-domain-mappings?domain=pets&specialty=vet&page=1')
    expect(screen.getByText(tr.next).getAttribute('href')).toBe('/admin/item-domain-mappings?domain=pets&specialty=vet&page=3')
    expect(screen.getByText(`${tr.showing} 51–100 ${tr.of} 120`)).toBeTruthy()
  })
})

// ─── Social link rules ──────────────────────────────────────────────────────────

describe('RuleForm', () => {
  async function submitHost(user: ReturnType<typeof userEvent.setup>, host: string) {
    await user.type(screen.getByLabelText(new RegExp(`^${tr.slr_host}`)), host)
    await user.click(screen.getByRole('button', { name: tr.slr_new }))
  }

  it.each(['https://evil.com', 'evil.com/path', 'evil com', '-bad.com', 'bad_host.com'])('rejects invalid host %s', async (host) => {
    const user = userEvent.setup()
    render(<RuleForm tr={tr} />)
    await submitHost(user, host)
    expect(await screen.findByText(tr.slr_invalid_host)).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // Regression: hosts that merely START with "http" (httpbin.org, http-tools.net)
  // were rejected by a leftover startsWith('http') check.
  it.each(['httpbin.org', 'http-tools.net'])('accepts legitimate host %s', async (host) => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok(201))
    render(<RuleForm tr={tr} />)
    await submitHost(user, host)
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/social-link-rules'))
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).host).toBe(host)
  })

  it('normalises host to lowercase, sends category and note (blank -> null)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok(201))
    render(<RuleForm tr={tr} />)
    await user.selectOptions(screen.getByLabelText(new RegExp(`^${tr.slr_category}`)), 'gambling')
    await submitHost(user, 'Casino.Example.COM')
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/social-link-rules')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ host: 'casino.example.com', category: 'gambling', note: null })
  })

  it('409 = duplicate, 422 = invalid host (both on the host field), other = generic', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(ok(409))
    render(<RuleForm tr={tr} />)
    await submitHost(user, 'a.com')
    expect(await screen.findByText(tr.slr_duplicate_error)).toBeTruthy()
    mockFetch.mockResolvedValueOnce(ok(422))
    await user.click(screen.getByRole('button', { name: tr.slr_new }))
    expect(await screen.findByText(tr.slr_invalid_host)).toBeTruthy()
    mockFetch.mockResolvedValueOnce(ok(500))
    await user.click(screen.getByRole('button', { name: tr.slr_new }))
    expect(await screen.findByText(tr.error_generic)).toBeTruthy()
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: tr.slr_new }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4))
    expect(push).not.toHaveBeenCalled()
  })
})

describe('RuleList', () => {
  const rule = (id: number, over: Partial<SysAdminSocialLinkRule> = {}): SysAdminSocialLinkRule => ({
    id, host: `h${id}.com`, category: 'adult', source: 'admin', note: null, external_batch_id: null, created_at: '2026-01-01T00:00:00Z', ...over,
  })
  const base = { rules: [rule(1), rule(2, { source: 'external', note: 'from list', category: 'malware' })], total: 2, page: 1, limit: 50, tr, q: '', category: '' }

  it('only admin rules are deletable; external ones carry a read-only badge', () => {
    render(<RuleList {...base} />)
    expect(screen.getAllByRole('button', { name: tr.delete })).toHaveLength(1)
    expect(screen.getByText(tr.slr_read_only_badge)).toBeTruthy()
    expect(screen.getByText(tr.slr_cat_malware)).toBeTruthy()
    expect(screen.getByText('from list')).toBeTruthy()
  })

  it('unknown category falls back to the raw value, empty list shows the empty state', () => {
    const { rerender } = render(<RuleList {...base} rules={[rule(3, { category: 'weird' as never })]} />)
    expect(screen.getByText('weird')).toBeTruthy()
    rerender(<RuleList {...base} rules={[]} total={0} />)
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })

  it('confirms before deleting and refreshes afterwards', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok(204))
    render(<RuleList {...base} />)
    await user.click(screen.getByRole('button', { name: tr.delete }))
    expect(screen.getByText(tr.slr_delete_confirm)).toBeTruthy()
    await user.click(screen.getAllByRole('button', { name: tr.delete })[0])
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/social-link-rules/1')
  })

  it('cancelling the dialog and a failing delete', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(ok(500))
    render(<RuleList {...base} />)
    await user.click(screen.getByRole('button', { name: tr.delete }))
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(mockFetch).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: tr.delete }))
    await user.click(screen.getAllByRole('button', { name: tr.delete })[0])
    await waitFor(() => expect(alert).toHaveBeenCalledWith(tr.error_generic))
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: tr.delete }))
    await user.click(screen.getAllByRole('button', { name: tr.delete })[0])
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(2))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('pagination keeps q and category', () => {
    render(<RuleList {...base} total={120} page={2} q="bet" category="gambling" />)
    expect(screen.getByText(tr.next).getAttribute('href')).toBe('/admin/social-link-rules?q=bet&category=gambling&page=3')
    expect(screen.getByText(tr.prev).getAttribute('href')).toBe('/admin/social-link-rules?q=bet&category=gambling&page=1')
  })
})

// ─── Category attribute definitions (admin API contract) ────────────────────────
// The backend exposes writes ONLY under /category-attribute-definitions[/{id}]
// (ingestor/api/admin/category_attribute_defs.py); there is no PATCH/POST/DELETE
// below /categories/{id}/attribute-definitions. These tests pin the real contract.

describe('AttrDefEditForm', () => {
  const def: SysAdminCategoryAttributeDef = {
    id: 40, category_id: 12, attribute_key: 'size', attribute_type: 'select', allowed_values: ['S', 'M'], unit: null,
    is_filterable: true, display_order: 1, override_mode: 'inherit', labels: { en: 'Size' }, created_at: 'c', updated_at: 'u',
  }

  it('PATCHes the definition via the category-attribute-definitions endpoint and returns to the list', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    render(<AttrDefEditForm def={def} categoryId="12" tr={tr} />)
    const label = screen.getByDisplayValue('Size')
    await user.clear(label)
    await user.type(label, 'Dimension')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/category-attribute-definitions/12'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/category-attribute-definitions/40')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({ attribute_key: 'size', labels: { en: 'Dimension' }, allowed_values: ['S', 'M'] })
  })

  it('toasts errors and cancel returns to the category list', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(ok(500))
    render(<AttrDefEditForm def={def} categoryId="12" tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_generic, 'error'))
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_backend, 'error'))
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(push).toHaveBeenCalledWith('/admin/category-attribute-definitions/12')
  })
})

describe('NewCategoryAttrDefPage', () => {
  it('POSTs to /category-attribute-definitions with the category id in the body and a valid override_mode', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok(201))
    render(<NewCategoryAttrDefPage />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'color')
    await user.type(inputs[1], 'Color')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/category-attribute-definitions/12'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/category-attribute-definitions')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body).toMatchObject({ category_id: 12, attribute_key: 'color', labels: { en: 'Color' } })
    // backend allows inherit | override | extend only
    expect(['inherit', 'override', 'extend']).toContain(body.override_mode)
  })

  it('toasts on failure and cancel navigates back', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(ok(422))
    render(<NewCategoryAttrDefPage />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'k')
    await user.type(inputs[1], 'K')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_generic, 'error'))
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.error_backend, 'error'))
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(push).toHaveBeenCalledWith('/admin/category-attribute-definitions/12')
  })
})
