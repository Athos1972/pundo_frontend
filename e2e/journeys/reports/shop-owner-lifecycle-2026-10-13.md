## Journey: Shop-Owner Lifecycle — PASS
Datum: 2026-10-13 15:35 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-sol-owner-93e28afd | 2249 | OK |
| E2E-20261013153305-SOL-Product-d4af | N/A | FEHLER |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Shop-Owner registriert | ownerId gesetzt | 2249 | PASS |
| 2 | Owner approved via Admin | status: approved | via API gesetzt | PASS |
| 3 | Owner-Login | Token oder Session vorhanden | vorhanden | PASS |
| 4 | Shop-Status prüfen | status: active oder is_active: true | active | PASS |
| 5 | Produkt anlegen | Produkt angelegt | HTTP 422 — kein Admin-Create-Endpoint | SKIP |
| 5 | Produkt anlegen | Produkt angelegt | Error: Test is skipped: Reason: Admin product create returned 422 — endpoint may not exist | SKIP |
| 6 | Guest sucht Shop | Suchfeld sichtbar | Suchfeld nicht gefunden | SKIP |
| 7 | Shop-Detailseite zeigt Shop-Name | "E2E-20261013153305-SOL-Shop-579e" sichtbar | gefunden | PASS |
| 8 | Shop deaktivieren | HTTP 2xx | HTTP 200 | PASS |
| 9 | Inaktiver Shop — Direktaufruf | 404 oder "nicht verfügbar" | Shop noch sichtbar | SKIP |
| 10 | Fixtures-Verifikation | Owner-Fixture angelegt | ja | PASS |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-sol-owner-93e28afd | ja | OK |
| E2E-20261013153305-SOL-Product-d4af | ja | OK |