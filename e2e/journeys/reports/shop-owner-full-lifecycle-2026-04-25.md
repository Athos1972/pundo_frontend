## Journey: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix — FAIL
Datum: 2026-04-25 14:57 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Slug | Status |
|---|---|---|---|
| e2e-lifecycle-0ea46dcf-owner | 4 | N/A | OK |
| e2e-lifecycle-0ea46dcf-shop-A | 2218 | e2e-lifecycle-0ea46dcf-shop-a | OK |
| e2e-lifecycle-0ea46dcf-shop-B | N/A | N/A | FEHLER |
| e2e-lifecycle-0ea46dcf-product-fixed | N/A | N/A | FEHLER |
| e2e-lifecycle-0ea46dcf-product-on-request | N/A | N/A | FEHLER |
| e2e-lifecycle-0ea46dcf-product-free | N/A | N/A | FEHLER |
| e2e-lifecycle-0ea46dcf-product-variable | N/A | N/A | FEHLER |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Shop-Owner registriert + approved | ownerId gesetzt | 4 | PASS |
| 2 | Shop-A Geo-Koordinaten | lat vorhanden | 34.9177 | PASS |
| 3 | Shop-B angelegt (minimal) | shopBId gesetzt | nicht angelegt (Admin-Create optional) | SKIP |
| 4 | Alle 4 Produkte angelegt | 4 Produkte | 0 angelegt | FAIL |
| 5 | Shop-A Detailseite erreichbar | Kein 404 | http://localhost:3500/shops/e2e-lifecycle-0ea46dcf-shop-a | PASS |
| 6 | Shop-A Name auf Detailseite | "e2e-lifecycle-0ea46dcf-shop-A" sichtbar | gefunden | PASS |
| 6 | Parking-Icon (shop-A) | parking-icon sichtbar (wenn has_parking=true) | nicht gefunden | SKIP |
| 6 | Delivery-Icon (shop-A) | delivery-icon sichtbar (wenn has_delivery=true) | nicht gefunden | SKIP |
| 7 | Shop-B minimal Checks | Fallback-Avatar sichtbar | shopBSlug fehlt (shop-B nicht angelegt) | SKIP |
| 8 | Produkte auf Shop-Seite sichtbar | 0 Produkte | 0 gefunden | SKIP |
| 9 | product-fixed Detailseite | Preis + Available-Badge | productFixedSlug fehlt | SKIP |
| 10 | product-on-request Detailseite | On-Request-Label | Slug fehlt | SKIP |
| 11 | product-free Detailseite | Free-Label | Slug fehlt | SKIP |
| 12 | product-variable Detailseite | PriceHistory-Chart | Slug fehlt | SKIP |
| 13 | RTL: html dir-Attribut | dir=rtl | rtl | PASS |
| 14 | RTL-Test product-fixed | html[dir=rtl] | productFixedSlug fehlt | SKIP |
| 15 | Shop-A deaktivieren | HTTP 2xx | HTTP 200 | PASS |
| 16 | Shop-A nach Deaktivierung | 404 oder "nicht verfügbar" | Shop noch sichtbar | SKIP |
| 17 | Fixtures-Verifikation | owner + shop-A gebaut | owner:true, shopA:true | PASS |

### Findings (FAIL-Einträge)
| Schritt | Erwartet | Tatsächlich |
|---|---|---|
| 4 | 4 Produkte | 0 angelegt |

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-lifecycle-0ea46dcf-owner | best-effort | OK |
| e2e-lifecycle-0ea46dcf-shop-A | best-effort | OK |
| e2e-lifecycle-0ea46dcf-shop-B | best-effort | OK |
| e2e-lifecycle-0ea46dcf-product-fixed | best-effort | OK |
| e2e-lifecycle-0ea46dcf-product-on-request | best-effort | OK |
| e2e-lifecycle-0ea46dcf-product-free | best-effort | OK |
| e2e-lifecycle-0ea46dcf-product-variable | best-effort | OK |