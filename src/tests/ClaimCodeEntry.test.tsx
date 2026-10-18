// F5970 AC 8: remaining attempts, locked state, countdown, resend budget
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ClaimCodeEntry, formatRemaining } from '@/components/shop-admin/claim/ClaimCodeEntry'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'
import type { ClaimStatusCode } from '@/types/shop-admin'

const tr = tShopAdminClaim('en')
const NOW = new Date('2026-10-18T12:00:00Z').getTime()

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterEach(() => vi.useRealTimers())

const code = (over: Partial<ClaimStatusCode> = {}): ClaimStatusCode => ({
  purpose: 'shop_email', expires_at: new Date(NOW + 20 * 60_000).toISOString(), attempts_left: 5,
  resends_left_24h: 3, next_resend_at: null, ...over,
})

function setup(c: ClaimStatusCode | null, purpose: 'shop_email' | 'callback' = 'shop_email', error: string | null = null) {
  const onSend = vi.fn()
  const onVerify = vi.fn()
  render(<ClaimCodeEntry tr={tr} code={c} purpose={purpose} busy={false} error={error} onSend={onSend} onVerify={onVerify} />)
  return { onSend, onVerify }
}

describe('formatRemaining', () => {
  it.each([[0, '00:00'], [1000, '00:01'], [59_000, '00:59'], [61_000, '01:01'], [20 * 60_000, '20:00'], [3_600_000, '1:00'], [5 * 3_600_000 + 7 * 60_000, '5:07'], [-5, '00:00']])(
    '%i ms -> %s', (ms, text) => expect(formatRemaining(ms)).toBe(text),
  )
})

describe('ClaimCodeEntry', () => {
  it('before the first code: only the send button, 3 codes left', () => {
    const { onSend } = setup(null)
    expect(screen.queryByLabelText(tr.claim_code_label)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: tr.claim_code_send }))
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(screen.getByText('3 codes left today')).toBeInTheDocument()
  })

  it('with an active code: input, attempts and a live countdown', () => {
    setup(code({ attempts_left: 4 }))
    expect(screen.getByText('4 attempts left')).toBeInTheDocument()
    expect(screen.getByTestId('claim-code-countdown')).toHaveTextContent('20:00')
    act(() => { vi.advanceTimersByTime(65_000) })
    expect(screen.getByTestId('claim-code-countdown')).toHaveTextContent('18:55')
  })

  it('accepts digits only, max 6, and submits exactly 6', () => {
    const { onVerify } = setup(code())
    const input = screen.getByLabelText(tr.claim_code_label) as HTMLInputElement
    fireEvent.change(input, { target: { value: '12ab34567' } })
    expect(input.value).toBe('123456')
    expect(input.getAttribute('inputmode')).toBe('numeric')
    expect(input.getAttribute('dir')).toBe('ltr')
    fireEvent.click(screen.getByRole('button', { name: tr.claim_code_verify }))
    expect(onVerify).toHaveBeenCalledWith('123456')
  })

  it('does not submit an incomplete code', () => {
    const { onVerify } = setup(code())
    fireEvent.change(screen.getByLabelText(tr.claim_code_label), { target: { value: '123' } })
    expect((screen.getByRole('button', { name: tr.claim_code_verify }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.submit(screen.getByLabelText(tr.claim_code_label).closest('form')!)
    expect(onVerify).not.toHaveBeenCalled()
  })

  it('locked after 5 wrong attempts: no input, message, resend offered', () => {
    const { onSend } = setup(code({ attempts_left: 0 }))
    expect(screen.queryByLabelText(tr.claim_code_label)).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent(tr.claim_code_locked)
    fireEvent.click(screen.getByRole('button', { name: tr.claim_code_resend }))
    expect(onSend).toHaveBeenCalled()
  })

  it('expired code: hint and a resend button instead of the input', () => {
    setup(code({ expires_at: new Date(NOW - 1000).toISOString() }))
    expect(screen.queryByLabelText(tr.claim_code_label)).toBeNull()
    expect(screen.getByText(tr.claim_code_expired_hint)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: tr.claim_code_resend })).toBeInTheDocument()
  })

  it('no resend left: explains and counts down to the next slot', () => {
    setup(code({ expires_at: null, resends_left_24h: 0, next_resend_at: new Date(NOW + 3 * 3_600_000 + 5 * 60_000).toISOString() }))
    expect(screen.queryByRole('button', { name: tr.claim_code_resend })).toBeNull()
    expect(screen.getByText(tr.claim_code_none_left)).toBeInTheDocument()
    expect(screen.getByText(/Next code possible in 3:05/)).toBeInTheDocument()
  })

  it('callback code: no send button, hint about the phone call', () => {
    setup(code({ purpose: 'callback' }), 'callback')
    expect(screen.queryByRole('button', { name: tr.claim_code_send })).toBeNull()
    expect(screen.queryByRole('button', { name: tr.claim_code_resend })).toBeNull()
    expect(screen.getByText(tr.claim_code_callback_hint)).toBeInTheDocument()
    expect(screen.getByLabelText(tr.claim_code_label)).toBeInTheDocument()
  })

  it('shows a server error', () => {
    setup(code(), 'shop_email', 'The code is wrong. 4 attempts left.')
    expect(screen.getByText('The code is wrong. 4 attempts left.')).toBeInTheDocument()
  })
})
