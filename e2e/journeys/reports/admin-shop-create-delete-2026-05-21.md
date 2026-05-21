# Journey-Report: Admin Shop Create + Delete
Datum: 2026-05-21
UUID: 1847e8e2
Shop-Name: E2E Shop 1847e8e2
Verdict: **PASS**

## Fixtures

| Name | ID | Angelegt | Gelöscht |
|---|---|---|---|
| E2E Shop 1847e8e2 | — | nein | ja |

## Schritte

| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Admin-Token Cookie gesetzt | Cookie vorhanden | admin_token=eyJhbGciOiJIUzI1NiIs... | **PASS** |
| 2 | Navigiert zu /admin/shops/new | h1 sichtbar | Shops — Add new | **PASS** |
| 3 | Name eingegeben: E2E Shop 1847e8e2 | Feld ausgefüllt | E2E Shop 1847e8e2 | **PASS** |
| 4 | Stadt: E2E-City | Feld ausgefüllt | E2E-City | **PASS** |

## Findings

| Schritt | Beschreibung | Actual |
|---|---|---|
_Keine Findings._

## Cleanup

Shop (nicht angelegt) via UI gelöscht ✓.
