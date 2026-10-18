// F5970: detail panels -- shop vs. application, contact change hint (AR13), owner, decision, audit trail
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ClaimDetailPanels } from '@/components/system-admin/claims/ClaimDetailPanels'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { detail, disputeDetail } from './system-admin-claims-fixtures'

vi.mock('next/link', () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }))

const tr = tSysAdmin('en')
const show = (c = detail()) => render(<ClaimDetailPanels claim={c} tr={tr} locale="en-GB" />)

describe('ClaimDetailPanels', () => {
  it('shows the public shop data next to the application', () => {
    show()
    const shop = screen.getByTestId('panel-shop')
    expect(within(shop).getByRole('link', { name: 'Cafe Omega' }).getAttribute('href')).toBe('/admin/shops/10/edit')
    expect(shop).toHaveTextContent('Main St 1, Limassol')
    expect(shop).toHaveTextContent('info@beispiel.cy')
    expect(screen.getByTestId('panel-applicant')).toHaveTextContent('ioannis@beispiel.cy')
    expect(screen.queryByTestId('contact-changed')).toBeNull()
  })

  it('highlights a contact value that changed since the application, with the value from back then (AR13)', () => {
    show(detail({ shop: { ...detail().shop, email: 'changed@evil.example' }, contact_changed_since_request: ['email'] }))
    expect(screen.getByTestId('changed-email')).toHaveTextContent('At application: info@beispiel.cy')
    expect(screen.getByTestId('contact-changed')).toHaveTextContent('E-mail')
  })

  it('shows the origin of the contact data (source / source_url)', () => {
    show(detail({ shop: { ...detail().shop, source: 'google', source_url: 'https://maps.example/x' } }))
    expect(screen.getByTestId('panel-shop')).toHaveTextContent('google · https://maps.example/x')
  })

  it('dispute: the current owner with offers and listings', () => {
    show(disputeDetail())
    const owner = screen.getByTestId('panel-owner')
    expect(owner).toHaveTextContent('old@owner.cy')
    expect(owner).toHaveTextContent('12 active offers in 14 listings')
    expect(within(owner).getByRole('link', { name: 'old@owner.cy' }).getAttribute('href')).toBe('/admin/shop-owners/7/edit')
  })

  it('no owner: says so', () => {
    show()
    expect(screen.getByTestId('panel-owner')).toHaveTextContent(tr.claims_owner_none)
  })

  it('lists competing applications', () => {
    show(detail({ other_open_requests: [{ id: 9, applicant_email: 'rival@x.cy', status: 'open' }] }))
    expect(within(screen.getByTestId('panel-others')).getByRole('link', { name: '#9' }).getAttribute('href')).toBe('/admin/claims/9')
  })

  it('domain proof shows the match result and never a code', () => {
    show(detail({ email_domain_match: false, code: { purpose: 'shop_email', expires_at: '2026-10-18T12:00:00Z', failed_attempts: 2 } }))
    expect(screen.getByTestId('panel-proof')).toHaveTextContent(tr.claims_proof_domain_match)
    expect(screen.getByTestId('panel-proof')).toHaveTextContent('2 failed attempts')
  })

  it('decision panel: reason and consequences', () => {
    show(disputeDetail({
      status: 'accepted',
      decision: { by_admin_id: 3, at: '2026-10-18T10:00:00Z', reason: 'documents ok', notify_previous_owner: true, offers_flagged_count: 12, withdrawn_consent_id: 4, cancelled_case_ids: [8, 9], previous_owner_id: 7 },
    }))
    const d = screen.getByTestId('panel-decision')
    expect(d).toHaveTextContent('documents ok')
    expect(d).toHaveTextContent('Offers hidden: 12')
    expect(d).toHaveTextContent('Previous owner: #7')
    expect(d).toHaveTextContent('Consent withdrawn: #4')
    expect(d).toHaveTextContent('#8, #9')
  })

  it('no decision panel while undecided', () => {
    show()
    expect(screen.queryByTestId('panel-decision')).toBeNull()
  })

  it('audit trail shows every event with transition and actor (AC 39)', () => {
    show(detail({ events: [
      { at: '2026-10-18T10:00:00Z', type: 'created', from_status: null, to_status: 'open', actor_type: 'applicant', actor_id: 5, payload: {} },
      { at: '2026-10-18T10:05:00Z', type: 'status_changed', from_status: 'open', to_status: 'verified', actor_type: 'system', actor_id: null, payload: {} },
    ] }))
    const items = within(screen.getByTestId('claim-timeline')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[1]).toHaveTextContent('open → verified')
    expect(items[0]).toHaveTextContent('applicant #5')
  })
})
