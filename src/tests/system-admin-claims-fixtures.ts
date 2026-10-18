// F5970 test fixtures for the system-admin claim UI
import type { SysAdminClaimDetail, SysAdminClaimListItem } from '@/types/system-admin'

export const listItem = (over: Partial<SysAdminClaimListItem> = {}): SysAdminClaimListItem => ({
  id: 1, shop_id: 10, shop_name: 'Cafe Omega', shop_slug: 'cafe-omega', kind: 'claim', source: 'shop_page', status: 'open',
  rejection_reason: null, proof_method: 'email_domain', proof_verified_at: null, sub_state: 'awaiting_email_verification',
  applicant: { id: 5, name: 'Ioannis', email: 'ioannis@beispiel.cy', email_verified: true }, open_requests_for_shop: 1,
  current_owner_id: null, expires_at: null, created_at: '2026-10-18T10:00:00Z', ...over,
})

export const detail = (over: Partial<SysAdminClaimDetail> = {}): SysAdminClaimDetail => ({
  ...listItem(),
  applicant_message: null,
  applicant_lang: 'en',
  shop: {
    id: 10, slug: 'cafe-omega', name: 'Cafe Omega', address: 'Main St 1', city: 'Limassol', email: 'info@beispiel.cy',
    phone: '+357 99 123 456', website_url: 'https://beispiel.cy', webshop_url: null, source: 'google', source_url: null, status: 'active',
  },
  shop_contact_snapshot: { email: 'info@beispiel.cy', phone: '+357 99 123 456', website_url: 'https://beispiel.cy', webshop_url: null, source: 'google', source_url: null },
  contact_changed_since_request: [],
  email_domain_match: true,
  code: null,
  callbacks: [],
  documents: [],
  current_owner: null,
  other_open_requests: [],
  decision: null,
  documents_deleted_at: null,
  events: [],
  ...over,
})

export const disputeDetail = (over: Partial<SysAdminClaimDetail> = {}): SysAdminClaimDetail =>
  detail({
    kind: 'dispute', proof_method: 'document', status: 'verified', sub_state: 'awaiting_review',
    current_owner: { id: 7, email: 'old@owner.cy', name: 'Old Owner', status: 'approved', since: '2026-01-01T00:00:00Z', offers_active: 12, listings: 14, is_system_account: false },
    ...over,
  })
