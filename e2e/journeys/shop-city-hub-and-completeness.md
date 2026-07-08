---
id: shop-city-hub-and-completeness
title: Shop Städte-Hub + Completeness-Policy (B5900-006, B5900-007)
status: implemented
priority: P2
owner-agent: e2e-tester
proposed-in-spec: 2026-07-08-shop-placeholder-data
touches-modules:
  - src/app/(customer)/[lang]/shops/page.tsx
  - src/app/(customer)/[lang]/shops/[slug]/page.tsx
  - src/app/(customer)/[lang]/shops/cities/page.tsx
  - src/app/(customer)/[lang]/shops/city/[city]/page.tsx
  - src/app/sitemap-shop-cities.xml/route.ts
  - src/lib/seo/shop-completeness.ts
  - src/lib/shop-city-index.ts
touches-roles:
  - guest
touches-states:
  - Shop.indexable:false
spec-file: e2e/journeys/shop-city-hub-and-completeness.spec.ts
last-run: 2026-07-08T15:15:00Z
last-result: PASS
last-run-sha: 5c91c1fa2add1c12bf827b8ec0d6151857f1ea5f
status-changed-at: 2026-07-08T15:15:00Z
status-changed-by-spec: 2026-07-08-seo-audit-not-in-ci
---

### Journey: Shop Städte-Hub + Completeness-Policy

**Ziel:** Beweisen, dass (a) Shops mit unvollständigen Daten einen sinnvollen Titel/H1 und explizites `noindex, follow` bekommen statt eines generischen "Shop | Pundo"-Fallbacks (B5900-006), und (b) die neuen Städte-Hub-Seiten (`/shops/cities`, `/shops/city/[city]`) als crawlbarer Verlinkungs-Hub gegen die Zero-Orphan-Policy funktionieren (B5900-007) — inklusive korrektem Verhalten für unbekannte Städte und Datenvolumen-Limitierungen.

**Trigger-Regel:** Pflicht wenn `src/app/(customer)/[lang]/shops/**`, `src/lib/seo/shop-completeness.ts` oder `src/lib/shop-city-index.ts` im Diff (P2).

**Schritte (Runbook):**

**B5900-006 — Completeness-Policy (4 bekannte Slugs aus 01-design.md):**
1. Für jeden der 4 Slugs (`toi-moi-nicosia-mall-03bb83dc`, `wrap-grill-e4b4b9ad`, `barkies-50fc4aff`, `rebellion-gym-514aff92`): `/en/shops/<slug>` aufrufen
2. HTTP 200, `<title>` ≠ "Shop | Pundo"
3. Sichtbares, nicht-leeres `<h1>`
4. Keine Client-/Console-Fehler

**B5900-007 — Städte-Hub:**
1. `/en/shops` enthält `<a href*="/shops/cities">`-Link (Einstiegs-Link in den Hub)
2. `/en/shops/cities` lädt mit genau einem `<h1>`, `og:url === canonical`
3. `/sitemap-shop-cities.xml` ist erreichbar und liefert wohlgeformtes `<urlset>`
4. **Content-Pfad (bedingt):** Falls `GET /shops/cities?min_count=5` (Backend-Default-Schwelle) mindestens eine Stadt liefert, muss `/en/shops/city/<slug>` dieser Stadt genau ein `<h1>` und mindestens einen echten `<a href*="/en/shops/">`-Link zu einem Shop enthalten. Andernfalls: `test.skip` mit Begründung (kein Fail) — siehe „Known Risks".
5. `/en/shops/city/<unbekannte-stadt>` liefert HTTP 200 (Next.js-16-RSC-Streaming-Verhalten) mit Not-Found-Inhalt und `noindex` im ersten `<meta name="robots">`-Tag.

**Fixtures/Preconditions:**
- Test-Backend auf Port 8500 und Test-Frontend auf Port 3500 müssen laufen (aktueller Build, kein stale `.next/standalone`!)
- `pundo_test` sollte idealerweise via `sync_prod_to_test.sh` synced sein — die 4 B5900-006-Slugs und eine Stadt oberhalb der Backend-Schwelle (`min_count=5`) müssen existieren, damit alle Tests laufen (sonst defensives `test.skip`)

**Known Risks:**
- **Datenvolumen-Limitierung (kein Code-Fehler):** `pundo_test` kann je nach letztem Sync zu wenige Shops pro Stadt haben, damit `GET /shops/cities` (Backend-Default `min_count=5`) irgendeine Stadt liefert. In diesem Fall überspringt Test 8 (Content-Pfad) defensiv, statt fälschlich zu failen. Das ist dokumentiertes Verhalten (siehe `03-implementation.md`, B5900-007, "Known Gaps #1") — kein Blocker für den Fix selbst, aber ein Hinweis, dass ein Prod-Sync sinnvoll ist, um den vollen End-to-End-Pfad regelmäßig zu verifizieren.
- **Backend-`indexable`-Prädikat (C3, Content-Signal) ist bei realen Prod-Daten extrem restriktiv:** In einer Stichprobe von 7240 aktiven Shops (nach `sync_prod_to_test.sh`) erfüllten nur 9 das Content-Signal-Kriterium (Bild ODER Description vorhanden) — 99,86% der Shops gelten dadurch als `indexable=false` und tauchen weder in `/shops/cities`-Aggregation noch in Städte-Hub-Seiten auf. Das ist eine echte Diskrepanz zwischen der ursprünglichen Zero-Orphan-Policy-Absicht (AC-2 aus B5900-007: "kein Shop hat 0 interne Inlinks") und der praktischen Wirkung des `indexable`-Filters auf reale Daten — siehe konsolidierter Test-Report `B6400-008/specs/2026-07-08-seo-audit-not-in-ci/04-test-report-consolidated-ahrefs-remediation.md`, Abschnitt "Divergenzen".
- **`.next/standalone`-Build muss aktuell sein:** Während der Testautorenschaft wurde ein Stale-Build-Problem gefunden (Playwright global-setup startet den `standalone`-Build, der vor dem letzten Feature-Commit gebaut worden war) — führte zu 2 Fehlschlägen, die nach `npm run build` verschwanden. Kein Produktbug, aber ein Hinweis für künftige Testläufe: vor jedem Playwright-Lauf sicherstellen, dass `.next/standalone` neuer ist als der letzte relevante Commit.
