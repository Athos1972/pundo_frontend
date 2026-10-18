// F5970: status page -- token handover (URL -> sessionStorage -> URL cleaned), sub states, code entry, withdraw
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClaimStatusView } from '@/components/shop-admin/claim/ClaimStatusView'
import { ClaimApiError } from '@/lib/shop-admin-claim-client'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'
import type { ClaimStatusResponse } from '@/types/shop-admin'

const replace = vi.fn()
let search = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  useSearchParams: () => search,
}))
vi.mock('@/lib/shop-admin-claim-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/shop-admin-claim-client')>()),
  getClaimStatus: vi.fn(),
  sendClaimCode: vi.fn(),
  verifyClaimCode: vi.fn(),
  withdrawClaim: vi.fn(),
}))
import * as client from '@/lib/shop-admin-claim-client'

const tr = tShopAdminClaim('en')
const get = vi.mocked(client.getClaimStatus)

const status = (over: Partial<ClaimStatusResponse> = {}): ClaimStatusResponse => ({
  id: 7, shop: { slug: 'cafe-omega', name: 'Cafe Omega' }, kind: 'claim', status: 'open', rejection_reason: null,
  proof_method: 'email_domain', sub_state: 'awaiting_email_verification', code: null, documents: [],
  created_at: '2026-10-18T10:00:00Z', decided_at: null, login_url: null, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  search = new URLSearchParams()
})

describe('token handover', () => {
  it('moves the token from the URL to sessionStorage, cleans the URL and uses it as header value', async () => {
    search = new URLSearchParams({ id: '7', t: 'MAIL-TOKEN' })
    get.mockResolvedValue(status())
    render(<ClaimStatusView lang="en" claimId={7} />)
    await waitFor(() => expect(screen.getByTestId('claim-status')).toBeInTheDocument())
    expect(sessionStorage.getItem('claim:7')).toBe('MAIL-TOKEN')
    expect(replace).toHaveBeenCalledWith('/shop-admin/claim/status?id=7')
    expect(replace.mock.calls[0][0]).not.toContain('MAIL-TOKEN')
    expect(get).toHaveBeenCalledWith(7, 'MAIL-TOKEN')
  })

  it('uses the stored token when the URL has none (reload / link without token)', async () => {
    sessionStorage.setItem('claim:7', 'STORED')
    get.mockResolvedValue(status())
    render(<ClaimStatusView lang="en" claimId={7} />)
    await waitFor(() => expect(get).toHaveBeenCalledWith(7, 'STORED'))
    expect(replace).not.toHaveBeenCalled()
  })

  it('without any token: asks for the e-mail link and calls nothing', async () => {
    render(<ClaimStatusView lang="en" claimId={7} />)
    await waitFor(() => expect(screen.getByText(tr.claim_token_missing_title)).toBeInTheDocument())
    expect(get).not.toHaveBeenCalled()
  })

  it('without an id: same message', () => {
    render(<ClaimStatusView lang="en" claimId={null} />)
    expect(screen.getByText(tr.claim_token_missing_title)).toBeInTheDocument()
  })

  it('an unknown / expired token shows the not-found message and forgets the token', async () => {
    sessionStorage.setItem('claim:7', 'OLD')
    get.mockRejectedValue(new ClaimApiError(404, 'claim_not_found'))
    render(<ClaimStatusView lang="en" claimId={7} />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(tr.claim_err_not_found))
    expect(sessionStorage.getItem('claim:7')).toBeNull()
  })

  it('shows the existing-application notice', async () => {
    search = new URLSearchParams({ id: '7', existing: '1' })
    sessionStorage.setItem('claim:7', 'T')
    get.mockResolvedValue(status())
    render(<ClaimStatusView lang="en" claimId={7} />)
    await waitFor(() => expect(screen.getByText(tr.claim_existing_notice)).toBeInTheDocument())
  })
})

async function renderWith(s: ClaimStatusResponse, lang: 'en' | 'ar' = 'en') {
  sessionStorage.setItem('claim:7', 'T')
  get.mockResolvedValue(s)
  render(<ClaimStatusView lang={lang} claimId={7} />)
  await waitFor(() => expect(screen.getByTestId('claim-sub-state')).toBeInTheDocument())
}

