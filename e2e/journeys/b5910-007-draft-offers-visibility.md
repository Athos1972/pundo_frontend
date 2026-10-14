---
id: b5910-007-draft-offers-visibility
title: Onboarding-Vorschläge nicht freigeschalteter Shops sind öffentlich unsichtbar; Freigabe/Ablehnung (B5910-007)
status: implemented
spec-file: e2e/journeys/b5910-007-draft-offers-visibility.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-10-14-draft-offers-search-leak
touches-modules:
  - src/components/shop-admin/OfferList.tsx
  - src/lib/i18n/shop-admin-offers.ts
  - src/app/(customer)/**/shops/**
  - src/app/(customer)/**/products/**
  - src/app/(customer)/**/search/**
touches-roles:
  - customer
  - shop-owner
  - admin
touches-states:
  - ShopOwner.status:pending
  - ShopOwner.status:approved
  - ShopOwner.status:rejected
  - ShopListing.source:auto_seeded
  - ShopListing.available
last-run: 2026-10-14T00:00:00Z
last-result: PASS
last-run-sha: —
status-changed-at: 2026-10-14T00:00:00Z
status-changed-by-spec: 2026-10-14-draft-offers-search-leak
---

# Journey: b5910-007-draft-offers-visibility

## Was getestet wird (5 Tests, serial)
- **P1** Shop in Prüfung (`pending`): Vorschläge in Suche (ru/en), `/products?shop_id`, Produktdetail, Shop-Detail, Kunden-UI nicht sichtbar; Shop selbst sichtbar (D3); Sitemap ohne Shop.
- **P2** Owner (Fixture: Status kurz per psql auf `approved`, weil `pending` nicht einloggen kann): Knopf „Keep/Übernehmen/…" + Tooltip in 6 Sprachen, alter „Aktivieren"-Text fehlt; Übernehmen (UI), Preis bearbeiten, Archivieren+Löschen (UI); danach wieder `pending`, weiter unsichtbar.
- **P3** Admin schaltet frei (D4): übernommener, bearbeiteter (12.50) und unbearbeitete Vorschläge sichtbar, gelöschter nicht.
- **P4** Ablehnung (D3): Angebote unsichtbar, Shop in Detail/Liste/UI sichtbar.
- **P5** Regression: `anna-s-bakery` / `o-phournos-tes-annas` mit Preis 2.50, gescrapter Shop ohne Owner unverändert.

Ergänzend: `service-catalog-auto-assign` Schritt S3b (vor/nach Freigabe).

## Fixtures
Zwei Marker-Shops (Bäckerei+Metzgerei bzw. Bäckerei, Limassol), Cleanup per Admin-Shop-Delete. Nur 3500/8500, `pundo_test`.
