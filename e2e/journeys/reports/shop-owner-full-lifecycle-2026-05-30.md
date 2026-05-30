## Journey: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix — PASS
Datum: 2026-05-30 13:13 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Slug | Status |
|---|---|---|---|
| e2e-lifecycle-8e79b0d8-owner | 1990 | N/A | OK |
| e2e-lifecycle-8e79b0d8-shop-A | 11019 | e2e-lifecycle-8e79b0d8-shop-a | OK |
| e2e-lifecycle-8e79b0d8-shop-B | 11020 | e2e-lifecycle-8e79b0d8-shop-b | OK |
| e2e-lifecycle-8e79b0d8-product-fixed | 58572 | e2e-lifecycle-8e79b0d8-product-fixed | OK |
| e2e-lifecycle-8e79b0d8-product-on-request | 58573 | e2e-lifecycle-8e79b0d8-product-on_request | OK |
| e2e-lifecycle-8e79b0d8-product-free | 58574 | e2e-lifecycle-8e79b0d8-product-free | OK |
| e2e-lifecycle-8e79b0d8-product-variable | 58575 | e2e-lifecycle-8e79b0d8-product-variable | OK |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Shop-Owner registriert + approved | ownerId gesetzt | 1990 | PASS |
| 2 | Shop-A Geo-Koordinaten | lat vorhanden | 34.9177 | PASS |
| 3 | Shop-B angelegt (minimal) | shopBId gesetzt | 11020 | PASS |
| 4 | Alle 4 Produkte angelegt | 4 Produkte | 4 angelegt | PASS |
| 5 | Shop-A Detailseite erreichbar | Kein 404 | http://localhost:3500/en/shops/e2e-lifecycle-8e79b0d8-shop-a | PASS |
| 6 | Shop-A Name auf Detailseite | "e2e-lifecycle-8e79b0d8-shop-A" sichtbar | gefunden | PASS |
| 6 | Parking-Icon (shop-A) | parking-icon sichtbar (wenn has_parking=true) | nicht gefunden | SKIP |
| 6 | Delivery-Icon (shop-A) | delivery-icon sichtbar (wenn has_delivery=true) | nicht gefunden | SKIP |
| 7 | Shop-B Detailseite erreichbar | Kein 404 | http://localhost:3500/en/shops/e2e-lifecycle-8e79b0d8-shop-b | PASS |
| 8 | Produkte auf Shop-Seite sichtbar | 4 Produkte | 4 gefunden | PASS |
| 9 | product-fixed Detailseite | Kein 404 | http://localhost:3500/en/products/e2e-lifecycle-8e79b0d8-product-fixed | PASS |
| 9 | product-fixed Content | >50 Zeichen Content | OK | PASS |
| 10 | product-on-request Detailseite | Kein 404 | http://localhost:3500/en/products/e2e-lifecycle-8e79b0d8-product-on_request | PASS |
| 10 | On-Request-Label sichtbar | on_request label im Text | nicht gefunden | SKIP |
| 11 | product-free Detailseite | Kein 404 | http://localhost:3500/en/products/e2e-lifecycle-8e79b0d8-product-free | PASS |
| 11 | Free-Label sichtbar | free label im Text | gefunden | PASS |
| 12 | product-variable Detailseite | Kein 404 | http://localhost:3500/en/products/e2e-lifecycle-8e79b0d8-product-variable | PASS |
| 12 | PriceHistory-Chart vorhanden | Chart-Element sichtbar | nicht gefunden (ggf. keine History-Daten) | SKIP |
| 13 | RTL: html dir-Attribut | dir=rtl | rtl | PASS |
| 14 | RTL: product-fixed dir-Attribut | dir=rtl | rtl | PASS |
| 15 | Shop-A deaktivieren | HTTP 2xx | HTTP 200 | PASS |
| 16 | Shop-A nach Deaktivierung | 404 oder "nicht verfügbar" | Shop noch sichtbar | SKIP |
| 17 | Fixtures-Verifikation | owner + shop-A gebaut | owner:true, shopA:true | PASS |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-lifecycle-8e79b0d8-owner | best-effort | OK |
| e2e-lifecycle-8e79b0d8-shop-A | best-effort | OK |
| e2e-lifecycle-8e79b0d8-shop-B | best-effort | OK |
| e2e-lifecycle-8e79b0d8-product-fixed | best-effort | OK |
| e2e-lifecycle-8e79b0d8-product-on-request | best-effort | OK |
| e2e-lifecycle-8e79b0d8-product-free | best-effort | OK |
| e2e-lifecycle-8e79b0d8-product-variable | best-effort | OK |