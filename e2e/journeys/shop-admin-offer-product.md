---
id: shop-admin-offer-product
title: Shop-Admin Angebot + Produkt-Verknüpfung (API-Matrix)
status: implemented
spec-file: e2e/journeys/shop-admin-offer-product.spec.ts
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

### Journey: Shop-Admin Angebot + Produkt-Verknüpfung

**Ziel:** Vollständige API-Level-Matrix für Offer+Product-Workflows: Ablauf-Sichtbarkeit (A), Mehrfach-Angebote + Cross-Shop-Isolation (B), Price-History (C), Edge Cases (D), Backend-Validation FK-Guard (E).

**RCA (2026-04-24):** `product_id`-FK-Violation (HTTP 500) → Backend-Fix: `_validate_product_ownership()` gibt jetzt HTTP 422 zurück. Beide POST und PATCH validieren Product Ownership.
