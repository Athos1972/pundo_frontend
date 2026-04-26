## Journey: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix — FAIL
Datum: 2026-04-25 19:15 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Slug | Status |
|---|---|---|---|
| e2e-lifecycle-9a3eec1b-owner | 2 | N/A | OK |
| e2e-lifecycle-9a3eec1b-shop-A | 2216 | e2e-lifecycle-9a3eec1b-shop-a | OK |
| e2e-lifecycle-9a3eec1b-shop-B | 2217 | e2e-lifecycle-9a3eec1b-shop-b | OK |
| e2e-lifecycle-9a3eec1b-product-fixed | N/A | N/A | FEHLER |
| e2e-lifecycle-9a3eec1b-product-on-request | N/A | N/A | FEHLER |
| e2e-lifecycle-9a3eec1b-product-free | N/A | N/A | FEHLER |
| e2e-lifecycle-9a3eec1b-product-variable | N/A | N/A | FEHLER |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Shop-Owner registriert + approved | ownerId gesetzt | 2 | PASS |
| 2 | Shop-A Geo-Koordinaten | lat vorhanden | 34.9177 | PASS |
| 3 | Shop-B angelegt (minimal) | shopBId gesetzt | 2217 | PASS |
| 4 | Alle 4 Produkte angelegt | 4 Produkte | 0 angelegt | FAIL |

### Findings (FAIL-Einträge)
| Schritt | Erwartet | Tatsächlich |
|---|---|---|
| 4 | 4 Produkte | 0 angelegt |

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-lifecycle-9a3eec1b-owner | best-effort | OK |
| e2e-lifecycle-9a3eec1b-shop-A | best-effort | OK |
| e2e-lifecycle-9a3eec1b-shop-B | best-effort | OK |
| e2e-lifecycle-9a3eec1b-product-fixed | best-effort | OK |
| e2e-lifecycle-9a3eec1b-product-on-request | best-effort | OK |
| e2e-lifecycle-9a3eec1b-product-free | best-effort | OK |
| e2e-lifecycle-9a3eec1b-product-variable | best-effort | OK |