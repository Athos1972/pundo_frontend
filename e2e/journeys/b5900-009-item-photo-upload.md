---
id: b5900-009-item-photo-upload
title: Shop-Admin Artikel-Foto-Upload (B5900-009)
status: implemented
spec-file: e2e/journeys/b5900-009-item-photo-upload.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: 2026-10-13-e2e-isolation-hygiene
touches-modules:
  - src/components/shop-admin/OfferItemPhotos.tsx
  - src/components/shop-admin/ItemPhotoUpload.tsx
  - src/app/(shop-admin)/shop-admin/(portal)/offers/**
touches-roles:
  - shop-owner
  - customer
touches-states:
  - ItemPhoto.sort_order
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-e2e-isolation-hygiene
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: b5900-009-item-photo-upload

**Status:** implemented
**Priority:** P2
**Angelegt in:** B8950-012 (Katalog-Drift: Zeile verlinkte bisher auf die .spec.ts, es gab keine `<id>.md`)

## Purpose

Foto-Upload im Angebots-Flow (Schritt 2) und auf der Edit-Seite: Mehrfach-Upload, Titelbild, Löschen, Typ-/Limit-Fehler, Kundenseite, RTL (ar), Mobile. Läuft in einem eigenen Spec-Shop (specShop), damit der Admin-Shop-Delete auch die Foto-Dateien entfernt; AK5b strikt Index 0.

## Spec

`e2e/journeys/b5900-009-item-photo-upload.spec.ts` — Ablauf und Assertions stehen dort (Quelle der Wahrheit).

## Testdaten

Marker-Konvention `E2E-<RUN>-…` (siehe `docs/e2e-testing.md`); Aufräumen per `workerShop`/`specShop`/Tracker und Reporter.
