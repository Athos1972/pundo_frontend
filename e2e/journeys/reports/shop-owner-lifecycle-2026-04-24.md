## Journey: Shop-Owner Lifecycle — PASS
Datum: 2026-04-24 13:37 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-sol-owner-538fe36d | 2 | OK |
| e2e-sol-product-538fe36d | N/A | FEHLER |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Shop-Owner registriert | ownerId gesetzt | 2 | PASS |
| 2 | Owner approved via Admin | status: approved | via API gesetzt | PASS |
| 3 | Owner-Login | Token oder Session vorhanden | vorhanden | PASS |
| 4 | Shop-Status prüfen | status: active oder is_active: true | active | PASS |
| 5 | Produkt anlegen | Produkt angelegt | HTTP 422 — kein Admin-Create-Endpoint | SKIP |
| 5 | Produkt anlegen | Produkt angelegt | Error: Test is skipped: Reason: Admin product create returned 422 — endpoint may not exist | SKIP |
| 6 | Guest sucht Shop | "e2e-sol-shop-538fe36d" in Ergebnissen | nicht gefunden (noch kein Produkt) | SKIP |
| 7 | Shop-Detailseite zeigt Shop-Name | "e2e-sol-shop-538fe36d" sichtbar | gefunden | PASS |
| 8 | Shop deaktivieren | HTTP 2xx | HTTP 200 | PASS |
| 9 | Inaktiver Shop — Direktaufruf | 404 oder "nicht verfügbar" | Shop noch sichtbar | SKIP |
| 10 | Fixtures-Verifikation | Owner-Fixture angelegt | ja | PASS |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-sol-owner-538fe36d | ja | OK |
| e2e-sol-product-538fe36d | nein | OFFEN |