# Journey-Report: Admin Shop Create + Delete
Datum: 2026-10-14
UUID: a2cec740
Shop-Name: E2E-20261014223629-ADMIN-SHOP-Shop-b8fb
Verdict: **PASS**

## Fixtures

| Name | ID | Angelegt | Gelöscht |
|---|---|---|---|
| E2E-20261014223629-ADMIN-SHOP-Shop-b8fb | 24969 | ja | ja |

## Schritte

| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Admin-Token Cookie gesetzt | Cookie vorhanden | admin_token=eyJhbGciOiJIUzI1NiIs... | **PASS** |
| 2 | Navigiert zu /admin/shops/new | h1 sichtbar | Shops — Add new | **PASS** |
| 3 | Name+Slug eingegeben: E2E-20261014223629-ADMIN-SHOP-Shop-b8fb / e2e-20261014223629-admin-shop-shop-f48d | Felder ausgefüllt | E2E-20261014223629-ADMIN-SHOP-Shop-b8fb | **PASS** |
| 4 | Stadt: E2E-City | Feld ausgefüllt | E2E-City | **PASS** |
| 5 | Formular gespeichert → Redirect | /admin/shops | http://localhost:3500/admin/shops | **PASS** |
| 7 | Shop in Tabelle sichtbar | E2E-20261014223629-ADMIN-SHOP-Shop-b8fb | E2E-20261014223629-ADMIN-SHOP-Shop-b8fb | **PASS** |
| 6 | API-Verifikation: Shop angelegt | ID vorhanden | ID=24969 | **PASS** |
| 8 | Delete-Button geklickt | Confirm-Dialog erscheint | Button geklickt | **PASS** |
| 9 | Confirm-Dialog sichtbar | Dialog erscheint | Dialog sichtbar | **PASS** |
| 9 | Delete bestätigt | 204 + Redirect auf /admin/shops | Confirm geklickt | **PASS** |
| 10 | Shop nicht mehr in Liste | Zeile weg | Zeile nicht sichtbar | **PASS** |
| 10 | API-Verifikation: Shop gelöscht | 0 Treffer in API | 0 Treffer | **PASS** |

## Findings

| Schritt | Beschreibung | Actual |
|---|---|---|
_Keine Findings._

## Cleanup

Shop #24969 via UI gelöscht ✓.
