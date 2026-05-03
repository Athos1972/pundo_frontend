# Journey-Report: service-catalog-auto-assign

**Datum:** 2026-05-03T18:39:17.286Z
**Frontend:** http://localhost:3500
**Backend:** http://localhost:8500
**Test-Owner:** e2e-sca-652af7e2@pundo-e2e.io
**Shop-ID:** 4  **Owner-ID:** 3

## Ergebnis: 3/12 PASS  |  4 FAIL  |  5 SKIP

## Schritte

| Schritt | Beschreibung | Erwartet | Tatsächlich | Status |
|---------|-------------|---------|------------|--------|
| IDM-1a | Admin Login via Formular | Redirect zu /admin/dashboard | Login fehlgeschlagen, URL: http://localhost:3500/admin/login | **FAIL** |
| IDM-2a | Admin Login via Formular | /admin/dashboard | FAIL | **FAIL** |
| IDM-3 | Edit-Flow | Login OK | Login fehlgeschlagen | **SKIP** |
| IDM-4 | Delete-Flow | Login OK | Login fehlgeschlagen | **SKIP** |
| IDM-5 | Gaps-Report | Login OK | Login fehlgeschlagen | **SKIP** |
| AC-5a | Owner Login via API | HTTP 200 | HTTP 200 | **PASS** |
| AC-5b | Auto-seeded Listings in DB | ≥1 Listing mit source=auto_seeded | 0 auto_seeded (total=0) | **FAIL** |
| S5 | Preis-Edit | auto_seeded Listing vorhanden | kein autoListingId — vorheriger Test fehlgeschlagen | **SKIP** |
| S6a | Shop-Seite erreichbar | HTTP 200, Shop-Seite sichtbar | http://localhost:3500/shops/e2e-sca-shop-652af7e2 | **PASS** |
| S6b | Listings in Customer-Sicht sichtbar | ≥1 Listing sichtbar | 0 product-links (content: vorhanden) | **FAIL** |
| S7a | Preis in Customer-Sicht | "Auf Anfrage" oder "€50" sichtbar | kein Preis gefunden | **SKIP** |
| S6c | Bilder in Customer-Sicht geladen | ≥0 Bilder (Shop hat evtl. keine Bilder) | 10 geladen | **PASS** |

## Findings

- IDM-1a: Admin Login via Formular fehlgeschlagen
- IDM-2a: Login fehlgeschlagen — Create-Test übersprungen
- AC-5b: Keine auto_seeded Listings für Owner e2e-sca-652af7e2@pundo-e2e.io. Mögliche Ursachen: 1) Onboarding-Endpoint existiert nicht oder hat falsche Parameter, 2) Auto-Assign-Worker wurde bei Approve nicht getriggert, 3) Domäne elektriker hat keine Mappings für diesen Shop-Type
- S6b: Keine Listings in Customer-Sicht. Shop-URL=http://localhost:3500/shops/e2e-sca-shop-652af7e2. Möglicherweise: 1) shop nicht öffentlich, 2) Geo-Koordinaten fehlen, 3) available=false