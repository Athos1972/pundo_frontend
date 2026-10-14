---
id: consumer-service-eldercare-w4
title: "F2970 Welle 4: Seniorenbetreuung (px-eldercare) in der Kundensuche, 6 Sprachen, Abgrenzung, RTL 390 px"
status: implemented
priority: P2
owner-agent: coder
proposed-in-spec: 2026-10-13-consumer-service-categories
spec-file: e2e/journeys/consumer-service-eldercare-w4.spec.ts
status-changed-at: 2026-10-13T16:45:58Z
status-changed-by-spec: 2026-10-13-consumer-service-categories
touches-modules:
  - src/components/search/ServiceResultCard.tsx
  - src/app/(customer)/[lang]/search/**
  - src/lib/i18n/search.ts
touches-roles:
  - guest
last-run: 2026-10-13T16:45:58Z
last-result: PASS
---

### Journey: Seniorenbetreuung in der Kundensuche (F2970 Welle 4)

Spec: `consumer-service-eldercare-w4.spec.ts` (nur 3500/8500, read-only, keine Fixtures; Voraussetzung: W4-Seed auf pundo_test).

1. Kunde sucht in en/de/el/ru/he/ar nach einem Seniorenbetreuungs-Begriff -> erste Service-Karte ist "Seniorenbetreuung" (px-eldercare), 0 Anbieter -> Hinweis "Kostenlos eintragen" sichtbar.
2. Medizinische Begriffe (Krankenpflege, nurse, medsestra ...) fuehren nicht auf diese Karte als Top-1.
3. he/ar bei 390 px: dir=rtl, Karte sichtbar, kein horizontaler Overflow.

Letzter Lauf 2026-10-13: 9/9 gruen.
