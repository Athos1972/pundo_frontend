---
id: b5900-013-null-price-display
title: Kundenseiten zeigen nie „null/None/NaN EUR“ bei Angeboten ohne Zahlpreis (B5900-013)
status: implemented
spec-file: e2e/journeys/b5900-013-null-price-display.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: 2026-10-13-e2e-isolation-hygiene
touches-modules:
  - src/components/product/**
  - src/app/(customer)/**/products/**
  - src/app/(customer)/**/shops/**
touches-roles:
  - customer
touches-states:
  - Offer.price_type:fixed
  - Offer.price_type:on_request
  - Offer.price_type:free
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-e2e-isolation-hygiene
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: b5900-013-null-price-display

**Status:** implemented
**Priority:** P2
**Angelegt in:** B8950-012 (Katalog-Drift: Zeile verlinkte bisher auf die .spec.ts, es gab keine `<id>.md`)

## Purpose

Shop-Seite, Suche und Produktdetail zeigen bei fixed-Angeboten ohne Preis „No price listed“, bei on_request/free die Labels; 6 Sprachen, RTL. Worker-Shop, Marker E2E-<RUN>-B5900-013.

## Spec

`e2e/journeys/b5900-013-null-price-display.spec.ts` — Ablauf und Assertions stehen dort (Quelle der Wahrheit).

## Testdaten

Marker-Konvention `E2E-<RUN>-…` (siehe `docs/e2e-testing.md`); Aufräumen per `workerShop`/`specShop`/Tracker und Reporter.
