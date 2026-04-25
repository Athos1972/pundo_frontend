---
id: shop-admin-offer-product
title: Shop-Admin Angebot + Produkt-Verknüpfung (API-Matrix)
status: deprecated
spec-file: e2e/journeys/shop-admin-offers.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: shop-admin-offers-catalogued-20260424
touches-modules:
  - src/app/(shop-admin)/**
  - src/app/(customer)/products/[slug]/**
  - src/app/(customer)/shops/[id]/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Offer.valid_from:past
  - Offer.valid_from:future
  - Offer.valid_until:expired
status-changed-at: 2026-04-24T14:00:00Z
status-changed-by-spec: unified-item-offer-model
last-run: 1970-01-01T00:00:00Z
last-result: N/A
last-run-sha: bc4e8ac89c083856c0eb12e76a581461f768787b
---

### DEPRECATED — Migriert nach `shop-admin-offers.spec.ts`

**Datum:** 2026-04-25
**Grund:** Spec-Datei `shop-admin-offer-product.spec.ts` wurde gelöscht. Die enthaltenen `describe.fixme`-Blöcke
verwendeten das alte `shop_owner_products`-API (product_id, price=). Dieses API existiert nicht mehr.

**Relevante Szenarien migriert nach `shop-admin-offers.spec.ts`:**
- Cross-Shop-Isolation (XS1, XS2)
- Archivierte Angebote (AR1)
- Staffelpreise (SP1–SP4)
- Datum-Edgecases (DT1, DT2)

**Nicht mehr relevant (gelöscht):**
- G3/G4/G5: Altes `price=`-Feld (neues Schema hat `price_tiers[]`)
- UI-P1/UI-O1/UI-O2/UI-O3: `/shop-admin/products/new` ist Redirect-only
