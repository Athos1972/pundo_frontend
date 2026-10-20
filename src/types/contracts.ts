// ─── Backend ↔ Frontend type contracts (B8950-016 T17) ───────────────────────────────────────────────────────────
// `generated/backend.ts` is derived from the backend OpenAPI schema (docs/openapi.json, `node scripts/api-types.cjs sync`).
// Every pair below says: "this hand-written frontend type describes THAT backend response". The check is one-way,
// backend → frontend: what the backend sends must be assignable to what the UI expects. If the backend drops or renames
// a field, or changes its type, `tsc` fails here instead of the page failing in production.
//
// A divergence that is deliberate goes into KNOWN_DRIFT below with the reason (and an issue number); an entry without a
// real divergence is itself an error (`@ts-expect-error` becomes "unused"), so the list cannot rot.
//
// Type-only module: nothing here is imported at runtime.
import type { components } from './generated/backend'
import type * as SysAdmin from './system-admin'
import type * as Api from './api'
import type * as ShopAdmin from './shop-admin'

type Schemas = components['schemas']

/**
 * What the comparison ignores, deliberately (each is information the OpenAPI schema does not carry):
 * - optionality: OpenAPI marks every field with a default as optional, but FastAPI always serialises it,
 *   so the backend side is compared with `DeepRequired` (`null` is kept: a nullable field stays nullable);
 * - `unknown` and free-form dicts on the backend side (`dict[str, Any]`): nothing to compare against, treated as `any`;
 * - literal unions on the frontend side (`'fixed' | 'on_request'`): the backend declares a plain `str`, so the frontend
 *   type is widened to its primitive. Enum values are not checked here.
 * What it does catch: a field the frontend expects but the backend no longer sends, a renamed field, a type change
 * (`string` vs `number`, object vs array) and a field that became nullable while the frontend assumes a value.
 */
type Loose<T> = unknown extends T
  ? any // eslint-disable-line @typescript-eslint/no-explicit-any
  : T extends readonly (infer U)[]
    ? Loose<U>[]
    : T extends object
      ? string extends keyof T
        ? unknown extends T[string & keyof T]
          ? any // eslint-disable-line @typescript-eslint/no-explicit-any
          : { [K in keyof T]-?: Loose<T[K]> }
        : { [K in keyof T]-?: Loose<T[K]> }
      : T

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? Widen<U>[]
        : T extends object
          ? { [K in keyof T]: Widen<T[K]> }
          : T

/** `true` when every backend `A` is a valid frontend `B`; a compile error at the call site otherwise. */
type Assignable<A, B> = [Loose<A>] extends [Widen<B>] ? true : false
type Contract<_ extends true> = true

// A line with `@ts-expect-error` is a KNOWN divergence: the frontend type claims something the backend schema does not
// deliver (`missing`), a field that can be `null` (`nullable`) or a different shape (`type`/`notobject`). They are findings,
// not endorsements: fix the frontend type (and the code reading it) or the backend schema, then delete the comment; once the
// divergence is gone the leftover `@ts-expect-error` fails the typecheck. Follow-up: Vault B8950-016 "Typ-Drift".

// ── System admin (src/types/system-admin.ts) ────────────────────────────────────────────────────────────
export type SysAdminContracts = [
  Contract<Assignable<Schemas['CrmConfigOut'], SysAdmin.CrmConfigOut>>,
  Contract<Assignable<Schemas['SendCapOut'], SysAdmin.CrmSendCapOut>>,
  Contract<Assignable<Schemas['OutreachPreviewResponse'], SysAdmin.CrmOutreachPreviewResponse>>,
  Contract<Assignable<Schemas['OutreachSendResponse'], SysAdmin.CrmOutreachSendResponse>>,
  Contract<Assignable<Schemas['InteractionOut'], SysAdmin.CrmInteractionOut>>,
  Contract<Assignable<Schemas['ChannelOut'], SysAdmin.CrmChannelOut>>,
  Contract<Assignable<Schemas['SourceOut'], SysAdmin.CrmSourceOut>>,
  Contract<Assignable<Schemas['OrgOut'], SysAdmin.CrmOrgOut>>,
  Contract<Assignable<Schemas['ContactDetailResponse'], SysAdmin.CrmContactDetail>>,
  Contract<Assignable<Schemas['ContactListItem'], SysAdmin.CrmContactListItem>>,
  // @ts-expect-error -- drift: opening_hours[].open:nullable, opening_hours[].close:nullable, opening_hours[].second_open:nullable, opening_hours[].second_close:nullable, social_links.*:type
  Contract<Assignable<Schemas['AdminShopResponse'], SysAdmin.SysAdminShop>>,
  // `/products` (the only endpoint the admin UI reads items from) answers with AdminProductResponse, not AdminItemResponse
  Contract<Assignable<Schemas['AdminProductResponse'], SysAdmin.SysAdminItem>>,
  // @ts-expect-error -- drift: social_links.*:type, social_links.*:notobject, social_links.*:notarray
  Contract<Assignable<Schemas['AdminBrandResponse'], SysAdmin.SysAdminBrand>>,
  Contract<Assignable<Schemas['AdminCategoryResponse'], SysAdmin.SysAdminCategory>>,
  Contract<Assignable<Schemas['AdminShopOwnerResponse'], SysAdmin.SysAdminShopOwner>>,
  Contract<Assignable<Schemas['AdminOfferResponse'], SysAdmin.SysAdminOffer>>,
  Contract<Assignable<Schemas['AdminApiKeyResponse'], SysAdmin.SysAdminApiKey>>,
  Contract<Assignable<Schemas['AdminShopTypeResponse'], SysAdmin.SysAdminShopType>>,
  // @ts-expect-error -- drift: external_batch_id:missing
  Contract<Assignable<Schemas['SocialLinkRuleResponse'], SysAdmin.SysAdminSocialLinkRule>>,
  Contract<Assignable<Schemas['ScrapeRunResponse'], SysAdmin.SysAdminScrapeRun>>,
]

