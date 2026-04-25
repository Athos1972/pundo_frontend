---
id: shop-admin-product-offer-ui
title: Shop-Admin Produkt + Angebot anlegen (UI Golden Path)
status: deprecated
spec-file: e2e/journeys/shop-admin-offers.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: shop-admin-offers-catalogued-20260424
touches-modules:
  - src/app/(shop-admin)/**
  - src/components/shop-admin/**
  - src/app/(customer)/shops/[id]/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Offer.price_type:fixed
  - Offer.price_type:on_request
status-changed-at: 2026-04-24T14:00:00Z
status-changed-by-spec: unified-item-offer-model
last-run: 1970-01-01T00:00:00Z
last-result: N/A
last-run-sha: bc4e8ac89c083856c0eb12e76a581461f768787b
---

### DEPRECATED — Migriert nach `shop-admin-offers.spec.ts`

**Datum:** 2026-04-25
**Grund:** `shop-admin-product-offer-ui.spec.ts` gelöscht. Der einzige `describe.fixme`-Block
testete `/shop-admin/products/new` (jetzt Redirect-only) und das alte `product_id`/`price`-Schema.

**Was ersetzt UI-P1/UI-O1/UI-O2/UI-O3:**
- Angebote anlegen via UI: `shop-admin-offers.spec.ts` Gruppe A (A1–A6) und REGRESSION
- Kundensicht: `shop-admin-offers.spec.ts` Gruppe D (D1, D2) und SP4
