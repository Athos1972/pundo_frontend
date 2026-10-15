---
id: shop-admin-import-all-or-nothing
title: Katalog-Import alles-oder-nichts, Zeilenfehler uebersetzt, Foto-Dedup (B5900-030)
status: implemented
spec-file: e2e/journeys/shop-admin-import-all-or-nothing.spec.ts
priority: P2
owner-agent: e2e-tester
proposed-in-spec: 2026-10-15-import-sync-and-help
touches-modules:
  - src/components/shop-admin/ImportPanel.tsx
  - src/components/shop-admin/ImportRowErrorList.tsx
  - src/components/shop-admin/useImportStatusPolling.ts
  - src/components/shop-admin/ImportPreview.tsx
  - src/components/shop-admin/ImportPreviewRow.tsx
  - src/components/shop-admin/useImportPreview.ts
touches-roles:
  - shop-owner
touches-states:
  []
status-changed-at: 2026-10-15T00:00:00Z
status-changed-by-spec: 2026-10-15-katalog-import-wiedererkennung-vorschau
last-run: 2026-10-15T19:30:00Z
last-result: PASS
last-run-sha: 9f50892
---

# Journey: shop-admin-import-all-or-nothing

**F5920 (2026-10-15):** Der Upload fuehrt jetzt ueber die Vorschau (Design F5920 Flow A). Die Tests erwarten daher Datei waehlen -> Vorschau -> „Apply“ -> Ergebnis; Fehlerdateien zeigen die Fehlerzeilen in der Vorschau, „Apply“ ist gesperrt, nichts gespeichert (Sperr-Hinweis in en/el/ar). Neu: AK7 (F5920 AK23: 1 fehlerhafte + 9 gueltige Zeilen, en/el/ar), AK8 (F5920 AK17: doppelte SKU), AK9 (korrigierte Datei wird uebernommen). `open()` wartet jetzt auf die Hydration (Flake unter Last).

Eigener Spec-Shop (Cleanup per Shop-Delete). Urspruengliche 10 Tests: gueltiger Upload; Datei mit 1 fehlerhaften Zeile -> nichts importiert + Zeilenliste (en/el/ar); kaputte .xlsx (en/el/ar); Mobile 390 px ohne Overflow; Sheets-Toasts (el); image_url-Import mit Polling, Re-Upload haengt kein zweites Foto an. Sheets-Sync selbst: keine Journey (BB E5), Backend-Tests.
