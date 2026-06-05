---
id: shop-owner-self-deactivate
title: Shop-Owner Self-Deactivate (Danger Zone)
status: implemented
spec-file: e2e/journeys/shop-owner-self-deactivate.spec.ts
priority: P1
owner-agent: architect
proposed-in-spec: shop-delete-deactivate-20260605
touches-modules:
  - src/app/(shop-admin)/shop-admin/(portal)/settings/**
  - src/components/shop-admin/ShopDangerZone.tsx
  - src/app/(shop-admin)/shop-admin/login/**
  - src/app/(customer)/[lang]/shops/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Shop.status:inactive
  - ShopOwner.status:inactive
status-changed-at: 2026-06-05T00:00:00Z
status-changed-by-spec: shop-delete-deactivate-20260605
last-run: 2026-06-05T11:18:27Z
last-result: PASS
---

### Journey: Shop-Owner Self-Deactivate (Danger Zone)

**Ziel:** Shop-Owner deaktiviert seinen eigenen Shop über die Settings-Seite. Danach wird er ausgeloggt, sieht auf der Login-Seite einen Info-Banner und der Shop ist für Customers nicht mehr sichtbar.

**Trigger-Regel:** Pflicht bei jedem Testlauf wenn `touches-modules` im git-Diff sind (P1). Insbesondere wenn Settings-Page, ShopDangerZone oder Login-Page geändert wurden.

**Preconditions:**
- Test-Backend auf Port 8500 muss laufen
- Ein genehmigter Shop-Owner (status: `approved`) mit einem aktiven Shop und mindestens einem exklusiven Item/Offer existiert in `pundo_test`
- Nutze bestehende Testdaten (kein DB-Reset!) — konkret: Account `e2e-owner@pundo-e2e.io`

**Schritte (Runbook):**

1. Als Shop-Owner einloggen (`/shop-admin/login`)
2. Im Nav-Menü: Eintrag „Einstellungen" / Settings ist sichtbar → klicken
3. Settings-Seite `/shop-admin/settings` lädt korrekt
4. Danger-Zone-Sektion ist sichtbar (roter Border, beschreibender Text, Button „Shop schließen")
5. Button klicken → Bestätigungsdialog öffnet sich
6. Dialog zeigt erklärenden Text (Deaktivierung, nicht Löschung; Support für echtes Löschen)
7. Bestätigen → POST `/api/shop-admin/shop/deactivate` sendet → 200 erhalten
8. Automatischer Logout (`POST /api/shop-admin/logout`)
9. Redirect zu `/shop-admin/login?deactivated=1`
10. Login-Seite zeigt Info-Banner (nicht Error, nicht Rot) mit Hinweis auf Deaktivierung
11. **Verifikation Customer-Sicht:**
    - Als Guest: Shop-Detailseite des deaktivierten Shops aufrufen → 404 oder „nicht verfügbar"
    - Als Guest: Suche nach exklusivem Produkt des Shops → Ergebnis erscheint nicht
12. **Verifikation Auth:**
    - Owner versucht sich wieder einzuloggen → 403 / Fehler-Meldung (nicht normaler Login)
13. **Cleanup:** Admin reaktiviert Owner/Shop via Backend-API (direkt, kein UI) oder Test-Reset

**Fixtures / Testdaten-Strategie:**
- Nutze `e2e-owner@pundo-e2e.io` — dieser Account hat einen vollständig eingerichteten Shop mit exklusivem Item
- ⚠️ Nach dem Test ist dieser Account deaktiviert — Cleanup (Schritt 13) muss zuverlässig laufen, damit Folge-Tests nicht scheitern
- Alternative: Eigenen Test-Account für diesen Test anlegen und am Ende komplett löschen (sauberer, aber Setup-Aufwand)

**Known Risks:**
- Cleanup (Reaktivierung) ist zwingend — sonst ist `e2e-owner@pundo-e2e.io` für alle nachfolgenden Shop-Owner-Tests unbrauchbar
- Customer-Sicht (Schritt 11) kann durch Caching verzögert sein — kurzes Wait oder Retry-Assert
- Backend-Prerequisite: `POST /api/v1/shop-owner/shop/deactivate` muss implementiert sein
