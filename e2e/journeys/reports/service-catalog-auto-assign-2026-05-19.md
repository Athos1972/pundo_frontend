# Journey-Report: service-catalog-auto-assign

**Datum:** 2026-05-19T10:48:14.620Z
**Frontend:** http://127.0.0.1:3500
**Backend:** http://localhost:8500
**Test-Owner:** e2e-sca-9f168bf3@pundo-e2e.io
**Shop-ID:** 5048  **Owner-ID:** 717

## Ergebnis: 15/23 PASS  |  6 FAIL  |  2 SKIP

## Schritte

| Schritt | Beschreibung | Erwartet | Tatsächlich | Status |
|---------|-------------|---------|------------|--------|
| IDM-1a | Admin Cookie injiziert | admin_token gesetzt | domain=127.0.0.1 | **PASS** |
| IDM-1b | Seite /admin/item-domain-mappings lädt | H1 enthält "Mapping" oder "Katalog" | H1: "Item-Domain Mappings" | **PASS** |
| IDM-1c | Mapping-Tabelle hat Einträge | ≥1 Zeile in Tabelle | 1 Zeilen | **PASS** |
| IDM-1d | Domain-Spalte zeigt Wert | Domain-Slug sichtbar | "null" — zeigt "—" | **FAIL** |
| IDM-2a | Admin Login via Formular | /admin/dashboard | OK | **PASS** |
| IDM-2b | /admin/item-domain-mappings/new erreichbar | Formular sichtbar | http://127.0.0.1:3500/admin/item-domain-mappings/new | **PASS** |
| IDM-2c | Formularfeld item_id vorhanden | input[name=item_id] sichtbar | vorhanden | **PASS** |
| IDM-2d | Create-Submit navigiert zurück zur Liste | /admin/item-domain-mappings | http://127.0.0.1:3500/admin/item-domain-mappings/new | **FAIL** |
| IDM-3a | /admin/item-domain-mappings/29/edit erreichbar | URL enthält 29/edit | http://127.0.0.1:3500/admin/item-domain-mappings/29/edit | **PASS** |
| IDM-3b | Priority-Feld bearbeitbar | input[name=priority] sichtbar | nicht gefunden | **FAIL** |
| IDM-4a | Test-Mapping erstellt | Mapping angelegt | Fehler: Error: POST http://localhost:8500/api/v1/admin/item-domain-mappings → 422: {"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, At least one of domain_id or specialty_id must be set","input":{"item_id":18,"onboarding_domain_id":3,"auto_assign":false,"priority":99},"ctx":{"error":{}}}]} | **FAIL** |
| IDM-5 | Gaps-Report | Login OK | Login fehlgeschlagen | **SKIP** |
| AC-5a | Owner Login via API | HTTP 200 | HTTP 200 | **PASS** |
| AC-5b | Auto-seeded Listings in DB | ≥1 Listing mit source=auto_seeded | 3 auto_seeded | **PASS** |
| AC-5c | /shop-admin/offers erreichbar | URL enthält shop-admin | http://127.0.0.1:3500/shop-admin/offers | **PASS** |
| AC-5d | Badge "Vorgeschlagen" sichtbar | Amber-Badge mit Text "Vorgeschlagen"/"Suggested" | Badge: "Suggested" | **PASS** |
| AC-5e | Preis "Auf Anfrage" sichtbar | "Auf Anfrage" oder "On Request" im HTML | gefunden | **PASS** |
| S5a | Owner Login | HTTP 200 | HTTP 200 | **PASS** |
| S5b | Preis via API auf 50 EUR gesetzt | PATCH erfolgreich | Fehler: Error: PATCH http://localhost:8500/api/v1/shop-owner/offers/20801 → 422: {"detail":[{"type":"string_type","loc":["body","price_tiers",0,"unit"],"msg":"Input should be a valid string","input":null},{"type":"missing","loc":["body","price_tiers",0,"steps"],"msg":"Field required","input":{"currency":"EUR","amount":50,"unit":null}}]} | **FAIL** |
| S6a | Shop-Seite erreichbar | HTTP 200, Shop-Seite sichtbar | http://127.0.0.1:3500/shops/e2e-sca-shop-9f168bf3 | **PASS** |
| S6b | Listings in Customer-Sicht sichtbar | ≥1 Listing sichtbar | 0 product-links (content: vorhanden) | **FAIL** |
| S7a | Preis in Customer-Sicht | "Auf Anfrage" oder "€50" sichtbar | kein Preis gefunden | **SKIP** |
| S6c | Bilder in Customer-Sicht geladen | ≥0 Bilder (Shop hat evtl. keine Bilder) | 9 geladen | **PASS** |

## Findings

- IDM-1d: FINDING — Domain-Spalte zeigt immer "—". Ursache: Backend liefert domain_id (int) aber Frontend-Typ erwartet onboarding_domain_id + onboarding_domain_slug. MappingList.tsx zeigt m.onboarding_domain_slug ?? "—", aber Backend liefert dieses Feld nicht. Fix: Backend muss onboarding_domain_slug in Response ergänzen ODER Frontend-Mapping muss domain_id→slug auflösen.
- IDM-2d: Create-Submit navigierte nicht zurück. URL="http://127.0.0.1:3500/admin/item-domain-mappings/new" Fehler="*"
- IDM-3b: priority-Input nicht gefunden auf Edit-Seite
- IDM-4a: Wegwerf-Mapping konnte nicht angelegt werden: Error: POST http://localhost:8500/api/v1/admin/item-domain-mappings → 422: {"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, At least one of domain_id or specialty_id must be set","input":{"item_id":18,"onboarding_domain_id":3,"auto_assign":false,"priority":99},"ctx":{"error":{}}}]}
- S5b: Preis-Update fehlgeschlagen. err1="Error: PATCH http://localhost:8500/api/v1/shop-owner/shop-listings/20801/offers → 404: {"detail":"Not Found"}" err2="Error: PATCH http://localhost:8500/api/v1/shop-owner/offers/20801 → 422: {"detail":[{"type":"string_type","loc":["body","price_tiers",0,"unit"],"msg":"Input should be a valid string","input":null},{"type":"missing","loc":["body","price_tiers",0,"steps"],"msg":"Field required","input":{"currency":"EUR","amount":50,"unit":null}}]}"
- S6b: Keine Listings in Customer-Sicht. Shop-URL=http://127.0.0.1:3500/shops/e2e-sca-shop-9f168bf3. Möglicherweise: 1) shop nicht öffentlich, 2) Geo-Koordinaten fehlen, 3) available=false