---
id: shop-admin-product-crud
title: Shop-Admin Produkt-CRUD (F6710)
status: implemented
spec-file: e2e/journeys/shop-admin-product-crud.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: e2e-auto-approve-shop-coverage-20260519
touches-modules:
  - src/app/(shop-admin)/shop-admin/(portal)/offers/**
  - src/components/shop-admin/ItemCreateForm.tsx
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
touches-states:
  - Item.available:false
  - Item.available:true
status-changed-at: 2026-05-19T00:00:00Z
status-changed-by-spec: e2e-auto-approve-shop-coverage-20260519
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: shop-admin-product-crud

**Status:** proposed
**Priority:** P2
**Proposed in:** e2e-auto-approve-shop-coverage-20260519

## Purpose

Browser-/API-Test der Shop-Admin-Produktanlage nach dem Unified-Item-&-Offer-Modell:
- Dashboard nach Auto-Approve (`@pundo.com`) erreichbar
- Produkt anlegen (Name, Kategorie) → 201, im Offer-Picker auffindbar
- Offer-Flow erreichbar
- Zweites Produkt anlegen

**Entfernt (B8950-012, 2026-10-13), jeweils mit Begründung:**
- T3 Foto hochladen — `/shop-admin/products/[id]/edit` ist nur noch ein Redirect auf `/shop-admin/offers`, es gibt dort kein
  `input[type=file]` (der Test lief als stilles Skip). Foto-Upload lebt im Angebots-Flow (`OfferItemPhotos.tsx`) und ist durch
  `b5900-009-item-photo-upload` abgedeckt.
- T5 Kategorie wechseln + Löschen in T6 — die Owner-API hat weder `PATCH` noch `DELETE /shop-owner/items/{id}`; der Test
  akzeptierte 404/405 als SKIP/WARN. Kategorie-Auswahl: `b5900-011-category-picker`.
- T7 Template-Produkte (`auto_seeded`) — Baustein B (F6710) wurde nie gebaut; entfernt statt Quarantäne.

## Pre-conditions

- Test-Backend Port 8500, Test-Frontend Port 3500
- `@pundo.com` Auto-Approve implementiert (Baustein A, F6710)

## Steps

### T1: Login + Dashboard
1. Shop-Owner anlegen: `POST /api/v1/shop-owner/onboarding` mit `e2e-<run>-crud-<rand>@pundo.com` → Auto-Approve
2. Browser: Owner-Cookie setzen → Dashboard sichtbar (kein Redirect)

### T2: Produkt anlegen
1. `POST /api/v1/shop-owner/items` (`name_de` mit Marker `E2E-<RUN>-CRUD-…`, Kategorie) → 201
2. `/shop-admin/offers` lädt, Link "neues Angebot" sichtbar

### T4: Offer-Flow
1. `/shop-admin/offers/new` → Item-Picker öffnen, Item-Name suchen
2. Assert: angelegtes Produkt in der Trefferliste

### T6: Zweites Produkt
1. Zweites Item anlegen → 201, andere ID

## Aufräumen
Admin-Shop-Delete (kaskadiert Owner) + Admin-Item-Delete der getrackten Items (`tracker.cleanup()`).
