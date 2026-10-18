// F5970: system-admin pages -- claim queue, claim detail, dashboard tile, owner block in the shop editor, owner list
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { detail, disputeDetail, listItem } from './system-admin-claims-fixtures'

const refresh = vi.fn()
class NotFoundError extends Error { constructor() { super('NEXT_NOT_FOUND') } }
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/admin/claims',
  notFound: () => { throw new NotFoundError() },
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => React.createElement('a', { href, ...r }, children),
}))
vi.mock('@/lib/lang', async (orig) => ({ ...(await orig<typeof import('@/lib/lang')>()), getLangServer: vi.fn(async () => 'en') }))
vi.mock('@/lib/system-admin-api')
vi.mock('@/components/system-admin/ShopForm', () => ({ ShopForm: () => React.createElement('div', { 'data-testid': 'ShopForm' }) }))
vi.mock('@/components/system-admin/ScrapeRunHistory', () => ({ ScrapeRunHistory: () => null }))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))

import * as api from '@/lib/system-admin-api'
import { getLangServer } from '@/lib/lang'
import { SysAdminNav } from '@/components/system-admin/AdminNav'
import { ShopOwnerEditForm } from '@/app/(system-admin)/admin/(portal)/shop-owners/[id]/edit/ShopOwnerEditForm'

const tr = tSysAdmin('en')
const trEl = tSysAdmin('el')
const A = '@/app/(system-admin)/admin/(portal)'
const asMock = (f: unknown) => f as import('vitest').Mock

type Page = (props: never) => Promise<React.ReactElement>
const show = async (Page: unknown, props: unknown = {}) => render(await (Page as Page)(props as never))
const sp = (o: Record<string, string> = {}) => ({ searchParams: Promise.resolve(o) })
const par = (o: Record<string, string>) => ({ params: Promise.resolve(o) })
const paged = <T,>(items: T[]) => ({ items, total: items.length, limit: 100, offset: 0 })
const SUMMARY = { open: 3, verified: 2, disputes_open: 1, matching_pending: 4 }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getLangServer).mockResolvedValue('en')
  asMock(api.getClaimSummary).mockResolvedValue(SUMMARY)
})

