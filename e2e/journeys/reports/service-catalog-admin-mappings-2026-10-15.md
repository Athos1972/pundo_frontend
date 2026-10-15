# Journey-Report: service-catalog-auto-assign (Admin-UI Item-Domain-Mappings)

**Datum:** 2026-10-15T15:03:33.876Z
**Frontend:** http://127.0.0.1:3500
**Backend:** http://localhost:8500

## Ergebnis: 12/15 PASS  |  3 FAIL  |  0 SKIP

## Schritte

| Schritt | Beschreibung | Erwartet | Tatsächlich | Status |
|---------|-------------|---------|------------|--------|
| IDM-1a | Admin-Session (storageState) | admin_token gesetzt | /Users/bb_studio_2025/dev/github/pundo_frontend/e2e/.auth/admin.json | **PASS** |
| IDM-1b | Seite /admin/item-domain-mappings lädt | H1 enthält "Mapping" oder "Katalog" | H1: "Item-Domain Mappings" | **PASS** |
| IDM-1c | Mapping-Tabelle hat Einträge | ≥1 Zeile in Tabelle | 50 Zeilen | **PASS** |
| IDM-1d | Domain-Spalte zeigt Wert | Domain-Slug sichtbar (kein "—") | "#1" | **PASS** |
| IDM-2a | Admin-Session (storageState) | /admin/dashboard | OK | **PASS** |
| IDM-2b | /admin/item-domain-mappings/new erreichbar | Formular sichtbar | http://127.0.0.1:3500/admin/item-domain-mappings/new | **PASS** |
| IDM-2c | Formularfeld item_id vorhanden | input[name=item_id] sichtbar | vorhanden | **PASS** |
| IDM-2d | Create-Submit navigiert zurück zur Liste | /admin/item-domain-mappings | http://127.0.0.1:3500/admin/item-domain-mappings/new | **FAIL** |
| IDM-3a | /admin/item-domain-mappings/29/edit erreichbar | URL enthält 29/edit | http://127.0.0.1:3500/admin/item-domain-mappings/29/edit | **PASS** |
| IDM-3b | Priority-Feld bearbeitbar | Wert änderbar | 1 → 99 | **PASS** |
| IDM-3c | Edit-Submit navigiert zurück | /admin/item-domain-mappings | http://127.0.0.1:3500/admin/item-domain-mappings | **PASS** |
| IDM-4a | Test-Mapping erstellt | Mapping angelegt | Fehler: Error: POST http://localhost:8500/api/v1/admin/item-domain-mappings → 422: {"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, At least one of domain_id or specialty_id must be set","input":{"item_id":18,"onboarding_domain_id":3,"auto_assign":false,"priority":99},"ctx":{"error":{}}}]} | **FAIL** |
| IDM-5a | Gaps-Report erreichbar | URL enthält "gaps" | http://127.0.0.1:3500/admin/item-domain-mappings/gaps | **PASS** |
| IDM-5b | Gaps-Report H1 vorhanden | H1 sichtbar | "Mapping Gaps" | **PASS** |
| IDM-5c | Gaps-Report zeigt Daten | Tabelle mit Gaps ODER grüner "keine Gaps"-Banner | Fehler-Anzeige sichtbar | **FAIL** |

## Findings

- IDM-2d: Create-Submit navigierte nicht zurück. URL="http://127.0.0.1:3500/admin/item-domain-mappings/new" Fehler="*"
- IDM-4a: Wegwerf-Mapping konnte nicht angelegt werden: Error: POST http://localhost:8500/api/v1/admin/item-domain-mappings → 422: {"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, At least one of domain_id or specialty_id must be set","input":{"item_id":18,"onboarding_domain_id":3,"auto_assign":false,"priority":99},"ctx":{"error":{}}}]}
- IDM-5c: Gaps-Seite zeigt Fehler. Bekannte Ursache: getMappingGaps() erwartet MappingGapEntry[] aber Backend liefert {uncovered_domains:[], uncovered_specialties:[]}. gaps.filter() schlägt auf Objekt fehl.