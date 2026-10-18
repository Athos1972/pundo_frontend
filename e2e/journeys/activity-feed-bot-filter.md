---
id: activity-feed-bot-filter
title: Activity-Feed Bot-Filter und Prefetch-Unterdrückung (F6998)
status: implemented
spec-file: e2e/journeys/activity-feed-bot-filter.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: 2026-10-17-activity-log-bot-filter
touches-modules:
  - src/lib/api.ts
  - src/lib/proxy/forward-user-agent.ts
  - src/app/api/customer/[...path]/route.ts
  - src/app/(customer)/[lang]/products/[slug]/**
  - src/app/(customer)/[lang]/shops/[slug]/**
  - src/app/(customer)/[lang]/page.tsx
  - src/components/activity-feed/**
touches-roles:
  - guest
touches-states:
  - ActivityLog.event_type:price_comparison_viewed
  - ActivityLog.event_type:shop_discovered
status-changed-at: 2026-10-17T00:00:00Z
status-changed-by-spec: 2026-10-17-activity-log-bot-filter
last-run: 2026-10-17T20:10:00Z
last-result: PASS
last-run-sha: 3fb667d-uncommitted
---

### Journey: Activity-Feed Bot-Filter und Prefetch-Unterdrückung

**Ziel:** Crawler-Aufrufe und Link-Prefetches erzeugen keine Activity-Events (`price_comparison_viewed`, `shop_discovered`), echte Browser-Aufrufe genau eines pro Seitenaufruf. Der Besucher-User-Agent wird vom SSR-Fetch als `X-Forwarded-User-Agent` ans Backend gereicht (nur Unterdrückung, nie Erzwingung), Prefetches als `X-Forwarded-Prefetch: 1`.

**Trigger-Regel:** Pflicht, wenn `src/lib/api.ts`, `src/lib/proxy/forward-user-agent.ts` oder Produkt-/Shop-Detailseiten im Diff sind (P2).

**Schritte (Runbook, Playwright-Spec P1–P10):**
1. Bot-UA (SemrushBot, AhrefsBot) ruft Produkt-/Shop-Seite → 200, 0 Events
2. Browser-UA öffnet Produktseite → genau 1 Event (Memoization von Metadaten- und Seitenaufruf)
3. Client-gesetzter `X-Forwarded-User-Agent` kann Logging nicht erzwingen
4. Smoketester-UA → 0 Events
5. Startseite/Suche/Shopliste scrollen (Prefetch) → 0 Events; anschließender Klick → genau 1 Event
6. Startseite rendert den Aktivitäts-Feed weiter

**Hinweis:** Playwright-Default-UA `HeadlessChrome` gilt als Bot; Tests, die Events erwarten, setzen einen Browser-UA (siehe `docs/e2e-testing.md`).
