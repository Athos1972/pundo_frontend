---
id: state-transition-ItemStatus
title: Item-Status-Transitions + Suchsichtbarkeit
status: approved
spec-file: e2e/journeys/state-transition-ItemStatus.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: unified-item-offer-model-20260424
touches-modules:
  - src/app/(shop-admin)/**
  - src/types/shop-admin.ts
  - src/lib/shop-admin-api.ts
  - src/app/(customer)/search/**
  - src/app/(customer)/products/[slug]/**
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Item.status:active
  - Item.status:inactive
  - Item.status:draft
status-changed-at: 2026-04-24T14:00:00Z
status-changed-by-spec: unified-item-offer-model-20260424
last-run: 1970-01-01T00:00:00Z
last-result: N/A
---

### Journey: Item-Status-Transitions + Suchsichtbarkeit

**Ziel:** Verifiziert dass Item-Status-Übergänge die Customer-Sichtbarkeit korrekt steuern:
- `active` → Produkt erscheint in Suchergebnissen und Detailseite
- `inactive` → Produkt erscheint NICHT in Suche (404 oder leer)
- `draft` → Produkt erscheint NICHT in Suche

**Trigger:** Pflicht bei jedem Testlauf wenn `src/lib/shop-admin-api.ts` oder `src/types/shop-admin.ts` im Diff (P1 — Kernfunktion: Sichtbarkeitssteuerung).

**Daten-Varianten:** 3 getrennte Items, eine pro Status. Nie zusammenpappen.
