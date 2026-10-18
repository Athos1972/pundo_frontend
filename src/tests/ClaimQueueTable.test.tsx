// F5970 AC 36: queue with filters' data, badges "Dispute" and "{n} applications for this shop", links
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ClaimQueueTable } from '@/components/system-admin/claims/ClaimQueueTable'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { listItem } from './system-admin-claims-fixtures'

vi.mock('next/link', () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }))

describe.each(['en', 'el'] as const)('ClaimQueueTable (%s)', (lang) => {
  const tr = tSysAdmin(lang)

  it('empty state', () => {
    render(<ClaimQueueTable items={[]} tr={tr} />)
    expect(screen.getByText(tr.claims_empty)).toBeInTheDocument()
  })

  it('links every row to its detail page and shows the applicant e-mail', () => {
    render(<ClaimQueueTable items={[listItem({ id: 42 })]} tr={tr} />)
    const row = screen.getByTestId('claim-row')
    expect(within(row).getByRole('link', { name: '#42' }).getAttribute('href')).toBe('/admin/claims/42')
    expect(within(row).getByText('ioannis@beispiel.cy')).toBeInTheDocument()
  })

  it('marks disputes and shows how many applications compete for the shop', () => {
    render(<ClaimQueueTable items={[listItem({ id: 1, kind: 'dispute', proof_method: 'document', open_requests_for_shop: 3 }), listItem({ id: 2 })]} tr={tr} />)
    const [first, second] = screen.getAllByTestId('claim-row')
    expect(within(first).getByTestId('claim-dispute-badge')).toHaveTextContent(tr.claims_badge_dispute)
    expect(within(first).getByTestId('claim-n-requests')).toHaveTextContent(tr.claims_badge_n_requests.replace('{n}', '3'))
    expect(within(second).queryByTestId('claim-dispute-badge')).toBeNull()
    expect(within(second).queryByTestId('claim-n-requests')).toBeNull()
  })

  it.each([
    [{ status: 'open' as const, sub_state: 'awaiting_callback' as const, proof_method: 'phone_callback' }, 'claims_badge_callback_pending'],
    [{ status: 'verified' as const, sub_state: 'awaiting_review' as const }, 'claims_badge_proof_received'],
    [{ status: 'open' as const, sub_state: 'awaiting_code' as const, proof_method: 'shop_email_code' }, 'claims_badge_awaiting_code'],
    [{ status: 'open' as const, sub_state: 'awaiting_email_verification' as const }, 'claims_badge_awaiting_email'],
  ])('state badge for %j', (over, key) => {
    render(<ClaimQueueTable items={[listItem(over)]} tr={tr} />)
    expect(screen.getByTestId('claim-row')).toHaveTextContent(tr[key as 'claims_badge_awaiting_code'])
  })

  it('an admin assignment is labelled as such', () => {
    render(<ClaimQueueTable items={[listItem({ source: 'admin_assign', status: 'accepted', sub_state: 'decided', proof_method: null, applicant: null })]} tr={tr} />)
    expect(screen.getByTestId('claim-row')).toHaveTextContent(tr.claims_source_admin_assign)
    expect(screen.getByTestId('claim-row')).toHaveTextContent('—')
  })
})
