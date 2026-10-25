// Backend answers of /admin/crm/* for the Vitest suites (F7600 CRM-Backbone, org cut).
// Source: typed by the frontend types of src/types/system-admin.ts, which src/types/contracts.ts ties to the generated backend
// schema (src/types/generated/backend.ts, copy of the backend docs/openapi.json): a renamed or removed backend field breaks the
// compile in contracts.ts, a typo in a fixture breaks it here. FastAPI always serialises fields with a default, hence every
// field is filled. Recording real answers from the slot backend (8513) is the e2e tester's job; when they exist, replace these
// literals by the recorded files (same names).
import type * as T from '@/types/system-admin'

export const NOW = '2026-10-25T10:00:00Z'

export const orgChannel: T.CrmChannelOut = {
  id: 11, kind: 'email', value_normalized: 'info@alpha-bakery.cy', reachable: 'unknown', consent_state: 'none',
  is_preferred: true, legal_tier: 'green', origin: 'shop', owner_review_pending: false,
  owner: { type: 'org', id: 41 }, created_at: NOW,
}
export const relationChannel: T.CrmChannelOut = {
  id: 12, kind: 'email', value_normalized: 'maria@alpha-bakery.cy', reachable: 'unknown', consent_state: 'none',
  is_preferred: false, legal_tier: 'green', origin: 'card', owner_review_pending: false,
  owner: { type: 'relation', id: 5 }, created_at: NOW,
}
export const personChannel: T.CrmChannelOut = {
  id: 13, kind: 'phone_call', value_normalized: '+35799123456', reachable: 'unknown', consent_state: 'none',
  is_preferred: false, legal_tier: 'green', origin: 'manual', owner_review_pending: true,
  owner: { type: 'person', id: 17 }, created_at: NOW,
}

export const relation: T.CrmRelationOut = {
  id: 5, person: { id: 17, display_name: 'Maria Georgiou', optout: false },
  org: { id: 41, name: 'Alpha Bakery', city: 'Nicosia' },
  valid_from: '2026-01-01', valid_to: null, active: true, roles: ['owner'], role_missing: false,
  note: 'Region West', source: 'business_card', address: null, uses_org_address: true,
  preferred_channel_id: 12, channels: [relationChannel], person_channels: [personChannel],
}

/** A relation without role (card without job title): the role set is empty, `role_missing` is true. */
export const relationWithoutRole: T.CrmRelationOut = { ...relation, id: 6, roles: [], role_missing: true, note: null }

export const person: T.CrmPerson = {
  id: 17, display_name: 'Maria Georgiou', first_name: 'Maria', last_name: 'Georgiou', name_derived: true,
  salutation: 'ms', birth_date: '2000-03-14', birth_year_unknown: true, optout: false, address: null,
  channels: [personChannel], relations: [relation], created_at: NOW, updated_at: NOW,
}

export const orgDetail: T.CrmOrgDetail = {
  id: 41, name: 'Alpha Bakery', legal_name: 'Alpha Bakery Ltd', city: 'Nicosia', region: null, category: 'bakery',
  business_status: 'unknown', shop_id: null, address: null,
  lead: {
    state: 'SOURCED', owner_id: null, effective_legal_tier: 'green', effective_legal_basis: 'legitimate_interest',
    primary_source: 'business_card', needs_human: false, agent_paused: false, version: 3, updated_at: NOW,
  },
  parent: { id: 40, name: 'Alpha Group' }, children: { count: 0, items: [] },
  channels: [orgChannel], relations: [relation, relationWithoutRole],
  sources: [{ id: 1, source: 'business_card', source_ref: null, legal_tier: 'green', legal_basis: 'legitimate_interest', observed_at: NOW, has_card_image: { front: true, back: false } }],
  interactions: [], messages: [], open_review_count: 1, reachable: true, created_at: NOW, updated_at: NOW,
}

/** An organisation that is no lead (plain master data): `lead.state` is null. */
export const orgDetailNoLead: T.CrmOrgDetail = { ...orgDetail, id: 42, name: 'Beta Hardware', parent: null, lead: { ...orgDetail.lead, state: null, primary_source: null }, relations: [], sources: [] }

export const orgListItem: T.CrmOrgListItem = {
  id: 41, name: 'Alpha Bakery', city: 'Nicosia', lead_state: 'SOURCED', contact_count: 2,
  primary_email: 'info@alpha-bakery.cy', parent: { id: 40, name: 'Alpha Group' }, lead_version: 3, updated_at: NOW,
}

export const orgSearchHit: T.CrmOrgSearchHit = {
  id: 41, name: 'Alpha Bakery', legal_name: 'Alpha Bakery Ltd', city: 'Nicosia', category: 'bakery',
  business_status: 'unknown', has_parent: true, child_count: 0,
}

export const recipients: T.CrmOutreachRecipient[] = [
  { channel_id: 11, kind: 'email', value: 'info@alpha-bakery.cy', owner_type: 'org', person: null, relation_id: null, roles: [], effective_tier: 'green', approval_required: false, approval_open: false, is_default: true },
  { channel_id: 12, kind: 'email', value: 'maria@alpha-bakery.cy', owner_type: 'relation', person: { id: 17, display_name: 'Maria Georgiou' }, relation_id: 5, roles: ['owner'], effective_tier: 'red', approval_required: true, approval_open: false, is_default: false },
]

export const reviewItem: T.CrmReviewItemOut = {
  id: 9, kind: 'channel_owner_unclear', status: 'open', org: { id: 41, name: 'Alpha Bakery' }, person: null,
  relation_id: null, channel: orgChannel, payload: null, created_at: NOW,
}
/** Computed entry (relations without role): no id, so it cannot be resolved. */
export const reviewItemComputed: T.CrmReviewItemOut = {
  id: null, kind: 'relation_without_role', status: 'open', org: { id: 41, name: 'Alpha Bakery' },
  person: { id: 17, display_name: 'Maria Georgiou' }, relation_id: 6, channel: null, payload: null, created_at: NOW,
}

export const config: T.CrmConfigOut = {
  outbound_kill_switch: false, send_caps: { email: { limit: 50, sent_24h: 3 } }, owner_optout_rule: true,
  require_human_approval_for_tier: ['red'], updated_at: null, updated_by: null,
}

export function page<T>(items: T[]) {
  return { items, total: items.length, limit: 50, offset: 0 }
}

/** Error bodies exactly as the backend sends them: `{"detail": code}` or `{"detail": {"detail": code, …extras}}`. */
export const errorBody = (code: string, extras?: Record<string, unknown>) => ({ detail: extras ? { detail: code, ...extras } : code })
