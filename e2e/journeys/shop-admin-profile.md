---
id: shop-admin-profile
title: Shop-Admin Profil (Öffnungszeiten, Social Links, Kontakt)
status: deprecated
spec-file: e2e/journeys/shop-admin-profile.spec.ts
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
skip-reason: "Ersetzt durch shop-detail-attribute-matrix (2 Datenvarianten). Spec-Datei bleibt bis Migrationsentscheidung."
status-changed-at: 2026-04-24T14:00:00Z
status-changed-by-spec: unified-item-offer-model-20260424
last-run: 1970-01-01T00:00:00Z
last-result: N/A
---

### Journey: Shop-Admin Profil — DEPRECATED

**Ersetzt durch:** [`shop-detail-attribute-matrix`](shop-detail-attribute-matrix.md)

Ursprünglicher Scope: Öffnungszeiten, Social Links, Kontaktfelder befüllen und in Customer-Sicht verifizieren (Szenario A: Tabula Rasa, Szenario B: Edit-Flow).
