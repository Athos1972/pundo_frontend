// F5970 AC 9: callback code (shown once), protocol of the call
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClaimCallbackPanel } from '@/components/system-admin/claims/ClaimCallbackPanel'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { detail, disputeDetail } from './system-admin-claims-fixtures'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
const toast = vi.fn()
vi.mock('@/components/system-admin/Toast', () => ({ showToast: (...a: unknown[]) => toast(...a) }))
const fetchMock = vi.fn()
const tr = tSysAdmin('en')

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})
const ok = (body: unknown) => fetchMock.mockImplementation(async () => new Response(JSON.stringify(body), { status: 200 }))

describe('ClaimCallbackPanel', () => {
  it('tells the admin to call the PUBLIC number of the listing', () => {
    render(<ClaimCallbackPanel claim={detail({ proof_method: 'phone_callback' })} tr={tr} locale="en-GB" />)
    expect(screen.getByText(/PUBLIC phone number of the listing \(\+357 99 123 456\)/)).toBeInTheDocument()
  })

  it('issues the code and shows it once in a prominent box', async () => {
    ok({ code: '135790', expires_at: '2026-10-18T10:30:00Z' })
    render(<ClaimCallbackPanel claim={detail({ id: 5, proof_method: 'phone_callback' })} tr={tr} locale="en-GB" />)
    fireEvent.click(screen.getByTestId('callback-issue'))
    await waitFor(() => expect(screen.getByTestId('callback-code')).toHaveTextContent('135790'))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/claim-requests/5/callback-code')
    expect(screen.getByTestId('callback-code').getAttribute('dir')).toBe('ltr')
  })

  it('the code is not shown again after a re-render with fresh server data (it is only component state)', () => {
    const { rerender } = render(<ClaimCallbackPanel claim={detail({ proof_method: 'phone_callback' })} tr={tr} locale="en-GB" />)
    expect(screen.queryByTestId('callback-code-box')).toBeNull()
    rerender(<ClaimCallbackPanel claim={detail({ proof_method: 'phone_callback', callbacks: [] })} tr={tr} locale="en-GB" />)
    expect(screen.queryByTestId('callback-code-box')).toBeNull()
  })

  it('no code button for a domain proof (not applicable), but a dispute has one', () => {
    const { unmount } = render(<ClaimCallbackPanel claim={detail({ proof_method: 'email_domain' })} tr={tr} locale="en-GB" />)
    expect(screen.queryByTestId('callback-issue')).toBeNull()
    unmount()
    render(<ClaimCallbackPanel claim={disputeDetail({ status: 'open' })} tr={tr} locale="en-GB" />)
    expect(screen.getByTestId('callback-issue')).toBeInTheDocument()
  })

  it('records "reached" with a note, toasts and refreshes (AC 9)', async () => {
    ok({})
    render(<ClaimCallbackPanel claim={detail({ id: 5, proof_method: 'phone_callback' })} tr={tr} locale="en-GB" />)
    fireEvent.change(screen.getByTestId('callback-outcome'), { target: { value: 'reached' } })
    fireEvent.change(screen.getByLabelText(tr.claims_callback_note), { target: { value: 'spoke to the owner' } })
    fireEvent.click(screen.getByTestId('callback-save'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/claim-requests/5/callback')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ outcome: 'reached', note: 'spoke to the owner' })
    expect(toast).toHaveBeenCalledWith(tr.claims_callback_saved, 'success')
  })

  it('records "not reached" without a note', async () => {
    ok({})
    render(<ClaimCallbackPanel claim={detail({ proof_method: 'phone_callback' })} tr={tr} locale="en-GB" />)
    fireEvent.change(screen.getByTestId('callback-outcome'), { target: { value: 'not_reached' } })
    fireEvent.click(screen.getByTestId('callback-save'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ outcome: 'not_reached' })
  })

  it('lists the protocol of earlier calls', () => {
    render(<ClaimCallbackPanel claim={detail({ proof_method: 'phone_callback', callbacks: [{ at: '2026-10-18T09:00:00Z', outcome: 'not_reached', note: 'voicemail', admin_id: 2 }] })} tr={tr} locale="en-GB" />)
    const list = screen.getByTestId('claim-callbacks')
    expect(list).toHaveTextContent(tr.claims_callback_not_reached)
    expect(list).toHaveTextContent('voicemail')
    expect(list).toHaveTextContent('admin #2')
  })

  it('a decided application only shows the protocol (no forms)', () => {
    render(<ClaimCallbackPanel claim={detail({ status: 'accepted', proof_method: 'phone_callback' })} tr={tr} locale="en-GB" />)
    expect(screen.queryByTestId('callback-save')).toBeNull()
    expect(screen.queryByTestId('callback-issue')).toBeNull()
  })

  it('shows a refusal in the user language', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ detail: { code: 'claim_callback_not_applicable' } }), { status: 409 }))
    render(<ClaimCallbackPanel claim={detail({ proof_method: 'phone_callback' })} tr={tr} locale="en-GB" />)
    fireEvent.click(screen.getByTestId('callback-issue'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(tr.claims_err_callback_na))
  })
})