describe('claims page', () => {
  it('default view: open + checked applications in one list, oldest first, with the summary line and matching counter', async () => {
    asMock(api.getClaimRequests).mockImplementation(async (p: { status: string }) =>
      paged(p.status === 'open' ? [listItem({ id: 2, created_at: '2026-10-18T10:00:00Z' })] : [listItem({ id: 1, status: 'verified', created_at: '2026-10-17T10:00:00Z' })]))
    const { default: Page } = await import(`${A}/claims/page`)
    await show(Page, sp())
    expect(asMock(api.getClaimRequests).mock.calls.map((c) => c[0].status).sort()).toEqual(['open', 'verified'])
    expect(screen.getAllByTestId('claim-row').map((r) => within(r).getAllByRole('link')[0].textContent)).toEqual(['#1', '#2'])
    expect(screen.getByTestId('claims-summary')).toHaveTextContent('Open: 3 · Checked: 2 · Disputes: 1')
    expect(screen.getByTestId('tab-matching')).toHaveTextContent(`${tr.claims_tab_matching} (4)`)
  })

  it('sort "proof received first" puts verified applications on top', async () => {
    asMock(api.getClaimRequests).mockImplementation(async (p: { status: string }) =>
      paged(p.status === 'open' ? [listItem({ id: 1, created_at: '2026-10-10T10:00:00Z' })] : [listItem({ id: 2, status: 'verified', created_at: '2026-10-17T10:00:00Z' })]))
    const { default: Page } = await import(`${A}/claims/page`)
    await show(Page, sp({ sort: 'proof' }))
    expect(screen.getAllByTestId('claim-row').map((r) => within(r).getAllByRole('link')[0].textContent)).toEqual(['#2', '#1'])
  })

  it('an explicit status filter makes one paged call and passes kind and sort on', async () => {
    asMock(api.getClaimRequests).mockResolvedValue({ items: [listItem({ id: 8, status: 'accepted', sub_state: 'decided' })], total: 120, limit: 50, offset: 50 })
    const { default: Page } = await import(`${A}/claims/page`)
    await show(Page, sp({ status: 'accepted', kind: 'dispute', page: '2' }))
    expect(asMock(api.getClaimRequests)).toHaveBeenCalledTimes(1)
    expect(asMock(api.getClaimRequests).mock.calls[0][0]).toMatchObject({ status: 'accepted', kind: 'dispute', limit: 50, offset: 50 })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('"all statuses" sends no status filter', async () => {
    asMock(api.getClaimRequests).mockResolvedValue(paged([]))
    const { default: Page } = await import(`${A}/claims/page`)
    await show(Page, sp({ status: 'all' }))
    expect(asMock(api.getClaimRequests).mock.calls[0][0].status).toBeUndefined()
  })

  it('matching tab loads the pending checks', async () => {
    asMock(api.getMatchingChecks).mockResolvedValue({ items: [{ id: 3, input_domain: 'x.cy', input_shop_name: null, input_city: null, match_method: 'domain', outcome: 'ambiguous', review_status: 'pending', created_at: '2026-10-17T10:00:00Z', candidates: [{ shop_id: 10, name: 'A', city: null, website_url: null, webshop_url: null }] }], total: 1 })
    const { default: Page } = await import(`${A}/claims/page`)
    await show(Page, sp({ tab: 'matching' }))
    expect(asMock(api.getMatchingChecks).mock.calls[0][0]).toMatchObject({ status: 'pending' })
    expect(screen.getByTestId('matching-checks')).toBeInTheDocument()
    expect(asMock(api.getClaimRequests)).not.toHaveBeenCalled()
  })

  it('a failing backend shows an error instead of crashing', async () => {
    asMock(api.getClaimRequests).mockRejectedValue(new Error('x'))
    asMock(api.getClaimSummary).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/claims/page`)
    await show(Page, sp())
    expect(screen.getByRole('alert')).toHaveTextContent(tr.claims_load_error)
    expect(screen.queryByTestId('claims-summary')).toBeNull()
  })

  it('is in Greek for el (AC 36)', async () => {
    vi.mocked(getLangServer).mockResolvedValue('el')
    asMock(api.getClaimRequests).mockResolvedValue(paged([]))
    const { default: Page } = await import(`${A}/claims/page`)
    await show(Page, sp())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(trEl.claims_title)
    expect(screen.getByText(trEl.claims_empty)).toBeInTheDocument()
  })
})

describe('claim detail page', () => {
  it('renders panels, documents, call-back and the decision buttons', async () => {
    asMock(api.getClaimRequest).mockResolvedValue(disputeDetail({ id: 12 }))
    const { default: Page } = await import(`${A}/claims/[id]/page`)
    await show(Page, par({ id: '12' }))
    expect(asMock(api.getClaimRequest)).toHaveBeenCalledWith('12')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Application #12')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(tr.claims_badge_dispute)
    for (const id of ['panel-shop', 'panel-applicant', 'panel-proof', 'panel-owner', 'panel-documents', 'panel-callback', 'panel-timeline', 'claim-actions']) {
      expect(screen.getByTestId(id)).toBeInTheDocument()
    }
    expect(screen.getByTestId('action-accept')).toHaveTextContent(tr.claims_action_accept_dispute)
  })

  it('unknown application -> 404', async () => {
    asMock(api.getClaimRequest).mockRejectedValue(new Error('API_ERROR:404'))
    const { default: Page } = await import(`${A}/claims/[id]/page`)
    await expect(show(Page, par({ id: '999' }))).rejects.toBeInstanceOf(NotFoundError)
  })

  it('a decided application has no decision buttons', async () => {
    asMock(api.getClaimRequest).mockResolvedValue(detail({ status: 'accepted' }))
    const { default: Page } = await import(`${A}/claims/[id]/page`)
    await show(Page, par({ id: '1' }))
    expect(screen.queryByTestId('claim-actions')).toBeNull()
  })
})

describe('dashboard tile', () => {
  it('shows the open-claims tile with the counters', async () => {
    const { default: Page } = await import(`${A}/dashboard/page`)
    await show(Page)
    const tile = screen.getByTestId('dashboard-claims-tile')
    expect(tile.getAttribute('href')).toBe('/admin/claims')
    expect(tile).toHaveTextContent('Open: 3 · Checked: 2 · Disputes: 1')
  })

  it('without counters the tile still links to the queue', async () => {
    asMock(api.getClaimSummary).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/dashboard/page`)
    await show(Page)
    expect(screen.getByTestId('dashboard-claims-tile')).not.toHaveTextContent('Open:')
  })
})

describe('shop editor: owner block', () => {
  const stubShop = { id: 10, slug: 'cafe', names: { en: 'Cafe' } }
  it('shows the block with the overview', async () => {
    asMock(api.getShop).mockResolvedValue(stubShop)
    asMock(api.getAllShopTypes).mockResolvedValue([])
    asMock(api.getShopScrapeRuns).mockResolvedValue([])
    asMock(api.getShopOwnerOverview).mockResolvedValue({ owner: { id: 7, email: 'o@x.cy', name: 'O', status: 'approved', since: '2026-01-01T00:00:00Z', offers_active: 1, listings: 1, is_system_account: false }, open_claims: [] })
    const { default: Page } = await import(`${A}/shops/[id]/edit/page`)
    await show(Page, par({ id: '10' }))
    expect(asMock(api.getShopOwnerOverview)).toHaveBeenCalledWith(10)
    expect(screen.getByTestId('shop-owner-current')).toHaveTextContent('o@x.cy')
  })

  it('a failing overview hides the block but keeps the editor', async () => {
    asMock(api.getShop).mockResolvedValue(stubShop)
    asMock(api.getAllShopTypes).mockResolvedValue([])
    asMock(api.getShopScrapeRuns).mockResolvedValue([])
    asMock(api.getShopOwnerOverview).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${A}/shops/[id]/edit/page`)
    await show(Page, par({ id: '10' }))
    expect(screen.getByTestId('ShopForm')).toBeInTheDocument()
    expect(screen.queryByTestId('shop-owner-section')).toBeNull()
  })
})

describe('shop owners list', () => {
  it('offers the suspended / inactive filters and shows the claim badge', async () => {
    asMock(api.getShopOwners).mockResolvedValue(paged([
      { id: 1, email: 'a@x.cy', name: 'A', status: 'pending', shop_id: null, open_claim_request_id: 9 },
      { id: 2, email: 'b@x.cy', name: 'B', status: 'suspended', shop_id: null, suspended_at: '2026-10-18T00:00:00Z' },
    ]))
    const { default: Page } = await import(`${A}/shop-owners/page`)
    await show(Page, sp({ status: 'suspended' }))
    expect(asMock(api.getShopOwners).mock.calls[0][0]).toMatchObject({ status: 'suspended' })
    expect(screen.getByRole('option', { name: tr.owner_status_suspended })).toBeInTheDocument()
    expect(screen.getByText('Claim #9')).toBeInTheDocument()
    expect(screen.getByText('suspended')).toHaveClass('bg-red-200')
  })
})

describe('ShopOwnerEditForm (F5970)', () => {
  const owner = (over = {}) => ({ id: 3, email: 'o@x.cy', name: 'O', status: 'approved' as const, shop_id: 10, ...over })
  const fetchMock = vi.fn()
  beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockImplementation(async () => new Response('{}', { status: 200 })) })

  it('suspend asks for confirmation, then PATCHes status suspended', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ShopOwnerEditForm owner={owner()} tr={tr} />)
    fireEvent.click(screen.getByTestId('owner-suspend'))
    expect(confirm).toHaveBeenCalledWith(tr.owner_confirm_suspend)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/shop-owners/3')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ status: 'suspended' })
    confirm.mockRestore()
  })

  it('declining the confirmation does nothing', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ShopOwnerEditForm owner={owner()} tr={tr} />)
    fireEvent.click(screen.getByTestId('owner-suspend'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a suspended owner shows since / reason and "Lift suspension" instead of "Approve"', () => {
    render(<ShopOwnerEditForm owner={owner({ status: 'suspended', suspended_at: '2026-10-18T10:00:00Z', suspended_reason: 'claim_reassigned' })} tr={tr} />)
    expect(screen.getByTestId('owner-suspended-info')).toHaveTextContent('Suspended since 2026-10-18 (shop reassigned by claim)')
    expect(screen.getByRole('button', { name: tr.owner_unsuspend })).toBeInTheDocument()
    expect(screen.queryByTestId('owner-suspend')).toBeNull()
  })

  it('an applicant with an open claim cannot be approved here, only via the claim', () => {
    render(<ShopOwnerEditForm owner={owner({ status: 'pending', shop_id: null, open_claim_request_id: 5 })} tr={tr} />)
    expect(screen.queryByRole('button', { name: tr.approve })).toBeNull()
    expect(screen.getByTestId('owner-open-claim').getAttribute('href')).toBe('/admin/claims/5')
  })

  it('maps the backend refusal owner_has_open_claim', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ detail: { code: 'owner_has_open_claim' } }), { status: 409 }))
    const { showToast } = await import('@/components/system-admin/Toast')
    render(<ShopOwnerEditForm owner={owner({ status: 'pending', shop_id: null })} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.approve }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.claims_err_open_claim, 'error'))
  })
})

describe('AdminNav', () => {
  it('has the Claims entry in en and el', () => {
    const { unmount } = render(<SysAdminNav tr={tr} adminEmail="a@x.io" />)
    expect(screen.getAllByRole('link', { name: new RegExp(tr.nav_claims) })[0].getAttribute('href')).toBe('/admin/claims')
    unmount()
    render(<SysAdminNav tr={trEl} adminEmail="a@x.io" />)
    expect(screen.getAllByRole('link', { name: new RegExp(trEl.nav_claims) })[0].getAttribute('href')).toBe('/admin/claims')
  })
})
