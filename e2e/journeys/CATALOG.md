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
| [customer-discovery](customer-discovery.md) | Customer Discovery Flow | implemented | P2 | FAIL |
| [shop-owner-full-lifecycle](shop-owner-full-lifecycle.md) | Shop-Owner Full Lifecycle + UI-Kombinations-Matrix | implemented | P1 | PASS |
| [customer-and-review-lifecycle](customer-and-review-lifecycle.md) | Customer Auth + Interaction + Review Lifecycle | implemented | P2 | PASS |
| [admin-data-management](admin-data-management.md) | Admin Data Management Sweep | implemented | P3 | FAIL |
| [import-page-ac-check](import-page-ac-check.spec.ts) | Import Page Acceptance Criteria Check | implemented | P2 | PASS |
| [shop-admin-import-image-url](shop-admin-import-image-url.md) | Import image_url Async-Flow | implemented | P2 | FAIL |
| [shop-admin-offers](shop-admin-offers.md) | Shop-Admin Angebote CRUD (UI + API) | implemented | P1 | FAIL |
| [shop-admin-offer-product](shop-admin-offer-product.md) | Shop-Admin Angebot + Produkt-Verknüpfung (API-Matrix) | implemented | P2 | — |
| [shop-admin-product-offer-ui](shop-admin-product-offer-ui.md) | Shop-Admin Produkt + Angebot anlegen (UI Golden Path) | implemented | P2 | — |
| [state-transition-ItemStatus](state-transition-ItemStatus.md) | Item-Status-Transitions + Suchsichtbarkeit | approved | P1 | — |
| [write-to-read-createItem](write-to-read-createItem.md) | Write-to-Read: Item anlegen → Suche → Detailseite | approved | P1 | — |
| [shop-detail-attribute-matrix](shop-detail-attribute-matrix.md) | Shop-Detail Attribut-Matrix (2 Datenvarianten) | approved | P2 | — |
| [shop-admin-profile](shop-admin-profile.md) | Shop-Admin Profil — DEPRECATED | deprecated | P2 | — |
| [shop-admin-profile-phone-logo](shop-admin-profile-phone-logo.md) | Shop-Admin Phone + Logo — DEPRECATED | deprecated | P2 | — |
