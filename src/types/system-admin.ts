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
  status: 'pre_signup' | 'pending' | 'approved' | 'rejected'
  shop_id: number | null
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

// ─── Offers (unified — covers both scraped and shop-owner offers) ─────────────
export interface SysAdminOffer {
  id: number
  shop_listing_id: number
  title: string | null
  description: string | null
  price_type: string
  price_tiers: unknown[]   // JSONB — same shape as AdminOffer.price_tiers in shop-admin.ts
  currency: string
  valid_from: string | null
  valid_until: string | null
  source: string
  offer_url: string | null
  archived: boolean
  crawled_at: string | null
  created_at: string
}

/** @deprecated SysAdminShopOwnerOffer is replaced by the unified SysAdminOffer */
export type SysAdminShopOwnerOffer = SysAdminOffer

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
