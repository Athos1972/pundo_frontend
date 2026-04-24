---
id: shop-admin-profile-phone-logo
title: Shop-Admin Profil — Phone Field + Logo Upload
status: deprecated
spec-file: e2e/journeys/shop-admin-profile-phone-logo.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: shop-admin-profile-catalogued-20260424
touches-modules:
  - src/app/(shop-admin)/**
  - src/app/(customer)/shops/[id]/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - guest
skip-reason: "Phone-Teil ersetzt durch shop-detail-attribute-matrix Variante A. Logo-Upload braucht eigene Journey: shop-logo-upload."
status-changed-at: 2026-04-24T14:00:00Z
status-changed-by-spec: unified-item-offer-model-20260424
last-run: 1970-01-01T00:00:00Z
last-result: N/A
---

### Journey: Shop-Admin Phone + Logo — DEPRECATED

**Phone-Teil ersetzt durch:** [`shop-detail-attribute-matrix`](shop-detail-attribute-matrix.md) Variante A

**Logo-Upload** (Szenario D — JPEG/PDF/Oversized + UI-Tests) ist noch nicht durch eine andere Journey abgedeckt. Empfehlung: separate `shop-logo-upload` Journey anlegen wenn Logo-Upload-Feature weiterentwickelt wird.