// ── Customer-facing (src/types/api.ts) ──────────────────────────────────────────────────────────────────
export type ApiContracts = [
  Contract<Assignable<Schemas['ProductListItem'], Api.ProductListItem>>,
  Contract<Assignable<Schemas['ProductListResponse'], Api.ProductListResponse>>,
  Contract<Assignable<Schemas['ProductDetailResponse'], Api.ProductDetailResponse>>,
  Contract<Assignable<Schemas['ShopListItem'], Api.ShopListItem>>,
  Contract<Assignable<Schemas['ShopDetailResponse'], Api.ShopDetailResponse>>,
  Contract<Assignable<Schemas['CategoryItem'], Api.CategoryItem>>,
  Contract<Assignable<Schemas['SearchResponse'], Api.SearchResponse>>,
]

// ── Shop admin (src/types/shop-admin.ts) ────────────────────────────────────────────────────────────────
export type ShopAdminContracts = [
  // @ts-expect-error -- drift: status:missing
  Contract<Assignable<Schemas['ShopProfileResponse'], ShopAdmin.AdminShop>>,
  // @ts-expect-error -- drift: category_id:nullable, photos[].item_id:missing
  Contract<Assignable<Schemas['ItemResponse'], ShopAdmin.AdminItem>>,
  // @ts-expect-error -- drift: item.created_at:missing, item.source:missing, item.descriptions:missing, item.names:missing, item.category_id:nullable, item.brand_id:missing
  Contract<Assignable<Schemas['ShopListingResponse'], ShopAdmin.AdminShopListing>>,
  // @ts-expect-error -- drift: item:nullable
  Contract<Assignable<Schemas['UnifiedOfferResponse'], ShopAdmin.AdminOffer>>,
  Contract<Assignable<Schemas['ImportSyncResult'], ShopAdmin.ImportSyncResult>>,
  Contract<Assignable<Schemas['ImportPreviewResponse'], ShopAdmin.ImportPreview>>,
  Contract<Assignable<Schemas['ShopOwnerReviewOut'], ShopAdmin.ShopOwnerReview>>,
  Contract<Assignable<Schemas['ShopOwnerReviewPage'], ShopAdmin.ShopOwnerReviewPage>>,
  Contract<Assignable<Schemas['OnboardingSubmitResponse'], ShopAdmin.OnboardingSubmitResponse>>,
  Contract<Assignable<Schemas['CatalogCaseListItem'], ShopAdmin.CatalogCaseListItem>>,
  Contract<Assignable<Schemas['CatalogCaseSampleItem'], ShopAdmin.CatalogCaseSampleItem>>,
  Contract<Assignable<Schemas['PickerCategory'], ShopAdmin.PickerCategory>>,
  Contract<Assignable<Schemas['CategorySuggestion'], ShopAdmin.CategorySuggestion>>,
  Contract<Assignable<Schemas['OwnershipReviewSummary'], ShopAdmin.OwnershipReviewSummary>>,
  Contract<Assignable<Schemas['ClaimCandidateOut'], ShopAdmin.ClaimCandidate>>,
  Contract<Assignable<Schemas['ClaimCreateResponse'], ShopAdmin.ClaimCreateResponse>>,
  Contract<Assignable<Schemas['ClaimStatusResponse'], ShopAdmin.ClaimStatusResponse>>,
]
