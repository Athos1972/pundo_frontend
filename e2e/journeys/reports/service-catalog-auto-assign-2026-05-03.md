# Journey-Report: service-catalog-auto-assign

**Datum:** 2026-05-03T15:50:45.604Z
**Frontend:** http://localhost:3500
**Backend:** http://localhost:8500
**Test-Owner:** e2e-sca-bfb2efc2@pundo-e2e.io
**Shop-ID:** 8  **Owner-ID:** 7

## Ergebnis: 20/25 PASS  |  5 FAIL  |  0 SKIP

## Schritte

| Schritt | Beschreibung | Erwartet | Tatsächlich | Status |
|---------|-------------|---------|------------|--------|
| IDM-1a | Admin Login via Formular | Redirect zu /admin/dashboard | /admin/dashboard erreicht | **PASS** |
| IDM-1b | Seite /admin/item-domain-mappings lädt | H1 enthält "Mapping" oder "Katalog" | H1: "Item-Domain Mappings" | **PASS** |
| IDM-1c | Mapping-Tabelle hat Einträge | ≥1 Zeile in Tabelle | 4 Zeilen | **PASS** |
| IDM-1d | Domain-Spalte zeigt Wert | Domain-Slug sichtbar (kein "—") | "#3" | **PASS** |
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
| AC-5b | Auto-seeded Listings in DB | ≥1 Listing mit source=auto_seeded | 4 auto_seeded | **PASS** |
| AC-5c | /shop-admin/offers erreichbar | URL enthält shop-admin | http://localhost:3500/shop-admin/offers | **PASS** |
| AC-5d | Badge "Vorgeschlagen" sichtbar | Amber-Badge mit Text "Vorgeschlagen"/"Suggested" | Badge: "Suggested" | **PASS** |
| AC-5e | Preis "Auf Anfrage" sichtbar | "Auf Anfrage" oder "On Request" im HTML | gefunden | **PASS** |
| S5a | Owner Login | HTTP 200 | HTTP 200 | **PASS** |
| S5b | Preis via API auf 50 EUR gesetzt | PATCH erfolgreich | Fehler: Error: PATCH http://localhost:8500/api/v1/shop-owner/offers/9 → 422: {"detail":[{"type":"string_type","loc":["body","price_tiers",0,"unit"],"msg":"Input should be a valid string","input":null},{"type":"missing","loc":["body","price_tiers",0,"steps"],"msg":"Field required","input":{"currency":"EUR","amount":50,"unit":null}}]} | **FAIL** |
| S6a | Shop-Seite erreichbar | HTTP 200, Shop-Seite sichtbar | http://localhost:3500/shops/e2e-sca-shop-bfb2efc2 | **PASS** |
| S6b | Listings in Customer-Sicht sichtbar | ≥1 Listing/Offer-Card | 4 product-links, 0 offer-cards | **PASS** |
| S7a | "Auf Anfrage"-Preis in Customer-Sicht | "Auf Anfrage" oder lokalisierter Text sichtbar | "Auf Anfrage" gefunden | **PASS** |
| S6c | Bilder in Customer-Sicht geladen | ≥0 Bilder (Shop hat evtl. keine Bilder) | 9 geladen | **PASS** |

## Findings

- IDM-2d: Create-Submit navigierte nicht zurück. URL="http://localhost:3500/admin/item-domain-mappings/new" Fehler="*"
- IDM-3b: priority-Input nicht gefunden auf Edit-Seite
- IDM-4a: Wegwerf-Mapping konnte nicht angelegt werden: Error: POST http://localhost:8500/api/v1/admin/item-domain-mappings → 422: {"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, At least one of domain_id or specialty_id must be set","input":{"item_id":18,"onboarding_domain_id":3,"auto_assign":false,"priority":99},"ctx":{"error":{}}}]}
- IDM-5c: Gaps-Seite zeigt Fehler. Bekannte Ursache: getMappingGaps() erwartet MappingGapEntry[] aber Backend liefert {uncovered_domains:[], uncovered_specialties:[]}. gaps.filter() schlägt auf Objekt fehl.
- S5b: Preis-Update fehlgeschlagen. err1="Error: PATCH http://localhost:8500/api/v1/shop-owner/shop-listings/9/offers → 404: {"detail":"Not Found"}" err2="Error: PATCH http://localhost:8500/api/v1/shop-owner/offers/9 → 422: {"detail":[{"type":"string_type","loc":["body","price_tiers",0,"unit"],"msg":"Input should be a valid string","input":null},{"type":"missing","loc":["body","price_tiers",0,"steps"],"msg":"Field required","input":{"currency":"EUR","amount":50,"unit":null}}]}"