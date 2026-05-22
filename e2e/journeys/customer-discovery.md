---
id: customer-discovery
title: Customer Discovery Flow
status: implemented
spec-file: e2e/journeys/customer-discovery.spec.ts
priority: P2
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/(customer)/[lang]/page.tsx
  - src/app/(customer)/[lang]/search/**
  - src/app/(customer)/[lang]/products/[slug]/**
  - src/app/(customer)/[lang]/shops/[slug]/**
  - src/components/map/**
  - src/lib/api.ts
touches-roles:
  - guest
  - customer
touches-states:
  - Product.availability:available
status-changed-at: 2026-04-23T15:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: 2026-05-22T14:06:15Z
last-result: PASS
last-run-sha: 309239e58967e8aaa506a176c41ee5d7a88ad35c
---

### Journey: Customer Discovery Flow

**Ziel:** Ein nicht-eingeloggter Besucher (Guest) sucht nach einem Produkt, findet es über die Suche oder Karte, öffnet die Detailseite und sieht Preise und Shop-Standort.

**Trigger-Regel:** Pflicht wenn `src/app/search/**`, `src/app/map/**` oder `src/lib/api.ts` im Diff (P2).

**Schritte (Runbook):**
1. Startseite öffnen — Suchleiste sichtbar
2. Suchbegriff eingeben (z.B. "Katzenfutter")
3. Suchergebnisse erscheinen — mindestens 1 ProductCard
4. Klick auf ProductCard → Produkt-Detailseite lädt
5. Produktname, Preis und Angebote sichtbar
6. "In der Nähe"-Karte zeigt Shop-Pin
7. Klick auf Shop-Pin → Shop-Detailseite lädt
8. Shop-Name, Adresse und Öffnungszeiten sichtbar
9. Back-Navigation funktioniert korrekt (History-Stack intakt)

**Fixtures/Preconditions:**
- Mindestens 1 aktiver Shop mit mindestens 1 Produkt in der Test-DB (pundo_test)
- Test-Backend auf Port 8500 muss laufen

**Known Risks:**
- Karte (Leaflet) braucht DOM — nur in echtem Browser testbar, nicht in JSDOM
