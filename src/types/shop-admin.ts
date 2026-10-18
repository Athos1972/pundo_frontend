// ─── Shop-Owner Portal — TypeScript Interfaces ───────────────────────────────
// IMPORTANT: Keep this file separate from src/types/api.ts (Clean Boundary rule)
// These types must NEVER be imported from customer-facing code.

// ─── Shared Enums ────────────────────────────────────────────────────────────

export type ItemType   = 'product' | 'service'
export type ItemSource = 'scraper' | 'admin' | 'shop_manual' | 'shop_upload' | 'spotted' | 'auto_seeded'
export type ItemStatus = 'active' | 'inactive'

export interface ShopOwner {
  id: number
  email: string
  name: string
  status: 'pre_signup' | 'pending' | 'approved' | 'rejected' | 'inactive' | 'suspended'
  shop_id: number | null
}

// ─── Self-Service Attribute Types (F5300 / F3800 Phase 1a) ───────────────────

export type CharityStatus = 'none' | 'pending' | 'approved'
export type PaymentMethodValue = 'cash' | 'card' | 'revolut' | 'klarna'

export interface AdminShop {
  id: number
  name: string
  description: string | null
  logo_url: string | null
  address: string | null
  location: { lat: number; lng: number } | null
  spoken_languages: string[]
  phone?: string | null
  whatsapp_number: string | null
  website_url: string | null
  webshop_url: string | null
  social_links: SocialLinksMap | null
  status: 'active' | 'inactive' | 'pending'
  // Self-service attributes — all optional (backend may not yet return them)
  service_radius_km?: number | null
  delivers_island_wide?: boolean
  supports_charity?: boolean
  charity_note?: string | null
  charity_status?: CharityStatus
  appointment_required?: boolean
  payment_methods?: PaymentMethodValue[]
}

export interface OpeningHours {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  open?: string | null         // "HH:MM" — undefined/null when closed=true
  close?: string | null
  closed: boolean
  second_open?: string | null
  second_close?: string | null
}

// ─── Social Links ─────────────────────────────────────────────────────────────

/** Custom social link stored under the "other" key. */
export interface CustomSocialLink {
  key: string   // user-supplied platform name, e.g. "xing"
  url: string
}

/** Canonical wire format. Mirrors Python SocialLinks dict[str, str | CustomSocialLink]. */
export type SocialLinksMap = {
  [platform: string]: string | CustomSocialLink | CustomSocialLink[] | undefined
  facebook?: string
  instagram?: string
  tiktok?: string
  youtube?: string
  linkedin?: string
  x?: string
  other?: CustomSocialLink | CustomSocialLink[]
}

export interface PriceUnitOption {
  code: string
  label: string
  sort_order: number
}

export interface PriceTierStep {
  id?: number
  min_quantity: number
  max_quantity?: number
  price: string
  currency: string
}

export interface PriceTier {
  id?: number
  unit: string
  unit_label_custom?: string
  steps: PriceTierStep[]
}

// ─── Item (global catalogue) ──────────────────────────────────────────────────

export interface AdminItemPhoto {
  id: number
  item_id: number
  contributed_by_shop_id: number | null
  url: string
  thumbnail_url: string | null
  sort_order: number
}

export interface AdminOfferItemEmbed {
  id: number
  slug: string
  item_type: ItemType
  names: Record<string, string>
  descriptions: Record<string, string> | null
  photos: Pick<AdminItemPhoto, 'id' | 'url' | 'thumbnail_url' | 'sort_order'>[]
  category_id: number | null
  category_name: string | null
  ean: string | null
}

export interface AdminItem {
  id: number
  slug: string
  item_type: ItemType
  names: Record<string, string>
  descriptions: Record<string, string> | null
  category_id: number
  brand_id: number | null
  ean: string | null
  status: ItemStatus
  source: ItemSource
  photos: AdminItemPhoto[]
  created_at: string
}

// Lightweight variant for Item Picker search results
export interface ItemSearchResult {
  id: number
  slug: string
  item_type: ItemType
  name: string           // localised, single string
  category_id: number
  ean: string | null
  photo_url: string | null
}

// ─── ShopListing (junction) ───────────────────────────────────────────────────

export interface AdminShopListing {
  id: number
  item_id: number
  shop_id: number
  item: AdminItem          // embedded by backend in list responses
  available: boolean
  source: ItemSource
  sku: string | null
  shop_url: string | null
  created_at: string
}

export interface AdminShopListingList {
  items: AdminShopListing[]
  total: number
}

// ─── Offer (unified: price + optional promotional period) ────────────────────

