// F5970: server pages /shop-admin/claim and /shop-admin/claim/status
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/lang', async (orig) => ({ ...(await orig<typeof import('@/lib/lang')>()), getLangServer: vi.fn(async () => 'en') }))
vi.mock('@/lib/shop-admin-api')
vi.mock('@/components/shop-admin/claim/ClaimWizard', () => ({
  ClaimWizard: (p: { info: { mode: string }; from: string | null }) =>
    React.createElement('div', { 'data-testid': 'wizard', 'data-mode': p.info.mode, 'data-from': p.from ?? '' }),
}))
vi.mock('@/components/shop-admin/claim/ClaimStatusView', () => ({
  ClaimStatusView: (p: { claimId: number | null }) => React.createElement('div', { 'data-testid': 'status-view', 'data-id': String(p.claimId) }),
}))

import * as api from '@/lib/shop-admin-api'
import ClaimPage from '@/app/(shop-admin)/shop-admin/claim/page'
import ClaimStatusPage from '@/app/(shop-admin)/shop-admin/claim/status/page'

const tr = tShopAdminClaim('en')
const INFO = {
  shop: { slug: 'cafe', name: 'Cafe', address: null, city: null, website_host: null, logo_url: null },
  is_claimed: false, mode: 'claim', methods: [], document_upload_available: true,
  limits: { max_files: 3, max_file_bytes: 1, message_max_chars: 1000 }, viewer: null,
}

beforeEach(() => vi.clearAllMocks())

describe('claim page', () => {
  it('loads the shop info and renders the wizard with the origin flag', async () => {
    vi.mocked(api.getClaimShopInfo).mockResolvedValue(INFO as never)
    render(await ClaimPage({ searchParams: Promise.resolve({ shop: 'cafe', from: 'onboarding' }) }))
    expect(api.getClaimShopInfo).toHaveBeenCalledWith('cafe', 'en')
    expect(screen.getByTestId('wizard')).toHaveAttribute('data-from', 'onboarding')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(tr.claim_page_title)
    expect(screen.getByRole('link', { name: tr.claim_back_to_shop }).getAttribute('href')).toBe('/en/shops/cafe')
  })

  it('dispute mode gets the dispute title', async () => {
    vi.mocked(api.getClaimShopInfo).mockResolvedValue({ ...INFO, mode: 'dispute', is_claimed: true } as never)
    render(await ClaimPage({ searchParams: Promise.resolve({ shop: 'cafe' }) }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(tr.claim_page_title_dispute)
  })

  it.each([
    ['no shop parameter', {}],
    ['unknown / inactive shop (backend 404)', { shop: 'nope' }],
  ])('%s: neutral not-found card, no wizard', async (_n, sp) => {
    vi.mocked(api.getClaimShopInfo).mockRejectedValue(new Error('API_ERROR:404'))
    render(await ClaimPage({ searchParams: Promise.resolve(sp) }))
    expect(screen.getByTestId('claim-not-found')).toHaveTextContent(tr.claim_shop_not_found_text)
    expect(screen.queryByTestId('wizard')).toBeNull()
  })
})

describe('status page', () => {
  it.each([['7', 7], ['abc', null], ['7; DROP', null], [undefined, null]])('id %s -> claimId %s', async (id, expected) => {
    render(await ClaimStatusPage({ searchParams: Promise.resolve({ id }) }))
    expect(screen.getByTestId('status-view')).toHaveAttribute('data-id', String(expected))
  })

  it('never receives the access token on the server (it is read in the browser only)', async () => {
    const element = await ClaimStatusPage({ searchParams: Promise.resolve({ id: '7', t: 'SECRET' } as never) })
    expect(JSON.stringify(element, (_k, v) => (typeof v === 'function' ? undefined : v))).not.toContain('SECRET')
  })
})
