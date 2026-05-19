---
id: shop-admin-product-crud
title: Shop-Admin Produkt-CRUD + Foto-Upload (F6710)
status: implemented
spec-file: e2e/journeys/shop-admin-product-crud.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: e2e-auto-approve-shop-coverage-20260519
touches-modules:
  - src/app/(shop-admin)/shop-admin/(portal)/products/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
touches-states:
  - Item.available:false
  - Item.available:true
  - Item.source:auto_seeded
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

Vollständiger Browser-Test aller Shop-Admin-Produkt-Funktionen:
- Produkt anlegen (Name, Kategorie, Preis)
- Foto hochladen (JPEG/PNG/WebP, max 5 MB)
- Preis anpassen
- Kategorie wechseln
- Zweites Produkt anlegen
- Produkt löschen
- Template-Produkte aus Onboarding (auto_seeded) prüfen

## Pre-conditions

- Test-Backend Port 8500, Test-Frontend Port 3500
- `@pundo.com` Auto-Approve implementiert (Baustein A, F6710)
- Template-Produkte implementiert (Baustein B, F6710) — optional, Test skippt wenn nicht vorhanden

## Steps

### T1: Login + Dashboard
1. Shop-Owner anlegen: `POST /api/v1/shop-owner/onboarding` mit `crud-<uuid>@pundo.com` → Auto-Approve
2. Browser: `/shop-admin/login` → einloggen → Dashboard sichtbar (kein Redirect)

### T2: Produkt anlegen
1. Navigiere zu `/shop-admin/products/new`
2. Name eingeben, Kategorie auswählen, `price_type` = fixed, Preis = 50
3. Speichern → Redirect auf Produktliste
4. Assert: neues Produkt in Liste sichtbar

### T3: Foto hochladen
1. Produkt öffnen → Foto-Upload-Input
2. `setInputFiles` mit 1×1 Pixel PNG (zur Laufzeit generiert, < 1 KB)
3. Speichern → Vorschau sichtbar
4. Page reload → Foto noch vorhanden

### T4: Preis anpassen
1. Produkt bearbeiten → Preis auf 75 ändern
2. Speichern → Preis in Liste = 75

### T5: Kategorie wechseln
1. Produkt bearbeiten → andere Kategorie auswählen
2. Speichern → neue Kategorie in Produktdetail sichtbar

### T6: Zweites Produkt + Löschen
1. Zweites Produkt anlegen (`price_type=on_request`) → Liste zeigt 2 Produkte
2. Erstes Produkt löschen (+ Bestätigung) → Liste zeigt 1 Produkt

### T7: Template-Produkte (optional)
1. Falls Baustein B implementiert: Dashboard zeigt ≥ 1 Item mit `source=auto_seeded`
2. Template-Item bearbeiten und auf `available=true` setzen → öffentlich sichtbar

## Cleanup

`afterAll`: Shop-Owner + alle angelegten Items via Admin-API löschen

## Notes

- Test-PNG: `Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')` (1×1 transparent PNG)
- Foto-Upload: `POST /api/v1/shop-owner/items/{id}/photos` — multipart/form-data, field `file`, max 5 MB
- T7 ist guard-gecodet: `if (await page.locator('[data-source="auto_seeded"]').count() > 0)`