export type PriceType = 'fixed' | 'on_request' | 'free' | 'variable'

export interface AdminOffer {
  id: number
  shop_listing_id: number
  title: string | null
  description: string | null
  // Standardpreis (Pflicht, außer price_type on_request/free)
  price_type: PriceType
  price_tiers: PriceTier[]
  currency: string
  // Aktionspreis (optional — alle vier Felder oder keines)
  promo_price_type: PriceType | null
  promo_price_tiers: PriceTier[]
  promo_valid_from: string | null
  promo_valid_until: string | null
  // Metadaten
  source: ItemSource
  offer_url: string | null
  archived: boolean
  crawled_at: string | null
  created_at: string
  item?: AdminOfferItemEmbed
  /** F5920: article number of the shop listing and whether it is available (import "not available") */
  listing_sku?: string | null
  listing_available?: boolean | null
  /** F5970 A9: the shop changed hands; this active offer is hidden publicly until confirmed or archived ("Zu prüfen"). */
  ownership_review?: boolean
}

// Keep backward-compat alias so any remaining usage of `offer.title` (non-null) still works
// but the canonical type has title as string | null per the new unified model.

// ─── Deprecated types — kept for compilation of legacy components not yet removed ─
/** @deprecated Use AdminShopListing + AdminOffer instead */
export interface AdminProductImage {
  id: number
  url: string
  sort_order: number
}

/** @deprecated Use AdminShopListing + AdminOffer instead */
export interface AdminProduct {
  id: number
  name: string
  category_id: number
  available: boolean
  price_tiers: PriceTier[]
  images?: AdminProductImage[]
}

/** @deprecated Use AdminShopListingList instead */
export interface AdminProductList {
  items: AdminProduct[]
  total: number
}

export interface AdminOfferList {
  items: AdminOffer[]
  total: number
}

export interface ApiKey {
  id: number
  name: string
  scope: 'read' | 'write' | 'read_write'
  created_at: string
  last_used_at?: string
}

// Returned only on creation — key value shown once then discarded
export interface ApiKeyCreated extends ApiKey {
  key: string
}

export interface ImageDownloadError {
  product_name: string
  url: string
  reason: string
}

// All-or-nothing import (B5900-030): sync status is 'ok' or 'error'; faulty rows -> nothing imported.
export type ImportSyncStatus = 'ok' | 'error'
export type ImportRowErrorCode =
  | 'missing_name'
  | 'row_failed'
  | 'invalid_ean'
  | 'invalid_price'
  | 'invalid_currency'
  | 'invalid_available'
  | 'invalid_language'
  | 'invalid_image_url'
  | 'invalid_sku'
  | 'duplicate_in_file'
export type ImportSyncErrorCode =
  | 'sheet_url_invalid'
  | 'sheet_fetch_failed'
  | 'sheet_not_public'
  | 'rows_failed'
  | 'sync_failed'
  | 'empty_sheet'
  | 'missing_name_column'
  | 'too_many_rows'

export interface ImportRowError {
  row: number
  message: string
  code?: ImportRowErrorCode | null
}

export interface ImportPossibleDuplicateRow {
  row: number
  name: string
}

export interface ImportSyncResult {
  imported: number
  // F5920 counters (absent in results stored before F5920)
  created?: number
  updated?: number
  unchanged?: number
  deactivated?: number
  possible_duplicates?: number
  possible_duplicate_rows?: ImportPossibleDuplicateRow[]
  row_count?: number
  error_count: number
  errors: ImportRowError[]
  errors_truncated: boolean
  image_download_pending: number
  error_code?: ImportSyncErrorCode | null
}

export interface ImportStatus {
  google_sheet_url?: string | null
  last_sync?: string | null
  last_sync_status?: ImportSyncStatus | null
  last_sync_message?: string | null
  last_sync_result?: ImportSyncResult | null
  image_download_errors?: ImageDownloadError[] | null
  last_image_download_at?: string | null
}

/** Legacy direct upload (deprecated endpoint, kept for typing old responses). */
export interface ImportUploadResult {
  imported: number
  errors: ImportRowError[]
  image_download_pending?: number
}

// ─── F5920 Katalog-Import: Vorschau → Übernehmen ──────────────────────────────

export type ImportPreviewStatus = 'processing' | 'ready' | 'applying' | 'applied' | 'failed'
export type ImportRowStatus = 'new' | 'updated' | 'unchanged' | 'error' | 'possible_duplicate'
export type ImportChangeField = 'available' | 'price' | 'name' | 'sku' | 'category' | 'reactivated'
export type ImportMatchedBy = 'sku' | 'ean' | 'name' | 'decision'
export type ImportRowHintCode =
  | 'linked_catalog_item'
  | 'ambiguous_name_match'
  | 'name_not_updated_shared'
  | 'photo_skipped_shared'
  | 'category_unresolved'
  | 'category_hint_unknown'
  | 'no_price'
  | 'offer_replaced_complex'
  | 'ean_mismatch'
