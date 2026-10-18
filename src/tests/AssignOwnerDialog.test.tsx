// F5970 AC 29-33: manual assignment -- owner search, 409 follow-ups (replace / deactivate duplicate), matching check link
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { AssignOwnerDialog } from '@/components/system-admin/AssignOwnerDialog'
import { MatchingChecksTable } from '@/components/system-admin/claims/MatchingChecksTable'
import { ShopOwnerSection } from '@/components/system-admin/ShopOwnerSection'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type { SysAdminMatchingCheck, SysAdminShopOwnerOverview } from '@/types/system-admin'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))
vi.mock('next/link', () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }))
const toast = vi.fn()
vi.mock('@/components/system-admin/Toast', () => ({ showToast: (...a: unknown[]) => toast(...a) }))
const fetchMock = vi.fn()
const tr = tSysAdmin('en')

const OWNERS = { items: [{ id: 21, email: 'new@owner.cy', name: 'New Owner', status: 'pending', shop_id: null }], total: 1, limit: 10, offset: 0 }
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

/** Routes the dialog's calls: search -> OWNERS, assign -> the given responses in order. */
function route(...assignResponses: Response[]) {
  const queue = [...assignResponses]
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).startsWith('/api/admin/shop-owners')) return json(200, OWNERS)
    return queue.shift() ?? json(200, {})
  })
}
const assignCalls = () => fetchMock.mock.calls.filter((c) => String(c[0]).includes('assign-owner'))

async function pickOwner() {
  fireEvent.change(screen.getByLabelText(tr.assign_search), { target: { value: 'new@' } })
  fireEvent.click(screen.getByRole('button', { name: tr.assign_search_btn }))
  await waitFor(() => expect(screen.getByTestId('assign-owner-results')).toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: tr.assign_pick }))
}
function fillReasonAndSubmit(reason = 'owner proved identity by phone') {
  fireEvent.change(screen.getByLabelText(tr.assign_reason), { target: { value: reason } })
  fireEvent.click(screen.getByTestId('assign-owner-submit'))
}
const OK = { claim_request_id: 5, shop_id: 10, shop_owner_id: 21, previous_owner_id: null, offers_flagged_count: 0, deactivated_shop_id: null }
const SHOP = [{ id: 10, name: 'Cafe Omega' }]

