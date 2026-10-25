// ─── System-Admin — TypeScript Interfaces ─────────────────────────────────────
// IMPORTANT: Keep this file separate from src/types/api.ts (Clean Boundary rule).
// These types must NEVER be imported from customer-facing or shop-admin code.

export interface SysAdminUser {
  id: number
  email: string
  role: 'superadmin' | 'editor'
  permissions: string[] | null  // null = grandfathering (all perms); [] = no extra perms
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// Opening Hours — list format: [{day: 0, ...}, ..., {day: 6, ...}], day 0=Mon..6=Sun
export interface DayHours {
  day: number
  open: string
  close: string
  closed: boolean
  second_open?: string
  second_close?: string
}

// ─── Helper ────────────────────────────────────────────────────────────────────
/** Extract a display name from a multilingual names dict (en → de → first → fallback). */
export function pickName(
  names: Record<string, string> | null | undefined,
  fallback = '—',
): string {
  if (!names) return fallback
  return names['en'] ?? names['de'] ?? Object.values(names)[0] ?? fallback
}

// ─── Shops ─────────────────────────────────────────────────────────────────────
export interface SysAdminShop {
  id: number
  slug: string
  status: string
  names: Record<string, string>
  descriptions?: Record<string, string> | null
  address_line1: string | null
  address_line2?: string | null
  city: string | null
  postal_code?: string | null
  country_code: string
  lat: number | null
  lng: number | null
  phone: string | null
  phone_alt?: string | null
  whatsapp_number: string | null
  email?: string | null
  website_url: string | null
  webshop_url?: string | null
  social_links?: Record<string, string> | null
  opening_hours: DayHours[] | null
  delivery_services?: unknown[] | null
  has_parking?: boolean | null
  has_own_delivery?: boolean | null
  is_online_only: boolean
  sells_live_animals?: boolean | null
  images?: unknown[] | null
  spoken_languages?: string[] | null
  shop_type_id: number | null
  source?: string | null
  created_at: string
  updated_at: string
}

// ─── Scrape runs ──────────────────────────────────────────────────────────────
export interface SysAdminScrapeRun {
  id: string
  shop_id: number | null
  target_url: string
  run_type: string
  runner_kind: string
  trigger: string
  status: string
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  config_ref: string | null
  source_revision: string | null
  parameters: Record<string, unknown>
  metrics: Record<string, unknown>
  result: Record<string, unknown>
  error_code: string | null
  error_message: string | null
  is_reconstructed: boolean
  reconstruction_source: string | null
}

export interface SysAdminScrapeRunDetail extends SysAdminScrapeRun {
  events: Array<{
    id: number
    occurred_at: string
    event_type: string
    level: string
    payload: Record<string, unknown>
  }>
}

// ─── Shop Types ────────────────────────────────────────────────────────────────
export interface SysAdminShopType {
  id: number
  canonical: string
  translations: Record<string, string>
  /** Populated by backend: translations["en"] or first available or canonical */
  name: string | null
  created_at: string
}

// ─── Shop Owners ───────────────────────────────────────────────────────────────
export interface SysAdminShopOwner {
  id: number
  email: string
  name: string
  status: 'pre_signup' | 'pending' | 'approved' | 'rejected' | 'inactive' | 'suspended'
  shop_id: number | null
  /** F5970 */
  suspended_at?: string | null
  suspended_reason?: 'claim_reassigned' | 'admin_manual' | null
  open_claim_request_id?: number | null
}

// ─── Items (was: Products) ─────────────────────────────────────────────────────
export interface SysAdminItem {
  id: number
  slug: string
  item_type: string
  status: string
  names: Record<string, string>
  descriptions?: Record<string, string> | null
  brand_id: number | null
  category_id: number | null
  ean?: string | null
}

/** @deprecated Use SysAdminItem instead */
export type SysAdminProduct = SysAdminItem

export interface SysAdminItemAttribute {
  id: number
  item_id: number
  attribute_key: string
  attribute_value: unknown
  source: string | null
  confidence: number | null
  created_at: string
  updated_at: string
}

/** @deprecated Use SysAdminItemAttribute instead */
export type SysAdminProductAttribute = SysAdminItemAttribute

// ─── Categories ────────────────────────────────────────────────────────────────
export interface SysAdminCategory {
  id: number
  parent_id: number | null
  taxonomy_type: string
  external_id: string
  level: string | null
  path: string | null
  /** Populated by backend: EN translation or first available */
  name: string | null
}

export interface SysAdminCategoryAttributeDef {
  id: number
  category_id: number
  attribute_key: string
  attribute_type: string
  allowed_values: unknown | null
  unit: string | null
  is_filterable: boolean
  display_order: number
  override_mode: string
  labels: Record<string, string>
  value_labels?: Record<string, string> | null
  created_at: string
  updated_at: string
}

export interface SysAdminCategoryTranslation {
  id: number
  category_id: number
  lang: string
  name: string
  rtl: boolean
}

// ─── Brands ────────────────────────────────────────────────────────────────────
export interface SysAdminBrand {
  id: number
  slug: string
  names: Record<string, string>
  descriptions?: Record<string, string> | null
  country_code: string | null
  homepages?: Record<string, string> | null
  logos?: Array<{ url?: string; [key: string]: unknown }> | null
  social_links?: Record<string, string> | null
  created_at: string
  updated_at: string
}

// ─── Offers (GET /admin/offers — AdminOfferResponse) ─────────────────────────
export interface SysAdminOffer {
  id: number
  shop_listing_id: number
  product_id: number             // = item_id
  shop_id: number
  item_name: string | null
  title: string | null
  description: string | null
  offer_url: string | null
  source: string
  archived: boolean
  created_at: string | null
  price: string | null
  price_type: string
  price_note: string | null      // legacy, same column as description
  currency: string
  stock_status: string
  is_available: boolean
  sku: string | null             // SKU of the listing (shop-wide unique)
  url: string | null
  image_url: string | null
  crawled_at: string | null
}

// ─── Shop-owner offers (GET /admin/shop-owner-offers — AdminShopOwnerOfferResponse) ──
// Editable via PATCH: title, description, price, currency, archived (AdminShopOwnerOfferUpdate).
export interface SysAdminShopOwnerOffer {
  id: number
  shop_id: number
  shop_listing_id: number
  sku: string | null
  title: string
  description: string | null
  price: string | null
  currency: string
  // valid_from/valid_until are in the backend schema but always null (UnifiedOffer has no such
  // columns) — deliberately not typed here. offer_url does not exist in this schema.
  product_id: number | null
  archived: boolean
  created_at: string
  updated_at: string
}

// ─── Social-Link Rules ────────────────────────────────────────────────────────

export type SocialLinkRuleCategory =
  | 'adult' | 'gambling' | 'hate' | 'illegal' | 'malware' | 'custom'

export type SocialLinkRuleSource = 'external' | 'admin'

export interface SysAdminSocialLinkRule {
  id: number
  host: string
  category: SocialLinkRuleCategory
  source: SocialLinkRuleSource
  note: string | null
  external_batch_id: string | null
  created_at: string
}

export interface SysAdminSocialLinkRuleCreate {
  host: string
  category: SocialLinkRuleCategory
  note?: string | null
}

// ─── Item-Domain-Mappings ──────────────────────────────────────────────────────
export interface SysAdminItemDomainMapping {
  id: number
  item_id: number
  item_name: string | null        // computed by backend: names[lang] fallback
  /** Backend returns `domain_id` (integer). Slug fields not yet in backend response (Bug 5). */
  domain_id: number | null
  /** Alias kept for backward-compat until backend adds slug fields. */
  onboarding_domain_id?: number | null
  onboarding_domain_slug?: string | null
  specialty_id: number | null
  specialty_slug?: string | null
  auto_assign: boolean
  created_at: string
}

export interface SysAdminItemDomainMappingCreate {
  item_id: number
  /** Backend field name is `domain_id` (not `onboarding_domain_id`). */
  domain_id?: number | null
  specialty_id?: number | null
  auto_assign: boolean
}

/** Normalised gap-report entry. Backend returns `{uncovered_domains, uncovered_specialties}` — see getMappingGaps(). */
export interface MappingGapEntry {
  /** domain or specialty slug if available */
  slug: string | null
  domain_id: number | null
  specialty_id: number | null
  /** @deprecated use domain_id / slug */
  onboarding_domain_id?: number | null
  onboarding_domain_slug?: string | null
  specialty_slug?: string | null
  /** 0 = gap (no auto-assign items cover this domain/specialty) */
  auto_assign_item_count: number
  /** 'domain' | 'specialty' */
  kind: 'domain' | 'specialty'
}

// ─── API Keys ─────────────────────────────────────────────────────────────────
export interface SysAdminApiKey {
  id: number
  key_prefix: string
  name: string
  key_type: string
  owner_id: number | null
  scopes: string[]
  is_active: boolean
  expires_at: string | null
  created_at: string
  created_by: string | null
  last_used_at: string | null
}

// ─── CRM (F7600) ───────────────────────────────────────────────────────────────
// Model since the org cut (Variante E): the lead block sits on the organisation, a channel has exactly one owner
// (organisation, relation or person), people belong to organisations through relations with a set of roles.
// Backend contract: docs/openapi.json (generated/backend.ts); `src/types/contracts.ts` compares the responses.

/** Lead status of an organisation. `null` (no lead) is a valid state: the organisation is just master data. */
export type CrmLeadState =
  | 'SOURCED' | 'ENRICHED' | 'NEEDS_REVIEW' | 'QUEUED' | 'CONTACTED'
  | 'ENGAGED' | 'INTERESTED' | 'REGISTERED' | 'UNREACHABLE'
  | 'HARD_OPTOUT' | 'REJECTED_PRIVATE' | 'DEAD'

export type CrmChannelKindIn = 'email' | 'phone' | 'whatsapp'   // Request side (create/add)
export type CrmOutreachLang = 'el' | 'en' | 'ru'
export type CrmLegalBasis = 'legitimate_interest' | 'consent' | 'contract' | 'none'
export type CrmLegalTier = 'green' | 'amber' | 'red'
export type CrmSuppressReason = 'hard_optout' | 'rejected_private'
export type CrmSource = 'business_card' | 'manual' | 'referral' | 'event'
export type CrmChannelOwnerType = 'org' | 'relation' | 'person'
export type CrmSalutation = 'mr' | 'ms' | 'mx' | 'dr' | 'none'

// — Shared building blocks —
export interface CrmAddress { id: number; address_line1: string | null; address_line2: string | null; city: string | null; state: string | null; postal_code: string | null; country_code: string; lat: number | null; lon: number | null }
/** Address in a request (find-or-create on the backend by canonical key). */
export type CrmAddressIn = Partial<Omit<CrmAddress, 'id'>>
export interface CrmOrgRef { id: number; name: string }
export interface CrmChannelOwner { type: CrmChannelOwnerType; id: number }

export type CrmChannelKindOut = 'email' | 'phone_call' | 'sms' | 'whatsapp' | 'telegram' | 'push'
export interface CrmChannelOut {
  id: number; kind: CrmChannelKindOut; value_normalized: string; reachable: string
  consent_state: string; is_preferred: boolean; legal_tier: CrmLegalTier
  /** shop|card|manual|migration|migration_identifier|google_places|facebook_places|… */
  origin: string | null
  /** "Check channel assignment" marker (unclear owner after the cut or the card classification). */
  owner_review_pending: boolean
  owner: CrmChannelOwner
  created_at: string
}

// — Organisations —
export interface CrmOrgListItem {
  id: number; name: string; city: string | null; lead_state: CrmLeadState | null
  /** Number of active relations (contact persons). */
  contact_count: number
  primary_email: string | null; parent: CrmOrgRef | null; lead_version: number; updated_at: string
}
/** One hit of `GET /admin/crm/orgs/search`. Company fields only, no channels. */
export interface CrmOrgSearchHit {
  id: number; name: string; legal_name: string | null; city: string | null; category: string | null
  business_status: string; has_parent: boolean; child_count: number
}
export interface CrmSourceOut {
  id: number; source: string; source_ref: string | null
  legal_tier: string; legal_basis: string; observed_at: string
  /** Card images are served by `GET /admin/crm/orgs/{org_id}/sources/{id}/card-image/{front|back}`. */
  has_card_image: { front: boolean; back: boolean }
}
export interface CrmInteractionOut {
  id: number; actor_type: string; actor_id: string | null; kind: string; channel: string
  direction: string; state_from: string | null; state_to: string | null
  outcome: string | null; payload: Record<string, unknown> | null
  person_id: number | null; relation_id: number | null; created_at: string
}
export interface CrmMessageOut {
  id: number; channel: string; direction: string; provider: string | null
  provider_message_id: string | null; template_id: string | null; language: string | null
  subject_rendered: string | null; body_rendered: string | null
  delivery_status: string; error_code: string | null; retry_count: number
  recipient_channel_id: number | null; person_id: number | null; relation_id: number | null
  created_at: string; updated_at: string
}
export interface CrmOrgLead {
  state: CrmLeadState | null; owner_id: number | null
  effective_legal_tier: CrmLegalTier; effective_legal_basis: CrmLegalBasis
  primary_source: string | null; needs_human: boolean; agent_paused: boolean
  /** Optimistic lock of the lead block; goes into every lead action as `lead_version`. */
  version: number; updated_at: string | null
}
export interface CrmOrgDetail {
  id: number; name: string; legal_name: string | null; city: string | null; region: string | null
  category: string | null; business_status: string; shop_id: number | null; address: CrmAddress | null
  lead: CrmOrgLead
  parent: CrmOrgRef | null
  /** `items` is capped at 100; `count` is the real number. */
  children: { count: number; items: CrmOrgRef[] }
  /** Channels owned by the organisation itself. */
  channels: CrmChannelOut[]
  /** Active and ended relations (`active` tells them apart). */
  relations: CrmRelationOut[]
  sources: CrmSourceOut[]
  interactions: CrmInteractionOut[]; messages: CrmMessageOut[]
  open_review_count: number; reachable: boolean
  created_at: string; updated_at: string
}

// — Relations (person × organisation) —
export interface CrmRelationOut {
  id: number
  person: { id: number; display_name: string | null; optout: boolean }
  org: { id: number; name: string; city: string | null }
  valid_from: string | null; valid_to: string | null; active: boolean
  /** Role set (ROLE_CATALOG codes); empty is allowed, `role_missing` flags it. */
  roles: string[]; role_missing: boolean
  note: string | null; source: string
  address: CrmAddress | null; uses_org_address: boolean
  preferred_channel_id: number | null
  /** Channels owned by the relation (work phone, work mail). */
  channels: CrmChannelOut[]
  /** Personal channels of the person ("personal"). */
  person_channels: CrmChannelOut[]
}

// — Persons —
export interface CrmPerson {
  id: number; display_name: string | null; first_name: string | null; last_name: string | null
  /** `true` while `display_name` is built from first and last name (then it must not be sent). */
  name_derived: boolean
  salutation: CrmSalutation | null
  /** ISO date; with `birth_year_unknown` the year is the placeholder 2000 and must never be shown. */
  birth_date: string | null; birth_year_unknown: boolean
  optout: boolean; address: CrmAddress | null
  /** Personal channels; channels of a relation are in `relations[].channels`. */
  channels: CrmChannelOut[]; relations: CrmRelationOut[]
  created_at: string; updated_at: string
}

// — Review —
export type CrmReviewCategory = 'legacy' | 'channel_owner' | 'relations_without_role' | 'persons_name_parts'
export type CrmReviewKind =
  | 'legacy_contact_person' | 'legacy_contact_name' | 'legacy_person_channel' | 'legacy_role'
  | 'legacy_identifier_conflict' | 'channel_owner_unclear' | 'channel_owner_conflict'
  | 'relation_without_role' | 'person_without_name_parts'      // computed, `id` is null
export interface CrmReviewItemOut {
  /** `null` for computed entries (relations without role, persons without name parts): they cannot be resolved by id. */
  id: number | null
  kind: CrmReviewKind; status: string
  org: CrmOrgRef | null; person: { id: number; display_name: string | null } | null
  relation_id: number | null; channel: CrmChannelOut | null
  /** Only legacy cases: `{display_name, role_title}`; emptied when resolved. */
  payload: Record<string, unknown> | null
  created_at: string
}

// — Outreach and send gate —
export interface CrmOutreachRecipient {
  channel_id: number; kind: string; value: string; owner_type: CrmChannelOwnerType
  person: { id: number; display_name: string | null } | null
  relation_id: number | null; roles: string[]
  effective_tier: CrmLegalTier; approval_required: boolean; approval_open: boolean; is_default: boolean
}
export interface CrmSendApprovalOut {
  id: number; channel_id: number | null; effective_tier: string; approved_by: string
  reason: string; created_at: string; expires_at: string; used_message_id: number | null
}
export interface CrmOutreachGate {
  effective_tier: CrmLegalTier; org_tier: string
  /** `null` when the organisation has no email channel (preview without recipient): then only the org tier counts. */
  channel_tier: string | null
  approval_required: boolean
  /** Open (not used, not expired) approval for the chosen recipient. */
  approval: CrmSendApprovalOut | null
}
export interface CrmOutreachPreviewResponse {
  subject: string; body_rendered: string; placeholders: Record<string, string>
  /** The recipient the preview was rendered for (the default when none was sent). */
  recipient_channel_id: number | null
  gate: CrmOutreachGate
}
export interface CrmOutreachSendResponse { message_id: number; delivery_status: string }

// — Requests —
export interface CrmOrgCreateRequest {
  name: string; legal_name?: string | null; city?: string | null; category?: string | null
  /** `false` creates plain master data without a lead status. */
  as_lead?: boolean
  channels?: Array<{ kind: CrmChannelKindIn; value: string }>
  source?: { source: CrmSource; source_ref?: string | null }
}
/** Master data only; lead fields are rejected with 422. `null` clears a field. */
export interface CrmOrgUpdateRequest {
  name?: string | null; legal_name?: string | null; city?: string | null; region?: string | null
  category?: string | null; address?: CrmAddressIn | null
  /** Head office. */
  parent_org_id?: number | null
}
export interface CrmChannelAddRequest { kind: CrmChannelKindIn; value: string }
export interface CrmConfirmBusinessRequest { lead_version: number; legal_basis?: CrmLegalBasis | null; note?: string | null }
export interface CrmLeadTransitionRequest { to_state: CrmLeadState; lead_version: number; reason?: string | null; shop_id?: number | null }
export interface CrmSuppressRequest { reason: CrmSuppressReason; lead_version: number }
export interface CrmOrgLegalRequest { effective_legal_tier: CrmLegalTier; effective_legal_basis?: CrmLegalBasis | null; lead_version: number; note?: string | null }
export interface CrmOutreachPreviewRequest { language: CrmOutreachLang; template_id?: 'first_contact_email'; recipient_channel_id?: number | null }
export interface CrmOutreachSendRequest { language: CrmOutreachLang; subject: string; body: string; idempotency_key: string; recipient_channel_id?: number | null } // NO lead_version
/** `reason`: 10..500 characters. */
export interface CrmOutreachApproveRequest { recipient_channel_id: number; reason: string }

export interface CrmRelationCreateRequest {
  person_id: number; org_id: number; valid_from?: string | null; valid_to?: string | null
  note?: string | null; roles?: string[]; address?: CrmAddressIn | null; preferred_channel_id?: number | null
}
/** Explicit `null` clears the field; fields that are not sent stay as they are. */
export interface CrmRelationUpdateRequest {
  valid_from?: string | null; valid_to?: string | null; note?: string | null
  address?: CrmAddressIn | null; preferred_channel_id?: number | null
}
export interface CrmRelationEndRequest { valid_to: string }
export interface CrmRelationRoleRequest { role: string }
export interface CrmChannelMoveRequest { owner: CrmChannelOwner }
export interface CrmChannelTierRequest { legal_tier: CrmLegalTier }

/**
 * Person fields. Only send what changed. **Never send `display_name` while the person has a first or last name**
 * (not even `null`): 422 `person_display_name_derived`.
 */
export interface CrmPersonWriteRequest {
  display_name?: string | null; first_name?: string | null; last_name?: string | null
  salutation?: CrmSalutation | null
  /** ISO date; with `birth_year_unknown: true` send the placeholder year 2000. */
  birth_date?: string | null; birth_year_unknown?: boolean | null
  address?: CrmAddressIn | null
}
export interface CrmPersonCreateRequest extends CrmPersonWriteRequest {
  channels?: Array<{ kind: CrmChannelKindIn; value: string }>
}

export interface CrmReviewResolveRequest { status: 'resolved' | 'dismissed' }

// Safety net (N7600): kill switch + send caps; since the org cut also the owner rule and the approval tiers
export interface CrmSendCapOut { limit: number; sent_24h: number }
export interface CrmConfigOut {
  outbound_kill_switch: boolean
  send_caps: Record<string, CrmSendCapOut>
  /** Person opt-out also suppresses the organisation channels when the person is an owner. */
  owner_optout_rule: boolean
  /** Legal tiers whose sends need an explicit admin approval (default `['red']`). */
  require_human_approval_for_tier: CrmLegalTier[]
  updated_at: string | null
  updated_by: string | null
}
/** `PUT /admin/crm/config` is a partial update: fields that are not sent stay as they are. */
export interface CrmConfigUpdateRequest {
  outbound_kill_switch?: boolean | null
  send_caps?: Record<string, number> | null
  owner_optout_rule?: boolean | null
  require_human_approval_for_tier?: CrmLegalTier[] | null
}

// Manual contact documentation (N7600)
export type CrmManualKind = 'inbound_msg' | 'outbound_msg' | 'call' | 'note'
export type CrmManualChannel = 'whatsapp' | 'phone' | 'email' | 'telegram' | 'sms'
export interface CrmManualInteractionRequest {
  kind: CrmManualKind
  channel: CrmManualChannel
  direction?: 'in' | 'out'
  content: string
  occurred_at?: string
  our_party?: string
  their_party?: string
  /** "Who at the customer": a relation of this organisation; the person is derived from it. */
  relation_id?: number
}

// Backend error detail (for Toast evaluation): `"code"` or `{"detail": "code", …extras}`
export interface CrmErrorExtras {
  channel_kind?: string      // suppressed
  current_version?: number   // version_conflict
  message_id?: number        // smtp_failed
  channel_id?: number        // channel_owned_by_org, channel_exists_same_person
  person_id?: number         // person_channel_exists
  tier?: string              // outreach_tier_approval_required, outreach_approval_not_required
  cap?: number               // send_cap_reached
}
export type CrmErrorDetail =
  | string                                              // e.g. "illegal_transition", "shop_id_required"
  | ({ detail: string } & CrmErrorExtras)


// ─── Review moderation (F5930, /admin/reviews) ───────────────────────────────

export interface SysAdminReviewPhoto {
  id: number
  url: string
  thumbnail_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  moderation_reason: string | null
  moderation_categories: string[] | null
}

export interface SysAdminReviewReport {
  id: number
  source: 'customer' | 'shop_owner'
  reason: string | null
  comment: string | null
  /** customer: display name, shop owner: shop name, null if gone */
  reporter_label: string | null
  created_at: string
}

export interface SysAdminReviewReply {
  id: number
  shop_id: number
  shop_name: string
  body: string
  is_visible: boolean
  hidden_at: string | null
  hidden_reason: string | null
  created_at: string
  updated_at: string
}

export interface SysAdminReview {
  id: number
  user_id: number
  user_display_name: string
  entity_type: 'product' | 'shop'
  entity_id: number
  entity: { type: 'shop' | 'product'; id: number; slug: string; name: string } | null
  stars: number
  comment: string | null
  photos: SysAdminReviewPhoto[]
  is_visible: boolean
  created_at: string
  updated_at: string
  reporter_count: number
  owner_report_count: number
  last_reported_at: string | null
  invalidated_at: string | null
  invalidated_by: number | null
  reports: SysAdminReviewReport[]
  reply: SysAdminReviewReply | null
}

export const PHOTO_MODERATION_CATEGORIES = ['nudity', 'violence', 'hate', 'pii', 'spam', 'irrelevant', 'other'] as const
export type PhotoModerationCategory = (typeof PHOTO_MODERATION_CATEGORIES)[number]

/** GET /api/v1/admin/reviews/photos/unmoderated (F3700, AdminUnmoderatedPhotoOut) */
export interface SysAdminUnmoderatedPhoto {
  photo_id: number
  review_id: number
  status: 'pending' | 'approved' // approved = trusted user, already visible
  thumb_url: string | null
  detail_url: string | null
  url: string
  created_at: string
  moderation_requested_at: string | null
  moderation_task_id: string | null // null = submission to the gateway failed
  waiting_minutes: number
}

/** POST /api/v1/admin/reviews/photos/{id}/approve|reject (F3700, AdminPhotoDecisionRequest) */
export interface SysAdminPhotoDecisionRequest {
  reason: string | null
  categories: PhotoModerationCategory[]
}

export interface SysAdminReviewAuditEntry {
  id: number
  review_id: number
  action: string
  actor_type: string
  actor_id: number | null
  actor_ip: string | null
  moderation_model: string | null
  moderation_confidence: number | null
  reason: string | null
  timestamp: string
}

// ─── Claims (F5970) ──────────────────────────────────────────────────────────
// Mirrors pundo_main_backend/ingestor/schemas/admin_claim.py (/api/v1/admin/claim-requests).

export type SysAdminClaimStatus = 'open' | 'verified' | 'accepted' | 'rejected'
export type SysAdminClaimSubState =
  | 'awaiting_email_verification' | 'awaiting_code' | 'awaiting_callback' | 'callback_done_enter_code'
  | 'awaiting_review' | 'decided'

export interface SysAdminClaimListItem {
  id: number
  shop_id: number
  shop_name: string
  shop_slug: string
  kind: 'claim' | 'dispute'
  source: 'shop_page' | 'onboarding' | 'admin_assign'
  status: SysAdminClaimStatus
  rejection_reason: string | null
  proof_method: string | null
  proof_verified_at: string | null
  sub_state: SysAdminClaimSubState
  applicant: { id: number; name: string; email: string; email_verified: boolean } | null
  open_requests_for_shop: number
  current_owner_id: number | null
  expires_at: string | null
  created_at: string
}

export interface SysAdminClaimSummary {
  open: number
  verified: number
  disputes_open: number
  matching_pending: number
}

export interface SysAdminClaimDocument {
  id: number
  filename: string
  media_type: string
  size_bytes: number
  created_at: string
  deleted_at: string | null
  view_count: number
}

export interface SysAdminClaimCurrentOwner {
  id: number
  email: string
  name: string
  status: string
  since: string
  offers_active: number
  listings: number
  is_system_account: boolean
}

export interface SysAdminClaimEvent {
  at: string
  type: string
  from_status: string | null
  to_status: string | null
  actor_type: string
  actor_id: number | null
  payload: Record<string, unknown>
}

export interface SysAdminClaimDetail extends SysAdminClaimListItem {
  applicant_message: string | null
  applicant_lang: string
  shop: {
    id: number
    slug: string
    name: string
    address: string | null
    city: string | null
    email: string | null
    phone: string | null
    website_url: string | null
    webshop_url: string | null
    source: string | null
    source_url: string | null
    status: string
  }
  shop_contact_snapshot: Record<string, string | null> | null
  contact_changed_since_request: string[]
  email_domain_match: boolean | null
  code: { purpose: string; expires_at: string | null; failed_attempts: number } | null
  callbacks: Array<{ at: string; outcome: 'reached' | 'not_reached'; note: string | null; admin_id: number | null }>
  documents: SysAdminClaimDocument[]
  current_owner: SysAdminClaimCurrentOwner | null
  other_open_requests: Array<{ id: number; applicant_email: string | null; status: string }>
  decision: {
    by_admin_id: number | null
    at: string | null
    reason: string | null
    notify_previous_owner: boolean | null
    offers_flagged_count: number | null
    withdrawn_consent_id: number | null
    cancelled_case_ids: number[] | null
    previous_owner_id: number | null
  } | null
  documents_deleted_at: string | null
  events: SysAdminClaimEvent[]
}

export interface SysAdminCallbackCode {
  code: string
  expires_at: string
}

export interface SysAdminMatchingCandidate {
  shop_id: number
  name: string | null
  city: string | null
  website_url: string | null
  webshop_url: string | null
}

export interface SysAdminMatchingCheck {
  id: number
  input_domain: string | null
  input_shop_name: string | null
  input_city: string | null
  match_method: 'domain' | 'name_city' | 'none'
  outcome: 'matched' | 'ambiguous' | 'ambiguous_owned' | 'no_match'
  review_status: string
  candidates: SysAdminMatchingCandidate[]
  created_at: string
}

export interface SysAdminShopOwnerOverview {
  owner: SysAdminClaimCurrentOwner | null
  open_claims: SysAdminClaimListItem[]
}

export interface SysAdminAssignOwnerPayload {
  shop_owner_id: number
  reason: string
  approve_owner?: boolean
  replace_existing_owner?: boolean
  deactivate_previous_shop_of_owner?: boolean
  notify_previous_owner?: boolean
  shop_claim_check_id?: number
}

export interface SysAdminAssignOwnerResult {
  claim_request_id: number
  shop_id: number
  shop_owner_id: number
  previous_owner_id: number | null
  offers_flagged_count: number
  deactivated_shop_id: number | null
}

/** One hit of the mapping form's search (GET /item-domain-mappings/lookup). */
export interface SysAdminMappingLookupOption {
  id: number
  slug: string
  label: string
  parent_slug: string | null
}

/** B5982-001 review queue row (GET /api/v1/admin/category-review) */
export interface SysAdminCategoryReviewItem {
  item_id: number
  name: string | null
  product_url: string | null
  proposed_category_id: number | null
  proposed_category_path: string | null
  descent_confidence: number | null
  first_confidence: number | null
}
