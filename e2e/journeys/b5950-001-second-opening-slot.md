---
id: b5950-001-second-opening-slot
title: Zweites Öffnungszeitfenster in Kundensicht + is_open_now (B5950-001)
status: implemented
spec-file: e2e/journeys/b5950-001-second-opening-slot.spec.ts
priority: P2
owner-agent: e2e-tester
proposed-in-spec: 2026-10-13-second-opening-slot
touches-modules:
  - src/app/(customer)/[lang]/shops/[slug]/page.tsx
  - src/lib/shop-opening-hours.ts
  - src/lib/structured-data.ts
touches-roles:
  - shop-owner
  - customer
touches-states:
  - Shop.opening_hours
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-second-opening-slot
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: b5950-001-second-opening-slot

**Status:** implemented
**Priority:** P2

## Purpose

Owner pflegt Mittagspause (zwei Fenster pro Tag); Kunden sehen beide Fenster (en/de/el/ar/he, 390 px, RTL), JSON-LD enthält beide, `is_open_now`/Filter `open_now` berücksichtigen das zweite Fenster.

## Spec

`e2e/journeys/b5950-001-second-opening-slot.spec.ts` — Quelle der Wahrheit. Eigener Spec-Shop (specShop), Teardown löscht ihn.

## Hinweis

Beim Anlegen nicht per Playwright ausgeführt (Auftrag untersagte neue Shops); gleichwertige Prüfung manuell am Demo-Shop, siehe 04-test-report.