export type ImportPreviewErrorCode = 'job_lost' | 'preview_stale' | 'apply_failed' | 'preview_failed'
/** Datei-/Upload-Fehler, die der Server synchron mit 400/413/429 meldet (`detail.code`). */
export type ImportFileErrorCode =
  | 'unsupported_format'
  | 'xlsx_unreadable'
  | 'xls_unreadable'
  | 'csv_unreadable'
  | 'missing_name_column'
  | 'empty_file'
  | 'too_many_rows'
  | 'invalid_default_lang'
  | 'file_too_large'
  | 'preview_in_progress'

export interface ImportPreviewCounts {
  new: number
  updated: number
  unchanged: number
  error: number
  possible_duplicate: number
  deactivate: number
}

export interface ImportDuplicateCandidate {
  item_id: number
  name: string
  photo_url?: string | null
  score: number
}

export interface ImportPreviewRow {
  row: number
  status: ImportRowStatus
  name?: string | null
  language: string
  sku?: string | null
  ean?: string | null
  price?: string | null
  currency?: string | null
  available?: boolean | null
  matched_by?: ImportMatchedBy | null
  matched_listing_id?: number | null
  matched_item_id?: number | null
  matched_name?: string | null
  changes: ImportChangeField[]
  category_id?: number | null
  category_path?: string | null
  category_source?: 'column' | 'suggested' | 'existing' | null
  candidates: ImportDuplicateCandidate[]
  errors: ImportRowError[]
  hints: ImportRowHintCode[]
}

export interface ImportDeactivation {
  listing_id: number
  item_id: number
  name: string
  sku?: string | null
}

export interface ImportApplyResult {
  created: number
  updated: number
  unchanged: number
  deactivated: number
  linked_existing: number
  image_download_pending: number
  translation_queued: number
  row_count: number
  hints: Record<string, number>
}

export interface ImportPreviewProgress {
  phase: string
  done: number
  total: number
}

export interface ImportPreview {
  id: string
  status: ImportPreviewStatus
  full_list: boolean
  default_lang: string
  filename?: string | null
  row_count: number
  progress?: ImportPreviewProgress | null
  expires_at: string
  expired: boolean
  can_apply: boolean
  counts: ImportPreviewCounts | null
  rows: ImportPreviewRow[]
  rows_total: number
  deactivations: ImportDeactivation[]
  deactivations_total: number
  result?: ImportApplyResult | null
  error_code?: ImportPreviewErrorCode | null
}

export interface ImportPreviewCreated {
  id: string
  status: ImportPreviewStatus
  expires_at: string
  row_count: number
}

export interface ImportApplyDecision {
  row: number
  action: 'use_existing' | 'create_new'
  item_id?: number
}

// ─── Reviews of the own shop (F5930, GET /api/v1/shop-owner/reviews) ──────────

export type ShopReviewScope = 'shop' | 'products'

export type ShopReviewReportReason = 'spam' | 'offensive' | 'legal' | 'wrong_shop' | 'other'

export interface ShopOwnerReviewReply {
  id: number
  body: string
  created_at: string
  updated_at: string
  /** false = hidden by pundo (owner can neither edit nor delete it) */
  is_visible: boolean
}

export interface ShopOwnerReview {
  id: number
  /** null when the product / shop no longer exists */
  entity: { type: 'shop' | 'product'; id: number; slug: string; name: string } | null
  user_display_name: string
  stars: number
  comment: string | null
  photos: { id: number; url: string; thumbnail_url: string | null }[]
  /** false = hidden by pundo */
  is_visible: boolean
  created_at: string
  updated_at: string
  is_new: boolean
  reported_by_shop: boolean
  reply: ShopOwnerReviewReply | null
  can_reply: boolean
  can_report: boolean
}

export interface ShopOwnerReviewPage {
  items: ShopOwnerReview[]
  total: number
  limit: number
  offset: number
  scope: ShopReviewScope
  /** server time of the query: input for mark-seen */
  generated_at: string
}

export interface ShopOwnerReviewSummary {
  new_count: number
  new_shop_count: number
  new_product_count: number
  shop_total: number
  shop_average_stars: number
  product_total: number
  last_seen_at: string | null
  shop_slug: string
}