describe('sub states', () => {
  it.each([
    ['awaiting_email_verification', {}, tr.claim_sub_awaiting_email_verification],
    ['awaiting_callback', { proof_method: 'phone_callback' as const }, tr.claim_sub_awaiting_callback],
    ['awaiting_review', { status: 'verified' as const }, tr.claim_sub_awaiting_review],
    ['awaiting_review', { kind: 'dispute' as const, proof_method: 'document' as const }, tr.claim_sub_awaiting_review_dispute],
  ])('%s', async (sub_state, over, text) => {
    await renderWith(status({ sub_state: sub_state as ClaimStatusResponse['sub_state'], ...over }))
    expect(screen.getByTestId('claim-sub-state')).toHaveTextContent(text)
  })

  it('accepted: login link', async () => {
    await renderWith(status({ status: 'accepted', sub_state: 'decided', login_url: '/shop-admin/login' }))
    expect(screen.getByTestId('claim-status-chip')).toHaveTextContent(tr.claim_status_label_accepted)
    expect(screen.getByRole('link', { name: tr.claim_login }).getAttribute('href')).toBe('/shop-admin/login')
    expect(screen.queryByTestId('claim-withdraw')).toBeNull()
  })

  it.each(['superseded', 'expired', 'withdrawn', 'not_reachable', 'insufficient_proof', 'other'] as const)('rejected (%s): its own reason text and a new-application link', async (reason) => {
    await renderWith(status({ status: 'rejected', sub_state: 'decided', rejection_reason: reason }))
    expect(screen.getByTestId('claim-sub-state')).toHaveTextContent(tr[`claim_rejected_${reason}` as 'claim_rejected_other'])
    expect(screen.getByRole('link', { name: tr.claim_new_application }).getAttribute('href')).toBe('/shop-admin/claim?shop=cafe-omega')
  })

  it('lists documents by name and size only (no download link, AC 37)', async () => {
    await renderWith(status({ documents: [{ filename: 'schein.pdf', size_bytes: 20480, deleted: false }, { filename: 'old.pdf', size_bytes: 10, deleted: true }] }))
    expect(screen.getByText('schein.pdf')).toBeInTheDocument()
    expect(screen.getByText('20 KB')).toBeInTheDocument()
    expect(screen.getByText(tr.claim_document_deleted)).toBeInTheDocument()
    expect(screen.queryAllByRole('link', { name: /schein/ })).toHaveLength(0)
  })

  it('is right-to-left in ar', async () => {
    await renderWith(status(), 'ar')
    expect(screen.getByTestId('claim-status').getAttribute('dir')).toBe('rtl')
  })
})

describe('code entry on the page', () => {
  const codeState = { purpose: 'shop_email' as const, expires_at: new Date(Date.now() + 20 * 60_000).toISOString(), attempts_left: 5, resends_left_24h: 2, next_resend_at: null }

  it('send code -> status with the active code replaces the view', async () => {
    await renderWith(status({ proof_method: 'shop_email_code', sub_state: 'awaiting_code', code: { ...codeState, expires_at: null, resends_left_24h: 3 } }))
    vi.mocked(client.sendClaimCode).mockResolvedValue(status({ proof_method: 'shop_email_code', sub_state: 'awaiting_code', code: codeState }))
    fireEvent.click(screen.getByRole('button', { name: tr.claim_code_send }))
    await waitFor(() => expect(screen.getByLabelText(tr.claim_code_label)).toBeInTheDocument())
    expect(client.sendClaimCode).toHaveBeenCalledWith(7, 'T')
  })

  it('correct code -> verified', async () => {
    await renderWith(status({ proof_method: 'shop_email_code', sub_state: 'awaiting_code', code: codeState }))
    vi.mocked(client.verifyClaimCode).mockResolvedValue(status({ status: 'verified', sub_state: 'awaiting_review', proof_method: 'shop_email_code' }))
    fireEvent.change(screen.getByLabelText(tr.claim_code_label), { target: { value: '424242' } })
    fireEvent.click(screen.getByRole('button', { name: tr.claim_code_verify }))
    await waitFor(() => expect(screen.getByTestId('claim-status-chip')).toHaveTextContent(tr.claim_status_label_verified))
    expect(client.verifyClaimCode).toHaveBeenCalledWith(7, 'T', '424242')
  })

  it('wrong code: translated error with the attempts left, and the status is reloaded', async () => {
    await renderWith(status({ proof_method: 'shop_email_code', sub_state: 'awaiting_code', code: codeState }))
    vi.mocked(client.verifyClaimCode).mockRejectedValue(new ClaimApiError(422, 'claim_code_invalid', { attempts_left: 4 }))
    get.mockResolvedValue(status({ proof_method: 'shop_email_code', sub_state: 'awaiting_code', code: { ...codeState, attempts_left: 4 } }))
    fireEvent.change(screen.getByLabelText(tr.claim_code_label), { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: tr.claim_code_verify }))
    await waitFor(() => expect(screen.getByText('The code is wrong. 4 attempts left.')).toBeInTheDocument())
    expect(get.mock.calls.length).toBeGreaterThan(1)
  })

  it('callback code entry has no send button', async () => {
    await renderWith(status({ proof_method: 'phone_callback', sub_state: 'callback_done_enter_code', code: { ...codeState, purpose: 'callback' } }))
    expect(screen.getByLabelText(tr.claim_code_label)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: tr.claim_code_send })).toBeNull()
  })
})

describe('withdraw', () => {
  it('asks to confirm, then withdraws', async () => {
    await renderWith(status())
    vi.mocked(client.withdrawClaim).mockResolvedValue(status({ status: 'rejected', sub_state: 'decided', rejection_reason: 'withdrawn' }))
    fireEvent.click(screen.getByTestId('claim-withdraw'))
    expect(client.withdrawClaim).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('claim-withdraw-yes'))
    await waitFor(() => expect(screen.getByTestId('claim-sub-state')).toHaveTextContent(tr.claim_rejected_withdrawn))
    expect(client.withdrawClaim).toHaveBeenCalledWith(7, 'T')
  })

  it('cancel keeps the application', async () => {
    await renderWith(status())
    fireEvent.click(screen.getByTestId('claim-withdraw'))
    fireEvent.click(screen.getByRole('button', { name: tr.claim_cancel }))
    expect(screen.getByTestId('claim-withdraw')).toBeInTheDocument()
    expect(client.withdrawClaim).not.toHaveBeenCalled()
  })
})
