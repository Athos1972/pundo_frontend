# Journey Catalog — pundo_frontend

> Quelle der Wahrheit. Jede Journey hat eine eigene Datei `e2e/journeys/<id>.md`.
> Pflegeregeln: siehe CATALOG_SCHEMA.md.
> Agents lesen und schreiben die einzelnen Journey-Dateien.
> User-Bestätigung (j/n) vor jeder Mutation außer last-run/last-result.

<!-- SCHEMA_VERSION: 1 -->

## Journeys

| ID | Title | Status | Priority | Last Result |
|---|---|---|---|---|
| [shop-owner-admin-approval-flow](shop-owner-admin-approval-flow.md) | Shop-Owner Admin-Approval via Browser-UI | implemented | P1 | PASS (9/9, 2026-10-18) |
| [customer-discovery](customer-discovery.md) | Customer Discovery Flow | implemented | P2 | PASS |
| [activity-feed-bot-filter](activity-feed-bot-filter.md) | Activity-Feed Bot-Filter und Prefetch-Unterdrückung (F6998) | implemented | P2 | PASS (10/10, 2026-10-17) |
| [shop-owner-full-lifecycle](shop-owner-full-lifecycle.md) | Shop-Owner Full Lifecycle + UI-Kombinations-Matrix | implemented | P1 | PASS |
| [customer-and-review-lifecycle](customer-and-review-lifecycle.md) | Customer Auth + Interaction + Review Lifecycle | implemented | P2 | PASS |
| [shop-owner-reviews-reply-report](shop-owner-reviews-reply-report.md) | Shop-Owner Bewertungen: Antworten, Melden, Moderation (F5930) | implemented | P2 | — |
| [admin-data-management](admin-data-management.md) | Admin Data Management Sweep | implemented | P3 | PASS |
| [admin-shop-create-delete](admin-shop-create-delete.md) | Admin Shop Create + Delete (UI Golden Path) | implemented | P2 | PASS |
| [import-page-ac-check](import-page-ac-check.md) | Import Page Acceptance Criteria Check (F5920: Vorschau, Wiedererkennung, komplette Liste, Kundensicht) | implemented | P2 | PASS (26/26, 2026-10-15) |
| [shop-admin-import-image-url](shop-admin-import-image-url.md) | Import image_url Async-Flow (F5920: Vorschau-Schritt, Foto-Schutz) | implemented | P2 | PASS (5/5, 1 skip, 2026-10-15) |
| [shop-admin-import-all-or-nothing](shop-admin-import-all-or-nothing.md) | Katalog-Import alles-oder-nichts, Zeilenfehler uebersetzt, Foto-Dedup (B5900-030) | implemented | P2 | PASS (15/15, 2026-10-15) |
| [shop-admin-offers](shop-admin-offers.md) | Shop-Admin Angebote CRUD (UI + API) | implemented | P1 | PASS (2026-10-18) |
| [shop-owner-onboarding](shop-owner-onboarding.md) | Shop-Owner Onboarding: Register → Verify → Approve → Login | implemented | P1 | PASS |
| [shop-owner-quick-onboarding](shop-owner-quick-onboarding.md) | Shop-Owner Schnell-Onboarding Wizard (F5910) | implemented | P1 | PASS (2026-10-18, T13-T15 neu) |
| [shop-owner-catalog-consent](shop-owner-catalog-consent.md) | Katalog-Onboarding-Zustimmung im Wizard und im Portal (F5980 AC1) | implemented | P1 | PASS (6/6, 2026-10-18) |
| [shop-owner-google-onboarding-resume](shop-owner-google-onboarding-resume.md) | Google-Onboarding-Resume ueber den Next-Proxy (B5910-010) | implemented | P1 | PASS (3/3, 2026-10-18) |
| [social-link-moderation](social-link-moderation.md) | Social-Link-Moderation AC1–AC10 | implemented | P1 | PASS |
| [shop-admin-offer-product](shop-admin-offer-product.md) | Shop-Admin Angebot + Produkt-Verknüpfung (API-Matrix) — DEPRECATED | deprecated | P2 | — |
| [shop-admin-product-offer-ui](shop-admin-product-offer-ui.md) | Shop-Admin Produkt + Angebot anlegen (UI Golden Path) — DEPRECATED | deprecated | P2 | — |
| [state-transition-ItemStatus](state-transition-ItemStatus.md) | Item-Status-Transitions + Suchsichtbarkeit | approved | P1 | — |
| [write-to-read-createItem](write-to-read-createItem.md) | Write-to-Read: Item anlegen → Suche → Detailseite | approved | P1 | — |
| [shop-detail-attribute-matrix](shop-detail-attribute-matrix.md) | Shop-Detail Attribut-Matrix (2 Datenvarianten) | approved | P2 | — |
| [service-catalog-auto-assign](service-catalog-auto-assign.md) | Service-Katalog Auto-Assign: Badge + Admin IDM CRUD + Journey S4–S7 | implemented | P1 | PASS |
| [b5910-007-draft-offers-visibility](b5910-007-draft-offers-visibility.md) | Onboarding-Vorschläge nicht freigeschalteter Shops öffentlich unsichtbar (B5910-007) | implemented | P1 | PASS (8/8, 2026-10-18) |
| [public-route-visibility-blog](public-route-visibility-blog.md) | Blog-Seite Sichtbarkeit + Soro-Embed | approved | P2 | — |
| [shop-admin-product-crud](shop-admin-product-crud.md) | Shop-Admin Produkt-CRUD (F6710) | implemented | P2 | — |
| [customer-shop-promo-visibility](customer-shop-promo-visibility.md) | Kunden-Sicht Shop-Aktionen (Aktionsblock vs. Produktblock) | implemented | P2 | — |
| [customer-extended](customer-extended.md) | Customer Favorites + Profil-Deaktivierung + MCP-Tab (F6710) | implemented | P2 | — |
| [category-discovery](category-discovery.md) | Category Discovery Flow (F2350) | approved | P2 | — |
| [reactive-language-switch](reactive-language-switch.md) | Reaktive Sprachnavigation: Labels ohne Reload (E2E-08) | implemented | P1 | PASS |
| [cookie-consent-flow](cookie-consent-flow.md) | Cookie Consent Gate + Meta-Pixel Load/Block (F7500) | implemented | P1 | PASS |
| [customer-shop-all-products-flow](customer-shop-all-products-flow.md) | Customer Shop-Detail → "Alle" → Suchergebnisse mit shop_id; Schritt E: best_offer nur vom eigenen Shop (B5900-016) | implemented | P2 | PASS (11/11, 2026-10-14) |
| [shop-owner-self-deactivate](shop-owner-self-deactivate.md) | Shop-Owner Self-Deactivate (Danger Zone) | implemented | P1 | PASS |
| [admin-crm-contact-lifecycle](admin-crm-contact-lifecycle.md) | CRM Contact Lifecycle (F7600 Stufe 0+1) — Create → Edit → Channel Mgmt → Confirm → Suppress | implemented | P1 | PASS |
| [llm-effects-homesick-spotted](llm-effects-homesick-spotted.md) | LLM-Wirkung Homesick und Spotted ueber Gateway und Golden-Worker bis DB und Mail (B8950-016 T14) | implemented | P1 | PASS |
| [crm-opt-out](crm-opt-out.md) | CRM-Outreach-Mail im Mail-Sink und Opt-out-Link wirkt (B8950-016 T31/T32) | implemented | P1 | PASS |
| [admin-crm-needs-review](admin-crm-needs-review.md) | CRM NEEDS_REVIEW Flow (F7600 Stufe 2) — Card Confirm + CardImageViewer Visibility | implemented | P1 | PASS |
| [admin-crm-persons](admin-crm-persons.md) | F7600 CRM Stufe 3 — Personen und Rollen | implemented | P1 | PASS (2026-10-23) |
| [shop-city-hub-and-completeness](shop-city-hub-and-completeness.md) | Shop Städte-Hub + Completeness-Policy (B5900-006, B5900-007) | implemented | P2 | PASS |
| [admin-catalog-review](admin-catalog-review.md) | Katalog-Review-Übersicht + Stichprobe + Approve/Reject-Rework (F5980 Autonomous Shop Commerce Brain) | implemented | P1 | PASS (47/47 inkl. smoke, 2026-10-19; T1b Wirkung + T6 Teilfehler, F5982; Gateway :8600 nötig, sonst sichtbarer Skip) |
| [b5900-009-item-photo-upload](b5900-009-item-photo-upload.md) | Shop-Admin Artikel-Foto-Upload (B5900-009) | implemented | P2 | PASS (2026-10-12) |
| [b5900-010-offer-form-labels](b5900-010-offer-form-labels.md) | Shop-Admin Angebotsformular Beschriftungen/Sprachen (B5900-010) | implemented | P2 | PASS (2026-10-12) |
| [b5900-011-category-picker](b5900-011-category-picker.md) | Shop-Admin Kategorie-Picker: Vorschläge, Typfilter, RTL, 390 px, Kunden-Kategorie (B5900-011) | implemented | P1 | PASS (10/10, 2026-10-12) |
| [b5900-012-shop-hours-validation](b5900-012-shop-hours-validation.md) | Shop-Admin Öffnungszeiten-Validierung (B5900-012) | implemented | P2 | PASS (AK2 skip ohne DATABASE_URL_TEST) |
| [b5950-001-second-opening-slot](b5950-001-second-opening-slot.md) | Zweites Öffnungszeitfenster Kundensicht + is_open_now (B5950-001) | implemented | P2 | PASS (7/7, 2026-10-13) |
| [b5900-013-null-price-display](b5900-013-null-price-display.md) | Kundenseiten zeigen nie "null/None/NaN EUR" bei Angeboten ohne Zahlpreis; 6 Sprachen, RTL (B5900-013) | implemented | P2 | PASS (6/6, 2026-10-13) |
| [customer-offer-price-tiers](customer-offer-price-tiers.md) | Staffelpreise & Einheiten in der Kundensicht: Produktseite + Shop-Seite, mit/ohne Aktion, 6 Sprachen, RTL, 390 px (F5200) | implemented | P2 | PASS (11/11, 2026-10-13) |
| [consumer-service-discovery](consumer-service-discovery.md) | Endkunden-Dienstleistung: Listing → Kundensuche (6 Sprachen) → Anbieterliste (F2970) | implemented | P1 | PASS (3/3, 2026-10-18) |
| [consumer-service-eldercare-w4](consumer-service-eldercare-w4.md) | F2970 Welle 4: Seniorenbetreuung (px-eldercare) in der Kundensuche, 6 Sprachen, Abgrenzung, RTL 390 px | implemented | P2 | PASS (9/9, 2026-10-13) |
| [shop-claim-self-service](shop-claim-self-service.md) | Shop-Claim per Self-Service (Domain-/Code-Nachweis), Admin-Entscheid, Superseded (F5970) | implemented | P1 | PASS (12/12, 2026-10-18) |
| [shop-claim-dispute](shop-claim-dispute.md) | Shop-Claim Dispute: Dokument, Rückruf, Owner-Wechsel, Sperre, Angebote zu prüfen, assign-owner, Matching-Tab (F5970) | implemented | P1 | PASS (14/14, 2026-10-18) |
| [contact-form](contact-form.md) | Kontaktformular senden (6 Sprachen), Captcha-Fehler, Rate-Limit (B6220-003) | implemented | P2 | PASS (10/10 dev 3500 + 10/10 Standalone-Build, 2026-10-13) |
| [privacy-request-guest-to-admin](privacy-request-guest-to-admin.md) | Datenschutzanfrage ohne Konto: Formular, Bestätigung, Admin-Fall, Export-Download, Negativauskunft (F6110 Betroffenenrechte) | approved | P1 | — |
| [privacy-self-service-export](privacy-self-service-export.md) | Selbstbedienung Datenkopie Kunde und Shop-Besitzer, Fremdzugriff gesperrt, Ablauf (F6110 Betroffenenrechte) | approved | P1 | — |
| [privacy-erasure-cross-role](privacy-erasure-cross-role.md) | Löschung über alle Rollen mit Vorschau, Abschlussmail und Wirkung je Kategorie (F6110 Betroffenenrechte) | approved | P1 | — |
| [privacy-admin-case-handling](privacy-admin-case-handling.md) | Admin-Fallbearbeitung: E-Mail-Eingang, Fristen, Alarm, Verlängerung, Ablehnung, Berichtigung, Rollen, Kennzahlen (F6110 Betroffenenrechte) | approved | P1 | — |
| [privacy-restriction-and-objection](privacy-restriction-and-objection.md) | Einschränkung und Widerspruch wirken auf Outreach, Benachrichtigung und Retention (F6110 Betroffenenrechte) | approved | P1 | — |

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
| shop-claim-self-service | No — writes + registers | — |
| shop-claim-dispute | No — admin area, writes + registers | — |
| shop-owner-full-lifecycle | No — shop-admin scope, V1 scope | — |
| admin-data-management | No — admin area | — |
| import-page-ac-check | No — admin area | — |
| shop-admin-import-image-url | No — shop-admin area | — |
| shop-admin-offers | No — shop-admin area | — |
| shop-admin-product-crud | No — shop-admin area | — |
| customer-shop-promo-visibility | Conditional — promo only shows when active data exists | later (V1.1) |
| customer-extended | No — writes + account-deletion | — |
| social-link-moderation | No — admin area | — |
| state-transition-ItemStatus | Conditional — read-side only | later (V1.1) |
| write-to-read-createItem | No — writes data | — |
| shop-detail-attribute-matrix | **Yes** | `shop-detail-sample` |
| customer-shop-all-products-flow | **Yes** | `shop-all-products-link` (vorschlagen) |
| shop-owner-self-deactivate | No — writes + account-deactivation | — |
| admin-crm-contact-lifecycle | No — admin area, writes CRM contacts | — |
| llm-effects-homesick-spotted | No — writes customer, spotted item/offer in pundo_test, mail goes to the local sink | — |
| crm-opt-out | No — writes CRM contacts in pundo_test, mail goes to the local sink | — |
| admin-crm-needs-review | No — admin area, writes CRM contacts | — |

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
