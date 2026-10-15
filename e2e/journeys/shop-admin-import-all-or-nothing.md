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
touches-roles:
  - shop-owner
touches-states:
  []
status-changed-at: 2026-10-15T00:00:00Z
status-changed-by-spec: 2026-10-15-import-sync-and-help
last-run: 2026-10-15
last-result: PASS
last-run-sha: —
---

# Journey: shop-admin-import-all-or-nothing

Eigener Spec-Shop (Cleanup per Shop-Delete). 10 Tests: gueltiger Upload; Datei mit 1 fehlerhaften Zeile -> nichts importiert + Zeilenliste (en/el/ar); kaputte .xlsx (en/el/ar); Mobile 390 px ohne Overflow; Sheets-Toasts (el); image_url-Import mit Polling, Re-Upload haengt kein zweites Foto an. Sheets-Sync selbst: keine Journey (BB E5), Backend-Tests.
