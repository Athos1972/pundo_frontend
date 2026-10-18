// F5970 AC 16, 21, 28: decisions need a reason, accept only after "verified", dispute shows every consequence
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClaimDecisionDialog } from '@/components/system-admin/claims/ClaimDecisionDialog'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { detail, disputeDetail } from './system-admin-claims-fixtures'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))
const toast = vi.fn()
vi.mock('@/components/system-admin/Toast', () => ({ showToast: (...a: unknown[]) => toast(...a) }))
const fetchMock = vi.fn()

const tr = tSysAdmin('en')
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockImplementation(async () => new Response('{}', { status: 200 }))
})
const failWith = (status: number, detail: unknown) =>
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ detail }), { status }))

describe('available actions by status (AC 21)', () => {
  it('open: verify + reject, no accept', () => {
    render(<ClaimDecisionDialog claim={detail({ status: 'open' })} tr={tr} />)
    expect(screen.getByTestId('action-verify')).toBeInTheDocument()
    expect(screen.getByTestId('action-reject')).toBeInTheDocument()
    expect(screen.queryByTestId('action-accept')).toBeNull()
  })

  it('verified: accept + reject, no verify', () => {
    render(<ClaimDecisionDialog claim={detail({ status: 'verified' })} tr={tr} />)
    expect(screen.getByTestId('action-accept')).toHaveTextContent(tr.claims_action_accept)
    expect(screen.queryByTestId('action-verify')).toBeNull()
  })

  it('verified dispute: the button says "Accept and change owner"', () => {
    render(<ClaimDecisionDialog claim={disputeDetail()} tr={tr} />)
    expect(screen.getByTestId('action-accept')).toHaveTextContent(tr.claims_action_accept_dispute)
  })

  it.each(['accepted', 'rejected'] as const)('%s: nothing to do', (status) => {
    const { container } = render(<ClaimDecisionDialog claim={detail({ status })} tr={tr} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('reason is mandatory (AC 16)', () => {
  it('does not call the backend without a reason', () => {
    render(<ClaimDecisionDialog claim={detail({ status: 'open' })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-verify'))
    fireEvent.change(screen.getByTestId('decision-reason'), { target: { value: ' x ' } })
    fireEvent.click(screen.getByTestId('decision-confirm'))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(tr.claims_err_reason_required)
  })

  it('shows the backend refusal in the user language', async () => {
    failWith(422, { code: 'decision_reason_required' })
    render(<ClaimDecisionDialog claim={detail({ status: 'open' })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-verify'))
    fireEvent.change(screen.getByTestId('decision-reason'), { target: { value: 'checked ok' } })
    fireEvent.click(screen.getByTestId('decision-confirm'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(tr.claims_err_reason_required))
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe('verify', () => {
  it('posts the reason, toasts and refreshes', async () => {
    render(<ClaimDecisionDialog claim={detail({ status: 'open', id: 7 })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-verify'))
    fireEvent.change(screen.getByTestId('decision-reason'), { target: { value: 'documents and call ok' } })
    fireEvent.click(screen.getByTestId('decision-confirm'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/claim-requests/7/verify', expect.objectContaining({ method: 'POST', body: JSON.stringify({ reason: 'documents and call ok' }) }))
    expect(toast).toHaveBeenCalledWith(tr.claims_done_verify, 'success')
    expect(screen.queryByTestId('claim-decision-dialog')).toBeNull()
  })
})

describe('accept', () => {
  it('claim: only the assignment consequence, no owner swap', () => {
    render(<ClaimDecisionDialog claim={detail({ status: 'verified' })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-accept'))
    const cons = screen.getByTestId('accept-consequences')
    expect(cons).toHaveTextContent(tr.claims_cons_assign)
    expect(cons).not.toHaveTextContent('suspended')
    expect(screen.queryByTestId('notify-previous')).toBeNull()
  })

  it('dispute: lists suspend, hidden offers (with the count), consent and cases, and offers the notification switch (default on)', () => {
    render(<ClaimDecisionDialog claim={disputeDetail()} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-accept'))
    const cons = screen.getByTestId('accept-consequences')
    expect(cons).toHaveTextContent(tr.claims_cons_suspend)
    expect(cons).toHaveTextContent('active offers (12)')
    expect(cons).toHaveTextContent(tr.claims_cons_consent)
    expect((screen.getByTestId('notify-previous') as HTMLInputElement).checked).toBe(true)
  })

  it('posts reason + the notification choice', async () => {
    render(<ClaimDecisionDialog claim={disputeDetail({ id: 9 })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-accept'))
    fireEvent.click(screen.getByTestId('notify-previous'))
    fireEvent.change(screen.getByTestId('decision-reason'), { target: { value: 'owner proved identity' } })
    fireEvent.click(screen.getByTestId('decision-confirm'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ reason: 'owner proved identity', notify_previous_owner: false })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/claim-requests/9/accept')
  })

  it('dispute without a recorded "reached" call: warns (AR22), but does not forbid', () => {
    render(<ClaimDecisionDialog claim={disputeDetail({ callbacks: [] })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-accept'))
    expect(screen.getByTestId('warn-no-callback')).toBeInTheDocument()
    expect((screen.getByTestId('decision-confirm') as HTMLButtonElement).disabled).toBe(false)
  })

  it('no warning once a call was reached', () => {
    render(<ClaimDecisionDialog claim={disputeDetail({ callbacks: [{ at: '2026-10-18T10:00:00Z', outcome: 'reached', note: null, admin_id: 1 }] })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-accept'))
    expect(screen.queryByTestId('warn-no-callback')).toBeNull()
  })

  it('applicant with an unconfirmed e-mail: warned and the confirm button is disabled (AR3)', () => {
    render(<ClaimDecisionDialog claim={detail({ status: 'verified', applicant: { id: 5, name: 'x', email: 'x@y.cy', email_verified: false } })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-accept'))
    expect(screen.getByTestId('warn-email-unverified')).toBeInTheDocument()
    expect((screen.getByTestId('decision-confirm') as HTMLButtonElement).disabled).toBe(true)
  })

  it('maps shop_has_owner to a readable message', async () => {
    failWith(409, { code: 'shop_has_owner' })
    render(<ClaimDecisionDialog claim={detail({ status: 'verified' })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-accept'))
    fireEvent.change(screen.getByTestId('decision-reason'), { target: { value: 'email proof' } })
    fireEvent.click(screen.getByTestId('decision-confirm'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(tr.claims_err_shop_has_owner))
  })
})

describe('reject', () => {
  it('posts reason class, reason and the applicant notification', async () => {
    render(<ClaimDecisionDialog claim={detail({ status: 'open', id: 4 })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-reject'))
    fireEvent.change(screen.getByTestId('reject-code'), { target: { value: 'not_reachable' } })
    fireEvent.click(screen.getByTestId('notify-applicant'))
    fireEvent.change(screen.getByTestId('decision-reason'), { target: { value: 'nobody answered' } })
    fireEvent.click(screen.getByTestId('decision-confirm'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ reason_code: 'not_reachable', reason: 'nobody answered', notify_applicant: false })
    expect(toast).toHaveBeenCalledWith(tr.claims_done_reject, 'success')
  })

  it('cancel closes the dialog without a call', () => {
    render(<ClaimDecisionDialog claim={detail({ status: 'open' })} tr={tr} />)
    fireEvent.click(screen.getByTestId('action-reject'))
    fireEvent.click(screen.getByRole('button', { name: tr.claims_dialog_cancel }))
    expect(screen.queryByTestId('claim-decision-dialog')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('Greek', () => {
  it('renders the dispute consequences in el', () => {
    const el = tSysAdmin('el')
    render(<ClaimDecisionDialog claim={disputeDetail()} tr={el} />)
    fireEvent.click(screen.getByTestId('action-accept'))
    expect(screen.getByTestId('accept-consequences')).toHaveTextContent(el.claims_cons_suspend)
  })
})
