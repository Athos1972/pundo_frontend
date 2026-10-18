// F5970 AC 4/6: only the methods that really apply are offered; the domain method follows the account e-mail
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClaimProofMethodPicker, emailMatchesDomain, selectableMethods } from '@/components/shop-admin/claim/ClaimProofMethodPicker'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'
import type { ClaimMethod } from '@/types/shop-admin'

const tr = tShopAdminClaim('en')
const ALL: ClaimMethod[] = [
  { method: 'email_domain', requires_domain: 'beispiel.cy' },
  { method: 'shop_email_code', masked_email: 'i***@beispiel.cy' },
  { method: 'phone_callback', masked_phone: '+357 ** *** 456' },
  { method: 'document' },
]

describe('emailMatchesDomain', () => {
  it.each([
    ['info@beispiel.cy', 'beispiel.cy', true],
    ['INFO@Beispiel.CY', 'beispiel.cy', true],
    ['  info@beispiel.cy  ', 'beispiel.cy', true],
    ['info@shop.beispiel.cy', 'beispiel.cy', false], // exact host only (AR10)
    ['info@beispiel.cy.evil.com', 'beispiel.cy', false],
    ['info@xbeispiel.cy', 'beispiel.cy', false],
    ['info@gmail.com', 'beispiel.cy', false],
    ['no-at-sign', 'beispiel.cy', false],
    ['@beispiel.cy', 'beispiel.cy', false],
    ['', 'beispiel.cy', false],
  ])('%s vs %s -> %s', (email, domain, expected) => {
    expect(emailMatchesDomain(email, domain)).toBe(expected)
  })
})

describe('ClaimProofMethodPicker', () => {
  it('offers every method for a matching account e-mail and shows the masked values only', () => {
    render(<ClaimProofMethodPicker tr={tr} methods={ALL} accountEmail="boss@beispiel.cy" selected={null} onSelect={vi.fn()} />)
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByText(/i\*\*\*@beispiel\.cy/)).toBeInTheDocument()
    expect(screen.getByText(/\+357 \*\* \*\*\* 456/)).toBeInTheDocument()
    expect(screen.getByText(/@beispiel\.cy\. Confirm it/)).toBeInTheDocument()
  })

  it('hides the domain method for a freemail / foreign address and shows the tip instead', () => {
    render(<ClaimProofMethodPicker tr={tr} methods={ALL} accountEmail="me@gmail.com" selected={null} onSelect={vi.fn()} />)
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.queryByText(tr.claim_method_email_domain)).toBeNull()
    expect(screen.getByText(/with an email address @beispiel\.cy/)).toBeInTheDocument()
  })

  it('reacts to a changed account e-mail (the domain method appears)', () => {
    const { rerender } = render(<ClaimProofMethodPicker tr={tr} methods={ALL} accountEmail="" selected={null} onSelect={vi.fn()} />)
    expect(screen.queryByText(tr.claim_method_email_domain)).toBeNull()
    rerender(<ClaimProofMethodPicker tr={tr} methods={ALL} accountEmail="x@beispiel.cy" selected={null} onSelect={vi.fn()} />)
    expect(screen.getByText(tr.claim_method_email_domain)).toBeInTheDocument()
  })

  it('shows only what the backend offered (a shop without phone has no call-back)', () => {
    render(<ClaimProofMethodPicker tr={tr} methods={[{ method: 'document' }]} accountEmail="a@b.cy" selected="document" onSelect={vi.fn()} />)
    expect(screen.getAllByRole('radio')).toHaveLength(1)
    expect(screen.queryByText(tr.claim_method_phone_callback)).toBeNull()
  })

  it('reports the selection and marks the chosen one', () => {
    const onSelect = vi.fn()
    render(<ClaimProofMethodPicker tr={tr} methods={ALL} accountEmail="a@beispiel.cy" selected="phone_callback" onSelect={onSelect} />)
    expect((screen.getByRole('radio', { name: new RegExp(tr.claim_method_phone_callback) }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(tr.claim_method_shop_email_code) }))
    expect(onSelect).toHaveBeenCalledWith('shop_email_code')
  })

  it('says so when nothing is selectable', () => {
    render(<ClaimProofMethodPicker tr={tr} methods={[{ method: 'email_domain', requires_domain: 'beispiel.cy' }]} accountEmail="x@gmail.com" selected={null} onSelect={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent(tr.claim_methods_none)
  })

  it('selectableMethods keeps the order of the backend', () => {
    expect(selectableMethods(ALL, 'a@beispiel.cy').map((m) => m.method)).toEqual(['email_domain', 'shop_email_code', 'phone_callback', 'document'])
    expect(selectableMethods(ALL, 'a@other.cy').map((m) => m.method)).toEqual(['shop_email_code', 'phone_callback', 'document'])
  })

  it.each(['ar', 'he'] as const)('renders in %s without English fallback strings', (lang) => {
    const t = tShopAdminClaim(lang)
    render(<ClaimProofMethodPicker tr={t} methods={ALL} accountEmail="a@beispiel.cy" selected={null} onSelect={vi.fn()} />)
    expect(screen.getByText(t.claim_method_document)).toBeInTheDocument()
    expect(screen.queryByText(tr.claim_method_document)).toBeNull()
  })
})
