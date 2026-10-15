## Journey: Customer Auth + Interaction + Review Lifecycle — PASS
Datum: 2026-10-15 15:03 UTC

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Signup | 201, is_verified=true | HTTP 201 | PASS |
| 2 | Auth-Guard /account | Redirect zu /auth/login | http://127.0.0.1:3500/auth/login | PASS |
| 3 | Login + /me | 200 + eigener Account | HTTP 200/200 | PASS |
| 4 | Logout | Set-Cookie loescht customer_token | customer_token=""; expires=Thu, 15 Oct 2026 15:03:11 GMT; Ma | PASS |
| 5 | Shop-Seite + Review-Bereich | 200, kein JS-Fehler, Review-Text | HTTP 200, 0 Fehler | PASS |
| 6 | Review abgeben | 201 und öffentlich gelistet | HTTP 201, sichtbar=true | PASS |
| 7 | Admin /admin/reviews | Seite geladen (kein Login-Redirect) | http://127.0.0.1:3500/admin/reviews | PASS |
| 8 | Moderation invalidate/restore | weg nach invalidate, wieder da nach restore | wiederhergestellt=true | PASS |

### Aufräumen
Spec-Shop per Admin-Delete entfernt; Kunde e2e-20261015150241-carl-6e8d4d72@pundo.com räumt der Teardown (Marker e2e-20261015150241-).