describe('AssignOwnerDialog', () => {
  it('searches accounts through the admin proxy', async () => {
    route()
    render(<AssignOwnerDialog tr={tr} shops={SHOP} onClose={vi.fn()} onDone={vi.fn()} />)
    await pickOwner()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/shop-owners?q=new%40&limit=10')
    expect(screen.getByTestId('assign-owner-selected')).toHaveTextContent('new@owner.cy')
  })

  it('submit stays disabled until an account is chosen; a reason is required', async () => {
    route()
    render(<AssignOwnerDialog tr={tr} shops={SHOP} onClose={vi.fn()} onDone={vi.fn()} />)
    expect((screen.getByTestId('assign-owner-submit') as HTMLButtonElement).disabled).toBe(true)
    await pickOwner()
    fireEvent.click(screen.getByTestId('assign-owner-submit'))
    expect(screen.getByRole('alert')).toHaveTextContent(tr.claims_err_reason_required)
    expect(assignCalls()).toHaveLength(0)
  })

  it('first attempt without the dangerous options; success toasts and reports', async () => {
    route(json(200, { ...OK, offers_flagged_count: 3 }))
    const onDone = vi.fn()
    render(<AssignOwnerDialog tr={tr} shops={SHOP} onClose={vi.fn()} onDone={onDone} />)
    await pickOwner()
    fillReasonAndSubmit()
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(assignCalls()[0][0]).toBe('/api/admin/shops/10/assign-owner')
    expect(JSON.parse(assignCalls()[0][1].body)).toEqual({
      shop_owner_id: 21, reason: 'owner proved identity by phone', approve_owner: true, replace_existing_owner: false,
      deactivate_previous_shop_of_owner: false, notify_previous_owner: true,
    })
    expect(toast).toHaveBeenCalledWith('Owner assigned. Offers hidden: 3.', 'success')
  })

  it('409 shop_has_owner: offers "Replace the current owner" with the consequences; then sends the option', async () => {
    route(json(409, { detail: { code: 'shop_has_owner' } }), json(200, { ...OK, previous_owner_id: 7 }))
    const onDone = vi.fn()
    render(<AssignOwnerDialog tr={tr} shops={SHOP} onClose={vi.fn()} onDone={onDone} />)
    await pickOwner()
    fillReasonAndSubmit()
    await waitFor(() => expect(screen.getByTestId('assign-need-replace')).toBeInTheDocument())
    expect(screen.getByTestId('assign-need-replace')).toHaveTextContent(tr.assign_replace_text)
    expect(screen.getByRole('alert')).toHaveTextContent(tr.claims_err_shop_has_owner)
    fireEvent.click(screen.getByTestId('assign-replace'))
    fireEvent.click(screen.getByTestId('assign-owner-submit'))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(JSON.parse(assignCalls()[1][1].body)).toMatchObject({ replace_existing_owner: true, notify_previous_owner: true })
  })

  it('409 owner_has_other_shop: names the shop and offers to deactivate the duplicate', async () => {
    route(json(409, { detail: { code: 'owner_has_other_shop', shop_id: 99, shop_name: 'Wizard Duplicate' } }), json(200, { ...OK, deactivated_shop_id: 99 }))
    const onDone = vi.fn()
    render(<AssignOwnerDialog tr={tr} shops={SHOP} onClose={vi.fn()} onDone={onDone} />)
    await pickOwner()
    fillReasonAndSubmit()
    await waitFor(() => expect(screen.getByTestId('assign-need-other')).toHaveTextContent('Wizard Duplicate'))
    expect(screen.getByRole('alert')).toHaveTextContent('Wizard Duplicate')
    fireEvent.click(screen.getByTestId('assign-deactivate'))
    fireEvent.click(screen.getByTestId('assign-owner-submit'))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(JSON.parse(assignCalls()[1][1].body)).toMatchObject({ deactivate_previous_shop_of_owner: true, replace_existing_owner: false })
  })

  it('422 owner_not_assignable: readable message, dialog stays open', async () => {
    route(json(422, { detail: { code: 'owner_not_assignable' } }))
    const onDone = vi.fn()
    render(<AssignOwnerDialog tr={tr} shops={SHOP} onClose={vi.fn()} onDone={onDone} />)
    await pickOwner()
    fillReasonAndSubmit()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(tr.claims_err_owner_not_assignable))
    expect(onDone).not.toHaveBeenCalled()
  })

  it('picking another account resets the options', async () => {
    route(json(409, { detail: { code: 'shop_has_owner' } }))
    render(<AssignOwnerDialog tr={tr} shops={SHOP} onClose={vi.fn()} onDone={vi.fn()} />)
    await pickOwner()
    fillReasonAndSubmit()
    await waitFor(() => screen.getByTestId('assign-need-replace'))
    fireEvent.click(screen.getByRole('button', { name: tr.assign_pick }))
    expect(screen.queryByTestId('assign-need-replace')).toBeNull()
  })

  it('several candidate shops (matching tab): a shop selector, the link to the check is sent', async () => {
    route(json(200, OK))
    render(<AssignOwnerDialog tr={tr} shops={[{ id: 10, name: 'A' }, { id: 11, name: 'B' }]} checkId={77} onClose={vi.fn()} onDone={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(tr.assign_shop_label), { target: { value: '11' } })
    await pickOwner()
    fillReasonAndSubmit()
    await waitFor(() => expect(assignCalls()).toHaveLength(1))
    expect(assignCalls()[0][0]).toBe('/api/admin/shops/11/assign-owner')
    expect(JSON.parse(assignCalls()[0][1].body).shop_claim_check_id).toBe(77)
  })
})

