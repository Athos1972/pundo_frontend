# Journey-Report: Admin Shop Create + Delete
Datum: 2026-05-21
UUID: f6a3a2ee
Shop-Name: E2E Shop f6a3a2ee
Verdict: **PASS**

## Fixtures

| Name | ID | Angelegt | Gelöscht |
|---|---|---|---|
| E2E Shop f6a3a2ee | 5148 | ja | ja |

## Schritte

| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Admin-Token Cookie gesetzt | Cookie vorhanden | admin_token=eyJhbGciOiJIUzI1NiIs... | **PASS** |
| 2 | Navigiert zu /admin/shops/new | h1 sichtbar | Shops — Add new | **PASS** |
| 3 | Name+Slug eingegeben: E2E Shop f6a3a2ee / e2e-shop-f6a3a2ee | Felder ausgefüllt | E2E Shop f6a3a2ee | **PASS** |
| 4 | Stadt: E2E-City | Feld ausgefüllt | E2E-City | **PASS** |
| 5 | Formular gespeichert → Redirect | /admin/shops | http://localhost:3500/admin/shops | **PASS** |
| 7 | Shop in Tabelle sichtbar | E2E Shop f6a3a2ee | E2E Shop f6a3a2ee | **PASS** |
| 6 | API-Verifikation: Shop angelegt | ID vorhanden | ID=5148 | **PASS** |
| 8 | Delete-Button geklickt | Confirm-Dialog erscheint | Button geklickt | **PASS** |
| 9 | Confirm-Dialog sichtbar | Dialog erscheint | Dialog sichtbar | **PASS** |
| 9 | Delete bestätigt | 204 + Liste aktualisiert | Confirm geklickt | **PASS** |
| 10 | Shop nicht mehr in Liste | Zeile weg | Zeile nicht sichtbar | **PASS** |
| 10 | API-Verifikation: Shop gelöscht | 0 Treffer in API | 0 Treffer | **PASS** |

## Findings

| Schritt | Beschreibung | Actual |
|---|---|---|
_Keine Findings._

## Cleanup

Shop #5148 via UI gelöscht ✓.
