# Journey-Report: service-catalog-auto-assign

**Datum:** 2026-05-03T18:56:55.581Z
**Frontend:** http://localhost:3500
**Backend:** http://localhost:8500
**Test-Owner:** e2e-sca-9e4878be@pundo-e2e.io
**Shop-ID:** 14  **Owner-ID:** 12

## Ergebnis: 7/15 PASS  |  5 FAIL  |  3 SKIP

## Schritte

| Schritt | Beschreibung | Erwartet | Tatsächlich | Status |
|---------|-------------|---------|------------|--------|
| IDM-2a | Admin Login via Formular | /admin/dashboard | OK | **PASS** |
| IDM-2b | /admin/item-domain-mappings/new erreichbar | Formular sichtbar | http://localhost:3500/admin/item-domain-mappings/new | **PASS** |
| IDM-2c | Formularfeld item_id vorhanden | input[name=item_id] sichtbar | vorhanden | **PASS** |
| IDM-2d | Create-Submit navigiert zurück zur Liste | /admin/item-domain-mappings | http://localhost:3500/admin/item-domain-mappings/new | **FAIL** |
| IDM-3a | /admin/item-domain-mappings/29/edit erreichbar | URL enthält 29/edit | http://localhost:3500/admin/item-domain-mappings/29/edit | **PASS** |
| IDM-3b | Priority-Feld bearbeitbar | input[name=priority] sichtbar | nicht gefunden | **FAIL** |
| IDM-4a | Test-Mapping erstellt | Mapping angelegt | Fehler: Error: POST http://localhost:8500/api/v1/admin/item-domain-mappings → 422: {"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, At least one of domain_id or specialty_id must be set","input":{"item_id":18,"onboarding_domain_id":3,"auto_assign":false,"priority":99},"ctx":{"error":{}}}]} | **FAIL** |
| IDM-5 | Gaps-Report | Login OK | Login fehlgeschlagen | **SKIP** |
| AC-5a | Owner Login via API | HTTP 200 | HTTP 200 | **PASS** |
| AC-5b | Auto-seeded Listings in DB | ≥1 Listing mit source=auto_seeded | 0 auto_seeded (total=0) | **FAIL** |
| S5 | Preis-Edit | auto_seeded Listing vorhanden | kein autoListingId — vorheriger Test fehlgeschlagen | **SKIP** |
| S6a | Shop-Seite erreichbar | HTTP 200, Shop-Seite sichtbar | http://localhost:3500/shops/e2e-sca-shop-9e4878be | **PASS** |
| S6b | Listings in Customer-Sicht sichtbar | ≥1 Listing sichtbar | 0 product-links (content: vorhanden) | **FAIL** |
| S7a | Preis in Customer-Sicht | "Auf Anfrage" oder "€50" sichtbar | kein Preis gefunden | **SKIP** |
| S6c | Bilder in Customer-Sicht geladen | ≥0 Bilder (Shop hat evtl. keine Bilder) | 9 geladen | **PASS** |

## Findings

- IDM-2d: Create-Submit navigierte nicht zurück. URL="http://localhost:3500/admin/item-domain-mappings/new" Fehler="*"
- IDM-3b: priority-Input nicht gefunden auf Edit-Seite
- IDM-4a: Wegwerf-Mapping konnte nicht angelegt werden: Error: POST http://localhost:8500/api/v1/admin/item-domain-mappings → 422: {"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, At least one of domain_id or specialty_id must be set","input":{"item_id":18,"onboarding_domain_id":3,"auto_assign":false,"priority":99},"ctx":{"error":{}}}]}
- AC-5b: Keine auto_seeded Listings für Owner e2e-sca-9e4878be@pundo-e2e.io. Mögliche Ursachen: 1) Onboarding-Endpoint existiert nicht oder hat falsche Parameter, 2) Auto-Assign-Worker wurde bei Approve nicht getriggert, 3) Domäne elektriker hat keine Mappings für diesen Shop-Type
- S6b: Keine Listings in Customer-Sicht. Shop-URL=http://localhost:3500/shops/e2e-sca-shop-9e4878be. Möglicherweise: 1) shop nicht öffentlich, 2) Geo-Koordinaten fehlen, 3) available=false