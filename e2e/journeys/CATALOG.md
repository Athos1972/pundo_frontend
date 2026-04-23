# Journey Catalog — pundo_frontend

> Quelle der Wahrheit. Pflegeregeln: siehe CATALOG_SCHEMA.md.
> Agents (designer/architect/coder/e2e-tester) lesen und schreiben diese Datei
> nach den dort festgelegten Rollen. User-Bestätigung (j/n) vor jeder
> Mutation außer last-run/last-result.

<!-- SCHEMA_VERSION: 1 -->

---
id: shop-owner-lifecycle
title: Shop-Owner Lifecycle
status: proposed
priority: P1
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/shop-admin/**
  - src/app/shops/[id]/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Shop.status:active
  - Shop.status:inactive
status-changed-at: 2026-04-23T10:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: never
last-result: N/A
---

### Journey: Shop-Owner Lifecycle

**Ziel:** Shop-Owner registriert sich, aktiviert den Shop, fügt Produkte hinzu — und ein Guest-Nutzer kann die Produkte dann in der Discovery finden. Nach Deaktivierung des Shops sind die Produkte nicht mehr sichtbar.

**Trigger-Regel:** Pflicht bei jedem Testlauf, wenn `touches-modules` im git-Diff sind (P1).

**Schritte (Runbook):**
1. Shop-Owner-Account anlegen (POST /api/v1/auth/register mit Rolle shop-owner)
2. Einloggen und JWT erhalten
3. Shop-Profil ausfüllen (Name, Adresse, Öffnungszeiten)
4. Shop aktivieren (status: active)
5. Produkt anlegen (POST /api/v1/shop-admin/products)
6. Als Guest: Suche nach dem Produkt — Ergebnis muss erscheinen
7. Als Guest: Shop-Detailseite aufrufen — Produkt muss sichtbar sein
8. Shop deaktivieren (status: inactive)
9. Als Guest: Suche wiederholen — Produkt darf nicht mehr erscheinen
10. Shop-Detailseite aufrufen — Shop zeigt "nicht verfügbar"
11. Cleanup: Shop-Owner-Account und Testdaten löschen

**Fixtures/Preconditions:**
- Test-Backend auf Port 8500 muss laufen
- Keine existierenden Testdaten mit gleicher E-Mail-Adresse

**Known Risks:**
- Step 6/9 kann durch Caching verzögert sein — ggf. kurzes Wait einbauen

---
id: customer-discovery
title: Customer Discovery Flow
status: proposed
priority: P2
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/page.tsx
  - src/app/search/**
  - src/app/products/[slug]/**
  - src/app/shops/[id]/**
  - src/app/map/**
  - src/lib/api.ts
touches-roles:
  - guest
  - customer
touches-states:
  - Product.availability:available
status-changed-at: 2026-04-23T10:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: never
last-result: N/A
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
