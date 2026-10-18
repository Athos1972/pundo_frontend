// F5970: verify-email page shows the claim hint instead of "waiting for approval" when the backend reports a claim
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/lib/lang', async (orig) => ({ ...(await orig<typeof import('@/lib/lang')>()), getLangServer: vi.fn(async () => 'en') }))

import VerifyEmailPage from '@/app/(shop-admin)/shop-admin/verify-email/page'

const fetchMock = vi.fn()
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock) })
const reply = (status: number, body: unknown) => fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
const render_ = async (token?: string) => render(await VerifyEmailPage({ searchParams: Promise.resolve({ token }) }))

const tr = tAdmin('en')
const claimTr = tShopAdminClaim('en')

describe('verify-email page', () => {
  it('claim application, proof complete: claim hint, no pending-approval link', async () => {
    reply(200, { status: 'pending', claim_request_status: 'verified' })
    await render_('abc')
    expect(screen.getByTestId('verify-email-claim-hint')).toHaveTextContent(claimTr.claim_verify_email_verified)
    expect(screen.queryByRole('link', { name: tr.pending_title })).toBeNull()
  })

  it('claim application, still open: the other claim hint', async () => {
    reply(200, { status: 'pending', claim_request_status: 'open' })
    await render_('abc')
    expect(screen.getByTestId('verify-email-claim-hint')).toHaveTextContent(claimTr.claim_verify_email_open)
  })

  it('regular registration: unchanged -- success text and the pending-approval link', async () => {
    reply(200, { status: 'pending' })
    await render_('abc')
    expect(screen.getByText(tr.verify_success)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: tr.pending_title }).getAttribute('href')).toBe('/shop-admin/pending-approval')
    expect(screen.queryByTestId('verify-email-claim-hint')).toBeNull()
  })

  it('invalid token and missing token: error text', async () => {
    reply(400, { detail: 'Invalid or expired token' })
    await render_('bad')
    expect(screen.getByText(tr.verify_error)).toBeInTheDocument()
  })

  it('an unreadable success body does not break the page', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }))
    await render_('abc')
    expect(screen.getByText(tr.verify_success)).toBeInTheDocument()
  })
})