// ─── Social-Link Moderation ───────────────────────────────────────────────────

export type SocialLinkBlockCategory =
  | 'adult'
  | 'gambling'
  | 'hate'
  | 'illegal'
  | 'malware'
  | 'shortener_unresolvable'
  | 'custom'

export interface SocialLinkBlockedError {
  error: 'social_link_blocked'
  key: string
  category: SocialLinkBlockCategory
  resolved_host?: string | null
  via_shortener?: boolean
}

export interface SocialLinkFieldError {
  category: SocialLinkBlockCategory
  resolved_host?: string | null
  via_shortener?: boolean
}

// ─── Quick Onboarding (F5910) ─────────────────────────────────────────────────

export type OnboardingProviderType = 'handwerker' | 'dienstleister' | 'haendler' | 'gastro'

export interface OnboardingSpecialty {
  slug: string
  label: string
}

export interface OnboardingDomain {
  slug: string
  label: string
  /** B5910-004: heterogeneous domain (no default offer) - at least one specialty must be chosen. Default false. */
  specialtyRequired?: boolean
  specialties: OnboardingSpecialty[]
}

export interface OnboardingContact {
  phone?: string
  whatsapp?: string
  businessEmail?: string
  instagram?: string
  telegram?: string
  facebook?: string
  website?: string
}

export interface OnboardingLocation {
  lat: number
  lng: number
  address: string
  isB2cStorefront: boolean
}

export interface OnboardingDraft {
  version: 2
  expiresAt: number
  providerType: OnboardingProviderType | null
  domainSlugs: string[]
  specialtySlugs: string[]
  location: OnboardingLocation | null
  contact: OnboardingContact
  shopName: string
  /** F2970: optional free text when "Other" is the chosen domain (max 120 chars). */
  otherOfferText?: string
  /** F5980 AC1: explicit, never pre-checked consent to the catalogue onboarding (optional, old drafts = false). */
  catalogConsent?: boolean
}

export interface OnboardingSubmitPayload {
  providerType: OnboardingProviderType
  domainSlugs: string[]
  specialtySlugs: string[]
  location: OnboardingLocation
  contact: OnboardingContact
  shopName: string
  credentials: { email: string; password: string } | { type: 'google' }
  /** F2970: only sent when "Other" is selected; trimmed, max 120 characters. */
  otherOfferText?: string
  /** B6220-003: Cloudflare Turnstile token, verified by the backend (email path only). */
  turnstileToken?: string
  /** F5980 AC1: consent checkbox state; only sent when true AND a website is set. */
  catalogConsent?: boolean
  /** F5980 AC1: UI language in which the consent text was shown (proof). */
  catalogConsentLang?: string
}

export interface OnboardingSubmitResponse {
  user_id: number
  shop_id: number
  status: string
}

// ─── Catalog Review (F5980 Autonomous Shop Commerce Brain) ───────────────────
// Mirrors pundo_main_backend/ingestor/schemas/catalog_case.py 1:1.
// Status enum is lowercase snake_case (backend §2.1 design deviation).

export type CatalogCaseStatus =
  | 'consent_given' | 'intake_submitted' | 'enrichment_in_progress'
  | 'enrichment_done' | 'awaiting_owner_review' | 'published'
  | 'rejected' | 'rework_in_progress' | 'failed'

export interface CatalogCaseListItem {
  id: number
  shop_id: number
  status: CatalogCaseStatus
  item_count: number
  completed_item_count: number
  completeness_pct: number           // 0..1 (Backend: completed/item_count)
  sla_deadline_at: string            // ISO datetime
  consent_given_at: string
  rework_cycle_count: number
  created_at: string
}

export interface CatalogCaseListResponse {
  cases: CatalogCaseListItem[]
}

export interface CatalogCaseSampleItem {
  catalog_case_item_id: number
  item_id: number | null
  raw_name: string | null
  raw_description: string | null
  raw_category_path: string | null
  names: Record<string, string> | null           // Dict — alle Sprachen (Vorher/Nachher)
  descriptions: Record<string, string> | null
  category_id: number | null
  category_path: string | null
  attributes: Record<string, unknown> | null
  status: string
  last_error: string | null
}

export interface CatalogCaseSampleResponse {
  catalog_case_id: number
  sample: CatalogCaseSampleItem[]
  sample_size_requested: number
  sample_size_returned: number
}

export interface CatalogCaseApproveResponse {
  id: number
  status: CatalogCaseStatus
  published_at: string
}

export interface CatalogCaseRejectResponse {
  id: number
  status: CatalogCaseStatus
  rework_cycle_count: number
}

