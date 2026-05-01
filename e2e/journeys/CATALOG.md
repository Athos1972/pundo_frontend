# Journey Catalog — pundo_frontend

> Quelle der Wahrheit. Jede Journey hat eine eigene Datei `e2e/journeys/<id>.md`.
> Pflegeregeln: siehe CATALOG_SCHEMA.md.
> Agents lesen und schreiben die einzelnen Journey-Dateien.
> User-Bestätigung (j/n) vor jeder Mutation außer last-run/last-result.

<!-- SCHEMA_VERSION: 1 -->

## Journeys

| ID | Title | Status | Priority | Last Result |
|---|---|---|---|---|
| [shop-owner-lifecycle](shop-owner-lifecycle.md) | Shop-Owner Lifecycle | implemented | P1 | PASS |
| [customer-discovery](customer-discovery.md) | Customer Discovery Flow | implemented | P2 | PASS |
| [shop-owner-full-lifecycle](shop-owner-full-lifecycle.md) | Shop-Owner Full Lifecycle + UI-Kombinations-Matrix | implemented | P1 | FAIL |
| [customer-and-review-lifecycle](customer-and-review-lifecycle.md) | Customer Auth + Interaction + Review Lifecycle | implemented | P2 | PASS |
| [admin-data-management](admin-data-management.md) | Admin Data Management Sweep | implemented | P3 | FAIL |
| [import-page-ac-check](import-page-ac-check.spec.ts) | Import Page Acceptance Criteria Check | implemented | P2 | PASS |
| [shop-admin-import-image-url](shop-admin-import-image-url.md) | Import image_url Async-Flow | implemented | P2 | PASS |
| [shop-admin-offers](shop-admin-offers.md) | Shop-Admin Angebote CRUD (UI + API) | implemented | P1 | PASS |
| [shop-owner-onboarding](shop-owner-onboarding.md) | Shop-Owner Onboarding: Register → Verify → Approve → Login | implemented | P1 | PASS |
| [shop-owner-quick-onboarding](shop-owner-quick-onboarding.md) | Shop-Owner Schnell-Onboarding Wizard (F5910) | approved | P1 | — |
| [social-link-moderation](social-link-moderation.md) | Social-Link-Moderation AC1–AC10 | implemented | P2 | PASS |
| [shop-admin-offer-product](shop-admin-offer-product.md) | Shop-Admin Angebot + Produkt-Verknüpfung (API-Matrix) — DEPRECATED | deprecated | P2 | — |
| [shop-admin-product-offer-ui](shop-admin-product-offer-ui.md) | Shop-Admin Produkt + Angebot anlegen (UI Golden Path) — DEPRECATED | deprecated | P2 | — |
| [state-transition-ItemStatus](state-transition-ItemStatus.md) | Item-Status-Transitions + Suchsichtbarkeit | approved | P1 | — |
| [write-to-read-createItem](write-to-read-createItem.md) | Write-to-Read: Item anlegen → Suche → Detailseite | approved | P1 | — |
| [shop-detail-attribute-matrix](shop-detail-attribute-matrix.md) | Shop-Detail Attribut-Matrix (2 Datenvarianten) | approved | P2 | — |
| [shop-admin-profile](shop-admin-profile.md) | Shop-Admin Profil — DEPRECATED | deprecated | P2 | — |
| [shop-admin-profile-phone-logo](shop-admin-profile-phone-logo.md) | Shop-Admin Phone + Logo — DEPRECATED | deprecated | P2 | — |

## Smoketest Coverage

> Single Source of Truth: [`smoketests/manifest.yaml`](../../smoketests/manifest.yaml)
>
> The smoketester (`smoketests/`) runs after every deployment against production (`pundo.cy`, `naidivse.cy`).
> It is **orthogonal** to this e2e suite — it tests breadth against live data, not depth against fixtures.
>
> **e2e-tester hook:** When a new customer journey touches a top-level route
> (`src/app/(customer)/**/page.tsx`), check whether the route has a manifest entry.
> Criterion: *Would failure of this section be noticed by a real user within 24 hours?*
> If yes → propose a manifest entry. If no → no action needed.

| Journey ID | Smoketest-worthy? | Manifest entry |
|---|---|---|
| customer-discovery | **Yes** | `home-anon`, `search-anon`, `shops-anon` |
| customer-and-review-lifecycle | Yes (read only) | `profile-after-login`, `login-flow` |
| shop-owner-onboarding | No — writes + registers | — |
| shop-owner-quick-onboarding | No — writes + registers | — |
| shop-owner-lifecycle | No — shop-admin scope, V1 scope | — |
| shop-owner-full-lifecycle | No — shop-admin scope, V1 scope | — |
| admin-data-management | No — admin area | — |
| import-page-ac-check | No — admin area | — |
| shop-admin-import-image-url | No — shop-admin area | — |
| shop-admin-offers | No — shop-admin area | — |
| social-link-moderation | No — admin area | — |
| state-transition-ItemStatus | Conditional — read-side only | later (V1.1) |
| write-to-read-createItem | No — writes data | — |
| shop-detail-attribute-matrix | **Yes** | `shop-detail-sample` |

**Manifest entries not tied to a journey (standalone smoke coverage):**

| Manifest entry | Route | Priority | Notes |
|---|---|---|---|
| `guides-list` | `/guides` | P0 | Regression guard: 2026-04-29 incident |
| `guide-detail-sample` | `/guides/<first>` | P0 | Dynamic resolve_first_item |
| `rtl-arabic` | `/` (lang: ar) | P1 | html[dir=rtl] assertion |
| `rtl-hebrew` | `/` (lang: he) | P1 | html[dir=rtl] assertion |
| `protected-profile-blocks-anon` | `/account` | P1 | Negative-auth check |
| `cookie-banner-shows` | `/` (fresh session) | P1 | Cookie consent UX |
| `language-switch-de-en` | `/` (lang: de) | P1 | Lang cookie + translation text |
| `product-detail-sample` | `/products/<first>` | P2 | Dynamic resolve_first_item |
