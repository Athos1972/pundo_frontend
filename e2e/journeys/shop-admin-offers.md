---
id: shop-admin-offers
title: Shop-Admin Angebote CRUD (UI + API)
status: implemented
spec-file: e2e/journeys/shop-admin-offers.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: shop-admin-offers-catalogued-20260424
touches-modules:
  - src/app/(shop-admin)/**
  - src/components/shop-admin/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Offer.status:active
  - Offer.status:archived
status-changed-at: 2026-04-24T14:00:00Z
status-changed-by-spec: unified-item-offer-model
last-run: 2026-04-24T14:00:00Z
last-result: FAIL
last-run-sha: bc4e8ac89c083856c0eb12e76a581461f768787b
---

### Journey: Shop-Admin Angebote CRUD

**Ziel:** Shop-Owner legt Angebote an (6 Kombinationen), bearbeitet und archiviert sie. Kunde sieht aktive Angebote auf der Shop-Seite.

**Gruppen:** A (Create 6 Kombinationen), B (Edit 4 Cases), C (Archive + Delete), D (Customer-Visibility).

**Finding F1 (offen):** `POST /shop-owner/products` Legacy-Endpoint versucht INSERT in `shop_owner_products` (Tabelle entfernt) → HTTP 500. Fixture-Setup schlägt fehl. Spec braucht Rewrite auf `/shop-owner/items` + `/shop-owner/shop-listings`.