describe('MatchingChecksTable', () => {
  const check = (over: Partial<SysAdminMatchingCheck> = {}): SysAdminMatchingCheck => ({
    id: 3, input_domain: 'beispiel.cy', input_shop_name: 'Cafe Omega', input_city: 'Limassol', match_method: 'domain', outcome: 'ambiguous',
    review_status: 'pending', created_at: '2026-10-17T10:00:00Z',
    candidates: [
      { shop_id: 10, name: 'Cafe Omega', city: 'Limassol', website_url: 'https://beispiel.cy', webshop_url: null },
      { shop_id: 11, name: 'Cafe Omega 2', city: 'Limassol', website_url: null, webshop_url: 'https://beispiel.cy/shop' },
    ], ...over,
  })

  it('shows candidates side by side', () => {
    render(<MatchingChecksTable checks={[check()]} tr={tr} />)
    const row = screen.getByTestId('matching-check')
    expect(within(row).getByRole('link', { name: '#10 Cafe Omega' }).getAttribute('href')).toBe('/admin/shops/10/edit')
    expect(within(row).getByRole('link', { name: '#11 Cafe Omega 2' })).toBeInTheDocument()
  })

  it('empty state', () => {
    render(<MatchingChecksTable checks={[]} tr={tr} />)
    expect(screen.getByText(tr.matching_empty)).toBeInTheDocument()
  })

  it('"Assign owner" opens the dialog with the candidates and the check id', async () => {
    route(json(200, OK))
    render(<MatchingChecksTable checks={[check()]} tr={tr} />)
    fireEvent.click(screen.getByTestId('matching-assign'))
    expect(screen.getByLabelText(tr.assign_shop_label)).toBeInTheDocument()
    await pickOwner()
    fillReasonAndSubmit()
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(JSON.parse(assignCalls()[0][1].body).shop_claim_check_id).toBe(3)
  })

  it('"Resolve without assignment" needs a reason (AC 33), then PATCHes dismissed', async () => {
    fetchMock.mockImplementation(async () => json(200, {}))
    render(<MatchingChecksTable checks={[check()]} tr={tr} />)
    fireEvent.click(screen.getByTestId('matching-dismiss'))
    fireEvent.click(screen.getByTestId('dismiss-confirm'))
    expect(screen.getByRole('alert')).toHaveTextContent(tr.claims_err_reason_required)
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.change(screen.getByTestId('dismiss-reason'), { target: { value: 'same shop as #10' } })
    fireEvent.click(screen.getByTestId('dismiss-confirm'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/shop-claim-checks/3')
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ review_status: 'dismissed', reason: 'same shop as #10' })
  })
})

describe('ShopOwnerSection', () => {
  const overview = (over: Partial<SysAdminShopOwnerOverview> = {}): SysAdminShopOwnerOverview => ({
    owner: { id: 7, email: 'old@owner.cy', name: 'Old Owner', status: 'suspended', since: '2026-01-01T00:00:00Z', offers_active: 4, listings: 6, is_system_account: false },
    open_claims: [], ...over,
  })

  it('shows the owner with status and counts, and the active applications', () => {
    render(<ShopOwnerSection tr={tr} shop={{ id: 10, name: 'Cafe' }} overview={overview({ open_claims: [{ id: 3, shop_id: 10, shop_name: 'Cafe', shop_slug: 'c', kind: 'dispute', source: 'shop_page', status: 'open', rejection_reason: null, proof_method: 'document', proof_verified_at: null, sub_state: 'awaiting_review', applicant: { id: 1, name: 'A', email: 'a@x.cy', email_verified: true }, open_requests_for_shop: 1, current_owner_id: 7, expires_at: null, created_at: '2026-10-18T00:00:00Z' }] })} />)
    const current = screen.getByTestId('shop-owner-current')
    expect(current).toHaveTextContent('old@owner.cy')
    expect(current).toHaveTextContent('suspended')
    expect(current).toHaveTextContent('4 active offers in 6 listings')
    expect(screen.getByRole('link', { name: '#3' }).getAttribute('href')).toBe('/admin/claims/3')
  })

  it('no owner: says so; the assign button opens the dialog and a success refreshes the page', async () => {
    route(json(200, OK))
    render(<ShopOwnerSection tr={tr} shop={{ id: 10, name: 'Cafe' }} overview={overview({ owner: null })} />)
    expect(screen.getByText(tr.owner_section_none)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('open-assign-owner'))
    await pickOwner()
    fillReasonAndSubmit()
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(screen.queryByTestId('assign-owner-dialog')).toBeNull()
  })
})
