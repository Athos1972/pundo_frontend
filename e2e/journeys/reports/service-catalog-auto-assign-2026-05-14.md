# Journey-Report: service-catalog-auto-assign

**Datum:** 2026-05-14T22:22:49.420Z
**Frontend:** http://localhost:3500
**Backend:** http://localhost:8500
**Test-Owner:** e2e-sca-e8833ea9@pundo-e2e.io
**Shop-ID:** 7  **Owner-ID:** 3

## Ergebnis: 12/21 PASS  |  7 FAIL  |  2 SKIP

## Schritte

| Schritt | Beschreibung | Erwartet | Tatsächlich | Status |
|---------|-------------|---------|------------|--------|
| IDM-1a | Admin Cookie injiziert | admin_token gesetzt | domain=localhost | **PASS** |
| IDM-1b | Seite /admin/item-domain-mappings lädt | H1 enthält "Mapping" oder "Katalog" | H1: "Item-Domain Mappings" | **PASS** |
| IDM-1c | Mapping-Tabelle hat Einträge | ≥1 Zeile in Tabelle | 1 Zeilen | **PASS** |
| IDM-1d | Domain-Spalte zeigt Wert | Domain-Slug sichtbar | "null" — zeigt "—" | **FAIL** |
| IDM-2a | Admin Login via Formular | /admin/dashboard | OK | **PASS** |
| IDM-2b | /admin/item-domain-mappings/new erreichbar | Formular sichtbar | http://localhost:3500/admin/item-domain-mappings/new | **PASS** |
| IDM-2c | Formularfeld item_id vorhanden | input[name=item_id] sichtbar | vorhanden | **PASS** |
| IDM-2d | Create-Submit navigiert zurück zur Liste | /admin/item-domain-mappings | http://localhost:3500/admin/item-domain-mappings/new | **FAIL** |
| IDM-3a | /admin/item-domain-mappings/29/edit erreichbar | URL enthält 29/edit | http://localhost:3500/admin/item-domain-mappings/29/edit | **PASS** |
| IDM-3b | Priority-Feld bearbeitbar | input[name=priority] sichtbar | nicht gefunden | **FAIL** |
| IDM-4a | Test-Mapping erstellt | Mapping angelegt | Fehler: Error: POST http://localhost:8500/api/v1/admin/item-domain-mappings → 422: {"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, At least one of domain_id or specialty_id must be set","input":{"item_id":18,"onboarding_domain_id":3,"auto_assign":false,"priority":99},"ctx":{"error":{}}}]} | **FAIL** |
| IDM-5a | Gaps-Report erreichbar | URL enthält "gaps" | http://localhost:3500/admin/item-domain-mappings/gaps | **PASS** |
| IDM-5b | Gaps-Report H1 vorhanden | H1 sichtbar | "Mapping Gaps" | **PASS** |
| IDM-5c | Gaps-Report zeigt Daten | Tabelle mit Gaps ODER grüner "keine Gaps"-Banner | Fehler-Anzeige sichtbar | **FAIL** |
| AC-5a | Owner Login via API | HTTP 200 | HTTP 200 | **PASS** |
| AC-5b | Auto-seeded Listings in DB | ≥1 Listing mit source=auto_seeded | 0 auto_seeded (total=0) | **FAIL** |
| S5 | Preis-Edit | auto_seeded Listing vorhanden | kein autoListingId — vorheriger Test fehlgeschlagen | **SKIP** |
| S6a | Shop-Seite erreichbar | HTTP 200, Shop-Seite sichtbar | http://localhost:3500/shops/e2e-sca-shop-e8833ea9 | **PASS** |
| S6b | Listings in Customer-Sicht sichtbar | ≥1 Listing sichtbar | 0 product-links (content: vorhanden) | **FAIL** |
| S7a | Preis in Customer-Sicht | "Auf Anfrage" oder "€50" sichtbar | kein Preis gefunden | **SKIP** |
| S6c | Bilder in Customer-Sicht geladen | ≥0 Bilder (Shop hat evtl. keine Bilder) | 10 geladen | **PASS** |

## Findings

- IDM-1d: FINDING — Domain-Spalte zeigt immer "—". Ursache: Backend liefert domain_id (int) aber Frontend-Typ erwartet onboarding_domain_id + onboarding_domain_slug. MappingList.tsx zeigt m.onboarding_domain_slug ?? "—", aber Backend liefert dieses Feld nicht. Fix: Backend muss onboarding_domain_slug in Response ergänzen ODER Frontend-Mapping muss domain_id→slug auflösen.
- IDM-2d: Create-Submit navigierte nicht zurück. URL="http://localhost:3500/admin/item-domain-mappings/new" Fehler="*"
- IDM-3b: priority-Input nicht gefunden auf Edit-Seite
- IDM-4a: Wegwerf-Mapping konnte nicht angelegt werden: Error: POST http://localhost:8500/api/v1/admin/item-domain-mappings → 422: {"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, At least one of domain_id or specialty_id must be set","input":{"item_id":18,"onboarding_domain_id":3,"auto_assign":false,"priority":99},"ctx":{"error":{}}}]}
- IDM-5c: Gaps-Seite zeigt Fehler. Bekannte Ursache: getMappingGaps() erwartet MappingGapEntry[] aber Backend liefert {uncovered_domains:[], uncovered_specialties:[]}. gaps.filter() schlägt auf Objekt fehl.
- AC-5b: Keine auto_seeded Listings für Owner e2e-sca-e8833ea9@pundo-e2e.io. Mögliche Ursachen: 1) Onboarding-Endpoint existiert nicht oder hat falsche Parameter, 2) Auto-Assign-Worker wurde bei Approve nicht getriggert, 3) Domäne elektriker hat keine Mappings für diesen Shop-Type
- S6b: Keine Listings in Customer-Sicht. Shop-URL=http://localhost:3500/shops/e2e-sca-shop-e8833ea9. Möglicherweise: 1) shop nicht öffentlich, 2) Geo-Koordinaten fehlen, 3) available=false