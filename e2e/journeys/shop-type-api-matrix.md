---
id: shop-type-api-matrix
title: API-Matrix alle 44 Shop-Unterarten (F6710)
status: implemented
spec-file: e2e/journeys/shop-type-api-matrix.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: e2e-auto-approve-shop-coverage-20260519
touches-modules:
  - src/lib/onboarding/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
touches-states:
  - ShopOwner.status:approved
  - Shop.provider_type:handwerker
  - Shop.provider_type:dienstleister
  - Shop.provider_type:haendler
  - Shop.provider_type:gastro
status-changed-at: 2026-05-19T00:00:00Z
status-changed-by-spec: e2e-auto-approve-shop-coverage-20260519
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: shop-type-api-matrix

**Status:** proposed
**Priority:** P2
**Proposed in:** e2e-auto-approve-shop-coverage-20260519

## Purpose

Parametrisierter API-Test (kein Browser) für alle 4 Provider-Types und ihre jeweils alle Unterarten (Domains). Stellt sicher, dass der komplette Onboarding-Flow für jede der 44 Domain-Unterarten funktioniert: Registrierung → Auto-Approve → Login → Onboarding mit Domain → Item anlegen → Shop-Abfrage.

**Domain-Anzahl pro Type:**
- `handwerker`: 12 (bodenbelag, dachdecker, elektriker, fliesenleger, klimatechnik-ac, klempner-sanitaer, maler-lackierer, maurer-bau, poolservice, schlosser-schluessel, schreiner-tischler, umzug-transport)
- `dienstleister`: 12 (buchhalter-steuer, fotograf, friseur, hundesalon, it-support, kosmetik-beauty, massage, nachhilfe, nagelstudio, rechtsanwalt, reinigung, umzugshelfer)
- `haendler`: 10 (apotheke, baeckerei-konditorei, baumaterial, blumenladen, elektronik-geraete, haushaltwaren, kleidung-mode, lebensmittel-supermarkt, metzgerei, spielzeug-hobby)
- `gastro`: 10 (asiatisch-sushi, baeckerei-cafe, bar-pub, cafe-kaffeehaus, fast-food, grill-bbq, pizzeria, restaurant-allgemein, strassenkueche, vegetarisch-vegan)

## Pre-conditions

- Test-Backend Port 8500
- `@pundo.com` Auto-Approve implementiert (Baustein A, F6710)
- `onboarding_domains` in `pundo_test` befüllt (44 Einträge)

## Test-Struktur

```
describe("handwerker — 12 Unterarten")  → 12 Tests
describe("dienstleister — 12 Unterarten") → 12 Tests
describe("haendler — 10 Unterarten")    → 10 Tests
describe("gastro — 10 Unterarten")      → 10 Tests
```

4 describe-Blöcke laufen parallel (`test.use({ workers: 4 })`), innerhalb sequenziell.

## Steps (je Domain)

1. `POST /api/v1/shop-owner/onboarding` mit `matrix-<domain>-<uuid>@pundo.com`, `provider_type`, `domain_slugs: [domain]`
2. Assert: Response `status: "approved"` (Auto-Approve)
3. `POST /api/v1/shop-owner/login` → JWT
4. `POST /api/v1/shop-owner/items` — Minimal-Item (Name, category_id)
5. `GET /api/v1/shops/<shop_id>` → Assert `provider_type` + domain korrekt
6. Cleanup: `DELETE /api/v1/admin/shop-owners/<id>`

## Cleanup

- `afterEach`: Shop-Owner löschen
- `afterAll` (failsafe): alle Accounts mit `matrix-*@pundo.com` via Admin-API löschen

## Notes

- Reine API-Tests (kein `page`-Fixture) — `test.use({ storageState: undefined })`
- Ziel-Laufzeit: < 90 Sekunden gesamt
- category_id für Items: erste verfügbare Kategorie via `GET /api/v1/categories` (gecacht für alle Tests)
