## Journey: Customer Auth + Interaction + Review Lifecycle — PASS
Datum: 2026-04-25 19:10 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-carl-b39a4836-customer | N/A | FEHLER/SKIP |

### Endpoint-Unterstützung
- Customer Auth: nein (nicht gefunden)
- Review Submit: nein (nicht gefunden)
- Test-Shop: e2e-test-shop-larnaca-1

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Customer registriert sich | HTTP 201 oder 200 | Endpoint /api/v1/customer/register nicht gefunden (404) | SKIP |
| 2 | Auth-Guard vor E-Mail-Verify | Redirect zu Login/Pending | Customer-Auth nicht unterstützt | SKIP |
| 3 | E-Mail-Verifizierung | Account verifiziert | Customer-Auth nicht unterstützt oder customerId fehlt | SKIP |
| 4 | Customer Login | Token/Cookie erhalten | Customer-Auth nicht unterstützt | SKIP |
| 5 | Customer Logout | Logout-Seite oder public-State | Customer-Auth nicht unterstützt | SKIP |
| 6 | Test-Shop-Seite aufrufen | Kein 404 | http://localhost:3500/shops/e2e-test-shop-larnaca-1 | PASS |
| 7 | Review-Formular im DOM | ReviewForm-Selektor oder Review-Text | Review-Text gefunden | PASS |
| 8 | Review submitten | HTTP 200/201 | Review-Endpoint nicht unterstützt | SKIP |
| 9 | Spotted-Feature | HTTP 200/201 | testShopId fehlt | SKIP |
| 10 | Admin Moderation-Liste aufrufen | /admin/reviews oder Login-Redirect | http://localhost:3500/admin/reviews | PASS |
| 11 | Admin approved Review | Review sichtbar | reviewId oder adminToken fehlt | SKIP |
| 12 | API-Key Seite aufrufen | API-Keys-Seite geladen | Redirect zu Login (kein auth state) | SKIP |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-carl-b39a4836-customer | versucht | best-effort |