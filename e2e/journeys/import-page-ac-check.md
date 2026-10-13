---
id: import-page-ac-check
title: Import Page Acceptance Criteria Check
status: implemented
spec-file: e2e/journeys/import-page-ac-check.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: 2026-10-13-e2e-isolation-hygiene
touches-modules:
  - src/app/(shop-admin)/shop-admin/(portal)/import/**
  - src/components/shop-admin/ImportPanel.tsx
  - src/components/shop-admin/FieldCatalog.tsx
touches-roles:
  - shop-owner
touches-states:
  []
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-e2e-isolation-hygiene
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: import-page-ac-check

**Status:** implemented
**Priority:** P2
**Angelegt in:** B8950-012 (Katalog-Drift: Zeile verlinkte bisher auf die .spec.ts, es gab keine `<id>.md`)

## Purpose

Import-Seite: Datei-Input-Accept, FieldCatalog (offen, Felder, RTL ar/he), Template-Download. Rein lesend — nutzt den Owner-Login des globalen e2e-test-shop (storageState).

## Spec

`e2e/journeys/import-page-ac-check.spec.ts` — Ablauf und Assertions stehen dort (Quelle der Wahrheit).

## Testdaten

Marker-Konvention `E2E-<RUN>-…` (siehe `docs/e2e-testing.md`); Aufräumen per `workerShop`/`specShop`/Tracker und Reporter.
