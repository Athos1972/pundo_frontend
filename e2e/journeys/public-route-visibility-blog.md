---
id: public-route-visibility-blog
title: Blog-Seite Sichtbarkeit + Soro-Embed
status: approved
priority: P2
owner-agent: e2e-tester
proposed-in-spec: ad-hoc
touches-modules:
  - src/app/(customer)/[lang]/blog/**
  - src/lib/translations.ts
  - src/proxy.ts
touches-roles:
  - guest
touches-states: []
spec-file: null
last-run: never
last-result: N/A
last-run-sha: null
status-changed-at: 2026-05-14T15:45:00Z
status-changed-by-spec: ad-hoc
---

### Journey: Blog-Seite Sichtbarkeit + Soro-Embed

**Ziel:** Sicherstellen dass /blog für anonyme Nutzer erreichbar ist, der Soro-Embed korrekt geladen wird, Artikel-Thumbnails sichtbar sind und der CSP-Fix (N7500) keine Violations mehr produziert.

**Fixture-Setup:** Keine eigenen Fixtures nötig — Soro-Embed lädt Live-Daten von app.trysoro.com.

**Acceptance Criteria:**

| AC | Schritt | Expected | Prüfmethode |
|---|---|---|---|
| AC-1 | GET /blog | HTTP 200, Seite rendert | page.goto + waitForLoadState |
| AC-2 | Soro-Embed im DOM | iframe oder embed-Container sichtbar | locator('#soro-embed, [data-soro], iframe[src*="trysoro"]') |
| AC-3 | Keine CSP-Violations | Console-Log enthält kein "Content Security Policy" für app.trysoro.com oder supabase.co | page.on('console') filter |
| AC-4 | Artikel-Thumbnails laden | Mindestens 1 img mit naturalWidth > 0 auf /blog | page.evaluate([...document.images].filter) |
| AC-5 | Deep-Link lädt Artikel | /blog?post=shops-near-me-in-cyprus rendert Artikel-Inhalt | page.goto + expect(locator).toBeVisible |
| AC-6 | Translations vorhanden | Seite zeigt keine [MISSING_KEY]-Platzhalter | page.content() enthält nicht MISSING |

**Runbook:**
1. Öffne /blog (anon, Port 3500)
2. Prüfe HTTP-Status 200
3. Sammle Console-Logs auf CSP-Violations
4. Prüfe ob Soro-Embed-Container im DOM sichtbar ist
5. Zähle geladene Bilder (naturalWidth > 0)
6. Öffne /blog?post=shops-near-me-in-cyprus
7. Prüfe Artikel-Titel/Body sichtbar
8. Erneut Console auf CSP-Violations prüfen
9. Report schreiben nach e2e/journeys/reports/public-route-visibility-blog-YYYY-MM-DD.md