// ─── Catalog consent (F5980 AC1) ─────────────────────────────────────────────
// Mirrors pundo_main_backend/ingestor/schemas/catalog_consent.py.

export interface CatalogConsentStatus {
  status: 'none' | 'given'
  given_at: string | null            // ISO
  text_version: string | null        // version of the given consent
  current_text_version: string       // current version according to the backend
  catalog_case_id: number | null     // opened case, if any
  has_catalog_source: boolean        // shop has website_url or webshop_url
}

export interface CatalogConsentCreateResponse {
  consent_id: number
  given_at: string
  catalog_case_id: number | null
  created: boolean                   // false = an active consent already existed
}

// ─── B5900-011: Category picker ──────────────────────────────────────────────

export interface PickerCategory {
  id: number
  parent_id: number | null
  taxonomy_type: 'google' | 'unspsc'
  name: string
  /** Translated ancestors, root → parent. Empty for roots. */
  path_names: string[]
  child_count: number
}

export type CategorySuggestionSource = 'name' | 'recent' | 'domain'

export interface CategorySuggestion extends PickerCategory {
  source: CategorySuggestionSource
  score: number
}

// ─── Offers to review after an owner change (F5970 A9) ───────────────────────
// Mirrors pundo_main_backend/ingestor/schemas/shop_owner.py (OwnershipReview*).

export interface OwnershipReviewSummary {
  count: number
}

export type OwnershipReviewSelection = { offer_ids: number[] } | { all: true }

export interface OwnershipReviewConfirmResponse {
  confirmed: number
  remaining: number
}

export interface OwnershipReviewArchiveResponse {
  archived: number
  remaining: number
}

// ─── Shop claim (F5970) ──────────────────────────────────────────────────────
// Mirrors pundo_main_backend/ingestor/schemas/shop_claim.py (/api/v1/shop-owner/claim/*).

export type ClaimMode = 'claim' | 'dispute' | 'document_only'
export type ClaimProofMethod = 'email_domain' | 'shop_email_code' | 'phone_callback' | 'document'
export type ClaimStatusValue = 'open' | 'verified' | 'accepted' | 'rejected'
export type ClaimRejectionReason =
  | 'superseded' | 'expired' | 'withdrawn' | 'not_reachable' | 'insufficient_proof' | 'other'
export type ClaimSubState =
  | 'awaiting_email_verification' | 'awaiting_code' | 'awaiting_callback' | 'callback_done_enter_code'
  | 'awaiting_review' | 'decided'

export type ClaimMethod =
  | { method: 'email_domain'; requires_domain: string }
  | { method: 'shop_email_code'; masked_email: string }
  | { method: 'phone_callback'; masked_phone: string }
  | { method: 'document' }

export interface ClaimShopInfo {
  shop: {
    slug: string
    name: string
    address: string | null
    city: string | null
    website_host: string | null
    logo_url: string | null
  }
  is_claimed: boolean
  mode: ClaimMode
  methods: ClaimMethod[]
  document_upload_available: boolean
  limits: { max_files: number; max_file_bytes: number; message_max_chars: number }
  /** Only when the visitor is logged in as a shop owner. */
  viewer: { has_shop: boolean; status: string; email: string } | null
}

export interface ClaimCandidate {
  slug: string
  name: string
  city: string | null
  website_host: string | null
  is_claimed: boolean
}

export interface ClaimMatchRequest {
  website?: string
  name?: string
  lat?: number
  lng?: number
  city?: string
}

export interface ClaimCreateResponse {
  claim_request_id: number
  /** Shown only here and in the mail link -- keep in sessionStorage, never log. */
  access_token: string
  status: 'open' | 'verified'
  existing: boolean
  next_step: 'verify_email' | 'request_code' | 'await_callback' | 'await_review'
}

export interface ClaimStatusCode {
  purpose: 'shop_email' | 'callback'
  expires_at: string | null
  attempts_left: number
  resends_left_24h: number
  next_resend_at: string | null
}

export interface ClaimStatusResponse {
  id: number
  shop: { slug: string; name: string }
  kind: 'claim' | 'dispute'
  status: ClaimStatusValue
  rejection_reason: ClaimRejectionReason | null
  proof_method: ClaimProofMethod | null
  sub_state: ClaimSubState
  code: ClaimStatusCode | null
  documents: Array<{ filename: string; size_bytes: number; deleted: boolean }>
  created_at: string
  decided_at: string | null
  login_url: string | null
}

/** Body of POST /shop-owner/verify-email (extended by F5970). */
export interface VerifyEmailResponse {
  status: string
  claim_request_status?: 'open' | 'verified'
}
