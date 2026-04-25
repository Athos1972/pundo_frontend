## Journey: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix — FAIL
Datum: 2026-04-25 18:33 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Slug | Status |
|---|---|---|---|
| e2e-lifecycle-af6c710d-owner | 4 | N/A | OK |
| e2e-lifecycle-af6c710d-shop-A | 2218 | e2e-lifecycle-af6c710d-shop-a | OK |
| e2e-lifecycle-af6c710d-shop-B | 2219 | e2e-lifecycle-af6c710d-shop-b | OK |
| e2e-lifecycle-af6c710d-product-fixed | N/A | N/A | FEHLER |
| e2e-lifecycle-af6c710d-product-on-request | N/A | N/A | FEHLER |
| e2e-lifecycle-af6c710d-product-free | N/A | N/A | FEHLER |
| e2e-lifecycle-af6c710d-product-variable | N/A | N/A | FEHLER |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Shop-Owner registriert + approved | ownerId gesetzt | 4 | PASS |
| 2 | Shop-A Geo-Koordinaten | lat vorhanden | 34.9177 | PASS |
| 3 | Shop-B angelegt (minimal) | shopBId gesetzt | 2219 | PASS |
| 4 | Alle 4 Produkte angelegt | 4 Produkte | 0 angelegt | FAIL |

### Findings (FAIL-Einträge)
| Schritt | Erwartet | Tatsächlich |
|---|---|---|
| 4 | 4 Produkte | 0 angelegt |

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-lifecycle-af6c710d-owner | best-effort | OK |
| e2e-lifecycle-af6c710d-shop-A | best-effort | OK |
| e2e-lifecycle-af6c710d-shop-B | best-effort | OK |
| e2e-lifecycle-af6c710d-product-fixed | best-effort | OK |
| e2e-lifecycle-af6c710d-product-on-request | best-effort | OK |
| e2e-lifecycle-af6c710d-product-free | best-effort | OK |
| e2e-lifecycle-af6c710d-product-variable | best-effort | OK |