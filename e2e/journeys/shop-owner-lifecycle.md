---
id: shop-owner-lifecycle
title: Shop-Owner Lifecycle
status: implemented
spec-file: e2e/journeys/shop-owner-lifecycle.spec.ts
priority: P1
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/(shop-admin)/**
  - src/app/(customer)/shops/[id]/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Shop.status:active
  - Shop.status:inactive
status-changed-at: 2026-04-23T15:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: 2026-04-24T14:00:00Z
last-result: PASS
last-run-sha: bc4e8ac89c083856c0eb12e76a581461f768787b
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
