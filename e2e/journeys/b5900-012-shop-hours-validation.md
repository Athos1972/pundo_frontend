---
id: b5900-012-shop-hours-validation
title: Shop-Admin Öffnungszeiten-Validierung (B5900-012)
status: implemented
spec-file: e2e/journeys/b5900-012-shop-hours-validation.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: 2026-10-13-e2e-isolation-hygiene
touches-modules:
  - src/components/shop-admin/HoursEditor.tsx
  - src/app/(shop-admin)/shop-admin/(portal)/hours/**
touches-roles:
  - shop-owner
  - customer
touches-states:
  - Shop.opening_hours
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-e2e-isolation-hygiene
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: b5900-012-shop-hours-validation

**Status:** implemented
**Priority:** P2
**Angelegt in:** B8950-012 (Katalog-Drift: Zeile verlinkte bisher auf die .spec.ts, es gab keine `<id>.md`)

## Purpose

PUT /shop-owner/shop/hours lehnt offene Tage ohne Zeiten mit 422 ab; HoursEditor sendet keinen offenen Tag ohne Zeiten; Kundenseite rendert Bestandsdaten mit defektem Tag. Eigener Spec-Shop; psql nur auf dessen ID (DATABASE_URL_TEST nötig, sonst Fehler).

## Spec

`e2e/journeys/b5900-012-shop-hours-validation.spec.ts` — Ablauf und Assertions stehen dort (Quelle der Wahrheit).

## Testdaten

Marker-Konvention `E2E-<RUN>-…` (siehe `docs/e2e-testing.md`); Aufräumen per `workerShop`/`specShop`/Tracker und Reporter.
