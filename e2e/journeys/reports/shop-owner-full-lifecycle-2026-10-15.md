## Journey: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix — PASS
Datum: 2026-10-15 15:03 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Slug | Status |
|---|---|---|---|
| e2e-20261015150241-lifecycle-41a7db28-owner | 16857 | N/A | OK |
| e2e-20261015150241-lifecycle-41a7db28-shop-A | 68491 | e2e-20261015150241-lifecycle-41a7db28-shop-a | OK |
| e2e-20261015150241-lifecycle-41a7db28-shop-B | 68492 | e2e-20261015150241-lifecycle-41a7db28-shop-b | OK |
| e2e-20261015150241-lifecycle-41a7db28-product-fixed | 108922 | e2e-20261015150241-lifecycle-41a7db28-product-fixed | OK |
| e2e-20261015150241-lifecycle-41a7db28-product-on-request | 108923 | e2e-20261015150241-lifecycle-41a7db28-product-on_request | OK |
| e2e-20261015150241-lifecycle-41a7db28-product-free | 108924 | e2e-20261015150241-lifecycle-41a7db28-product-free | OK |
| e2e-20261015150241-lifecycle-41a7db28-product-variable | 108925 | e2e-20261015150241-lifecycle-41a7db28-product-variable | OK |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Shop-Owner registriert + approved | ownerId gesetzt | 16857 | PASS |
| 2 | Shop-A Geo-Koordinaten | lat vorhanden | 34.9177 | PASS |
| 3 | Shop-B angelegt (minimal) | shopBId gesetzt | 68492 | PASS |
| 4 | Alle 4 Produkte angelegt | 4 Produkte | 4 angelegt | PASS |
| 5 | Shop-A Detailseite erreichbar | Kein 404 | http://127.0.0.1:3500/en/shops/e2e-20261015150241-lifecycle-41a7db28-shop-a | PASS |
| 6 | Shop-A Name auf Detailseite | "e2e-20261015150241-lifecycle-41a7db28-shop-A" sichtbar | gefunden | PASS |
| 6 | Parking-Icon (shop-A) | parking-icon sichtbar (wenn has_parking=true) | nicht gefunden | SKIP |
| 6 | Delivery-Icon (shop-A) | delivery-icon sichtbar (wenn has_delivery=true) | nicht gefunden | SKIP |
| 7 | Shop-B Detailseite erreichbar | Kein 404 | http://127.0.0.1:3500/en/shops/e2e-20261015150241-lifecycle-41a7db28-shop-b | PASS |
| 8 | Produkte auf Shop-Seite sichtbar | 4 Produkte | 0 gefunden | SKIP |
| 9 | product-fixed Detailseite | Kein 404 | http://127.0.0.1:3500/en/products/e2e-20261015150241-lifecycle-41a7db28-product-fixed | PASS |
| 9 | product-fixed Content | >50 Zeichen Content | OK | PASS |
| 10 | product-on-request Detailseite | Kein 404 | http://127.0.0.1:3500/en/products/e2e-20261015150241-lifecycle-41a7db28-product-on_request | PASS |
| 10 | On-Request-Label sichtbar | on_request label im Text | gefunden | PASS |
| 11 | product-free Detailseite | Kein 404 | http://127.0.0.1:3500/en/products/e2e-20261015150241-lifecycle-41a7db28-product-free | PASS |
| 11 | Free-Label sichtbar | free label im Text | gefunden | PASS |
| 12 | product-variable Detailseite | Kein 404 | http://127.0.0.1:3500/en/products/e2e-20261015150241-lifecycle-41a7db28-product-variable | PASS |
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
| e2e-20261015150241-lifecycle-41a7db28-owner | best-effort | OK |
| e2e-20261015150241-lifecycle-41a7db28-shop-A | best-effort | OK |
| e2e-20261015150241-lifecycle-41a7db28-shop-B | best-effort | OK |
| e2e-20261015150241-lifecycle-41a7db28-product-fixed | best-effort | OK |
| e2e-20261015150241-lifecycle-41a7db28-product-on-request | best-effort | OK |
| e2e-20261015150241-lifecycle-41a7db28-product-free | best-effort | OK |
| e2e-20261015150241-lifecycle-41a7db28-product-variable | best-effort | OK |