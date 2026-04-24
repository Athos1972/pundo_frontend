---
id: shop-admin-product-offer-ui
title: Shop-Admin Produkt + Angebot anlegen (UI Golden Path)
status: implemented
spec-file: e2e/journeys/shop-admin-product-offer-ui.spec.ts
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

### Journey: Shop-Admin Produkt + Angebot — UI Golden Path

**Ziel:** Vollständiger UI-Flow: Neues Produkt anlegen → Angebot mit Preis → Angebot ohne Preis → Angebot mit Produkt verknüpft. Kunde sieht alle Varianten korrekt auf der Shop-Seite.

**Tests:** UI-P1 (Produkt anlegen), UI-O1 (Angebot mit Preis), UI-O2 (ohne Preis), UI-O3 (Produkt verknüpft).
