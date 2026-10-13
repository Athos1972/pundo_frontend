---
id: admin-catalog-review
title: Katalog-Review-Übersicht + Stichprobe + Approve/Reject-Rework (F5980)
status: implemented
spec-file: e2e/journeys/admin-catalog-review.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: 2026-10-13-e2e-isolation-hygiene
touches-modules:
  - src/app/(shop-admin)/shop-admin/(portal)/catalog-review/**
  - src/components/shop-admin/catalog-review/**
touches-roles:
  - shop-owner
touches-states:
  - CatalogCase.status:awaiting_owner_review
  - CatalogCase.status:published
  - CatalogCase.status:rework_in_progress
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-e2e-isolation-hygiene
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: admin-catalog-review

**Status:** implemented
**Priority:** P1
**Angelegt in:** B8950-012 (Katalog-Drift: Zeile verlinkte bisher auf die .spec.ts, es gab keine `<id>.md`)

## Purpose

Content-Review-UI der Auto-Kette: Intake-Batch (catalog_case_id) → describe/translate/categorize/attribute/embed (per Gateway 8600 mit Canned-Antworten) → Owner prüft Stichprobe → Approve (Publish-Gate) bzw. Reject → Rework-Loop. Läuft im Worker-Shop (Marker E2E-<RUN>-CATALOG-REVIEW). Ohne Gateway 8600 werden T0/T1/T2/T4 sichtbar mit Begründung übersprungen (B8950-012, Entscheidung 7).

## Spec

`e2e/journeys/admin-catalog-review.spec.ts` — Ablauf und Assertions stehen dort (Quelle der Wahrheit).

## Testdaten

Marker-Konvention `E2E-<RUN>-…` (siehe `docs/e2e-testing.md`); Aufräumen per `workerShop`/`specShop`/Tracker und Reporter.
