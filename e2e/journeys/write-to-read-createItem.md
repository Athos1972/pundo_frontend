---
id: write-to-read-createItem
title: Write-to-Read: Item anlegen → Suche → Detailseite
status: approved
spec-file: e2e/journeys/write-to-read-createItem.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: unified-item-offer-model-20260424
touches-modules:
  - src/lib/shop-admin-api.ts
  - src/app/(shop-admin)/**
  - src/app/(customer)/products/[slug]/**
  - src/app/(customer)/search/**
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Item.status:active
  - ShopListing.available:true
status-changed-at: 2026-04-24T14:00:00Z
status-changed-by-spec: unified-item-offer-model-20260424
last-run: 1970-01-01T00:00:00Z
last-result: N/A
---

### Journey: Write-to-Read — Item anlegen → Customer-Discovery

**Ziel:** Vollständige Kette: Shop-Owner legt Item via `createItem()` an → ShopListing + UnifiedOffer erzeugen → Item erscheint für Guest-Nutzer in Suche und Detailseite.

**Trigger:** Pflicht wenn `createItem`, `ShopListing`, `UnifiedOffer` oder zugehörige Routes im Diff (P1 — Kernkette des neuen Datenmodells).

**Abgrenzung:** Kein UI-Test — API-Level via `shop-admin-api.ts`. UI Golden Path → `shop-admin-product-offer-ui`.
