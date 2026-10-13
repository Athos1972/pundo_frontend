---
id: b5900-011-category-picker
title: Shop-Admin Kategorie-Picker: Vorschläge, Typfilter, RTL, 390 px, Kunden-Kategorie (B5900-011, F2970)
status: implemented
spec-file: e2e/journeys/b5900-011-category-picker.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: 2026-10-13-e2e-isolation-hygiene
touches-modules:
  - src/components/shop-admin/CategoryPicker.tsx
  - src/components/shop-admin/ItemCreateForm.tsx
touches-roles:
  - shop-owner
touches-states:
  - Item.category_id
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-e2e-isolation-hygiene
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: b5900-011-category-picker

**Status:** implemented
**Priority:** P1
**Angelegt in:** B8950-012 (Katalog-Drift: Zeile verlinkte bisher auf die .spec.ts, es gab keine `<id>.md`)

## Purpose

Kategorie-Picker beim Artikel-Anlegen: Vorschlag in einer Interaktion (EN/DE/EL), Typfilter Produkt/Dienstleistung, keine Dubletten/Fixtures, RTL (he), Eltern-Kategorie findet das Item, Mobile 390x844, F2970-Dienstleistungs-Vorschläge. Worker-Shop.

## Spec

`e2e/journeys/b5900-011-category-picker.spec.ts` — Ablauf und Assertions stehen dort (Quelle der Wahrheit).

## Testdaten

Marker-Konvention `E2E-<RUN>-…` (siehe `docs/e2e-testing.md`); Aufräumen per `workerShop`/`specShop`/Tracker und Reporter.
