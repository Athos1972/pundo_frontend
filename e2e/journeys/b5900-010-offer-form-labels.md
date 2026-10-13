---
id: b5900-010-offer-form-labels
title: Shop-Admin Angebotsformular Beschriftungen/Sprachen (B5900-010)
status: implemented
spec-file: e2e/journeys/b5900-010-offer-form-labels.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: 2026-10-13-e2e-isolation-hygiene
touches-modules:
  - src/components/shop-admin/OfferForm.tsx
  - src/components/shop-admin/ItemCreateForm.tsx
touches-roles:
  - shop-owner
  - customer
touches-states:
  - Item.names:el
  - Item.names:en
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-e2e-isolation-hygiene
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: b5900-010-offer-form-labels

**Status:** implemented
**Priority:** P2
**Angelegt in:** B8950-012 (Katalog-Drift: Zeile verlinkte bisher auf die .spec.ts, es gab keine `<id>.md`)

## Purpose

Beschriftungen (Legende „Art“, Preisarten auf Deutsch) und Namenssprache beim Anlegen (EL/EN) inkl. Kundenansicht. Worker-Shop, Marker E2E-<RUN>-B5900-010.

## Spec

`e2e/journeys/b5900-010-offer-form-labels.spec.ts` — Ablauf und Assertions stehen dort (Quelle der Wahrheit).

## Testdaten

Marker-Konvention `E2E-<RUN>-…` (siehe `docs/e2e-testing.md`); Aufräumen per `workerShop`/`specShop`/Tracker und Reporter.
