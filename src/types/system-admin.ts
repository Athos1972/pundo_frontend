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
  priority: number
  auto_assign: boolean
  created_at: string
}

export interface SysAdminItemDomainMappingCreate {
  item_id: number
  /** Backend field name is `domain_id` (not `onboarding_domain_id`). */
  domain_id?: number | null
  specialty_id?: number | null
  priority?: number
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
  shop_owner_id: number
  name: string
  scope: 'read' | 'write' | 'read_write'
  created_at: string
  last_used_at: string | null
}

// ─── CRM (F7600) ───────────────────────────────────────────────────────────────

export type CrmLifecycleState =
  | 'SOURCED' | 'ENRICHED' | 'NEEDS_REVIEW' | 'QUEUED' | 'CONTACTED'
  | 'ENGAGED' | 'INTERESTED' | 'REGISTERED' | 'UNREACHABLE'
  | 'HARD_OPTOUT' | 'REJECTED_PRIVATE' | 'DEAD'

export type CrmChannelKindIn = 'email' | 'phone'          // Request-side (Ingest)
export type CrmOutreachLang = 'el' | 'en' | 'ru'
export type CrmLegalBasis = 'legitimate_interest' | 'consent' | 'contract' | 'none'
export type CrmSuppressReason = 'hard_optout' | 'rejected_private'
export type CrmSource = 'business_card' | 'manual' | 'referral' | 'event'

// — Requests —
export interface CrmIngestRequest {
  org: { name: string; city?: string | null; category?: string | null }
  contact: { display_name?: string | null; role_title?: string | null }
  channels: Array<{ kind: CrmChannelKindIn; value: string }>
  source: { source: CrmSource; source_ref?: string | null; raw?: Record<string, unknown> | null }
}

export interface CrmOrgUpdateRequest {
  name?: string | null
  city?: string | null
  category?: string | null
}

export interface CrmContactUpdateRequest {
  org?: CrmOrgUpdateRequest | null
  display_name?: string | null
  role_title?: string | null
}

export interface CrmChannelAddRequest {
  kind: CrmChannelKindIn
  value: string
}
export interface CrmConfirmBusinessRequest { version: number; legal_basis?: CrmLegalBasis | null; note?: string | null }
export interface CrmLifecycleRequest { to_state: CrmLifecycleState; version: number; reason?: string | null; shop_id?: number | null }
export interface CrmSuppressRequest { reason: CrmSuppressReason; version: number }
export interface CrmOutreachPreviewRequest { language: CrmOutreachLang; template_id?: 'first_contact_email' }
export interface CrmOutreachSendRequest { language: CrmOutreachLang; subject: string; body: string; idempotency_key: string } // NO version

// — Responses —
export interface CrmOutreachPreviewResponse { subject: string; body_rendered: string; placeholders: Record<string, string> }
export interface CrmOutreachSendResponse { message_id: number; delivery_status: string }

export interface CrmOrgOut {
  id: number; name: string; legal_name?: string | null; city?: string | null
  region?: string | null; category?: string | null; business_status: string; shop_id: number | null
}
export type CrmChannelKindOut = 'email' | 'phone_call' | 'sms' | 'whatsapp' | 'push'
export interface CrmChannelOut {
  id: number; kind: CrmChannelKindOut; value_normalized: string; reachable: string
  consent_state: string; is_preferred: boolean; created_at: string
}
export interface CrmSourceOut {
  id: number; source: string; source_ref?: string | null
  legal_tier: string; legal_basis: string; observed_at: string
}
export interface CrmInteractionOut {
  id: number; actor_type: string; actor_id?: string | null; kind: string; channel: string
  direction: string; state_from?: string | null; state_to?: string | null
  outcome?: string | null; payload?: Record<string, unknown> | null; created_at: string
}
export interface CrmMessageOut {
  id: number; channel: string; direction: string; provider?: string | null
  provider_message_id?: string | null; template_id?: string | null; language?: string | null
  subject_rendered?: string | null; body_rendered?: string | null
  delivery_status: string; error_code?: string | null; retry_count: number
  created_at: string; updated_at: string
}
export interface CrmContactListItem {
  id: number; display_name?: string | null; org_name: string
  primary_email?: string | null; lifecycle_state: string; version: number; updated_at: string
}
export interface CrmContactDetail {
  id: number; org: CrmOrgOut; display_name?: string | null; role_title?: string | null
  lifecycle_state: string; effective_legal_tier: string; effective_legal_basis: string
  owner_id: number | null; shop_id: number | null; needs_human: boolean; agent_paused: boolean
  version: number
  // Stufe 2: card image storage keys (used to build /admin/crm/contacts/{id}/card-image/{side})
  card_image_front_url: string | null; card_image_back_url: string | null
  channels: CrmChannelOut[]; sources: CrmSourceOut[]
  interactions: CrmInteractionOut[]; messages: CrmMessageOut[]
  created_at: string; updated_at: string
}

// Backend error detail (for Toast evaluation)
export type CrmErrorDetail =
  | string                                              // e.g. "illegal_transition", "shop_id_required"
  | { detail: string; channel_kind?: string; current_version?: number; message_id?: number }


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
