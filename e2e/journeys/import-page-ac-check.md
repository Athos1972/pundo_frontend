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
  - src/components/shop-admin/ImportPreview.tsx
  - src/components/shop-admin/ImportPreviewRow.tsx
  - src/components/shop-admin/ImportResult.tsx
  - src/components/shop-admin/useImportPreview.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - ShopListing.available:false (import)
status-changed-at: 2026-10-15T00:00:00Z
status-changed-by-spec: 2026-10-15-katalog-import-wiedererkennung-vorschau
last-run: 2026-10-15T19:30:00Z
last-result: PASS
last-run-sha: 9f50892
---

# Journey: import-page-ac-check

**Status:** implemented
**Priority:** P2
**Angelegt in:** B8950-012 (Katalog-Drift: Zeile verlinkte bisher auf die .spec.ts, es gab keine `<id>.md`)

## Purpose

Import-Seite. Teil 1 (rein lesend, globaler e2e-test-shop): Datei-Input-Accept, FieldCatalog (offen, Felder, RTL ar/he), Template-Download.

Teil 2 (F5920, schreibend, eigener Spec-Shop + zweiter Katalog-Shop): Upload -> **Vorschau** (nichts gespeichert, Abbrechen) -> Uebernehmen -> Angebotsliste (Label Import, SKU) -> **Kunden-Shop-Seite als Gast**; Wiedererkennung per SKU / EAN / Name (Gross-/Kleinschreibung), Preis-Historie, unveraenderte Zeile; **komplette Liste** (Haekchen: deaktiviert nur Import-Artikel, manuelle bleiben, Rueckkehr); moegliches Duplikat (Name + Foto des Kandidaten, Auswahl); Kategorie (Spalte / Vorschlag / Hinweis), Sprache aus Spalte bzw. UI-Sprache; doppelte SKU und Fehlerzeile (Uebernehmen gesperrt); abgelaufene Vorschau; SKU im Angebotsformular (Kollision); Vorlage (9 Spalten) und Feldkatalog in 6 Sprachen; Handy 390 px EL/AR (RTL); Ergebnis EL/AR; E13 (translate.item im Gateway-Test 8600, Skip mit Grund falls Gateway aus); E17 (import_max_rows, import_runs, 12/21 MB); Sheet-Sync-Status-Darstellung mit praepariertem Status (kein Live-Sheet).

## Spec

`e2e/journeys/import-page-ac-check.spec.ts` — Ablauf und Assertions stehen dort (Quelle der Wahrheit).

## Testdaten

Marker-Konvention `E2E-<RUN>-…` (Teil 2: Artikelnamen `Zq<8 hex> <label>`, damit die Aehnlichkeitssuche keine Kandidaten unter den Testdaten findet; Aufraeumen per Shop-Delete) (siehe `docs/e2e-testing.md`); Aufräumen per `workerShop`/`specShop`/Tracker und Reporter.
