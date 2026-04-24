## Journey: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix — FAIL
Datum: 2026-04-24 13:42 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Slug | Status |
|---|---|---|---|
| e2e-lifecycle-cc1c7ec7-owner | 2 | N/A | OK |
| e2e-lifecycle-cc1c7ec7-shop-A | 2215 | e2e-lifecycle-cc1c7ec7-shop-a | OK |
| e2e-lifecycle-cc1c7ec7-shop-B | N/A | N/A | FEHLER |
| e2e-lifecycle-cc1c7ec7-product-fixed | N/A | N/A | FEHLER |
| e2e-lifecycle-cc1c7ec7-product-on-request | N/A | N/A | FEHLER |
| e2e-lifecycle-cc1c7ec7-product-free | N/A | N/A | FEHLER |
| e2e-lifecycle-cc1c7ec7-product-variable | N/A | N/A | FEHLER |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Shop-Owner registriert + approved | ownerId gesetzt | 2 | PASS |
| 2 | Shop-A Geo-Koordinaten | lat vorhanden | 34.9177 | PASS |
| 3 | Shop-B angelegt (minimal) | shopBId gesetzt | nicht angelegt (Admin-Create optional) | SKIP |
| 4 | Alle 4 Produkte angelegt | 4 Produkte | 0 angelegt | FAIL |
| 5 | Shop-A Detailseite erreichbar | Kein 404 | http://localhost:3500/shops/e2e-lifecycle-cc1c7ec7-shop-a | PASS |
| 6 | Shop-A Name auf Detailseite | "e2e-lifecycle-cc1c7ec7-shop-A" sichtbar | gefunden | PASS |
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
| e2e-lifecycle-cc1c7ec7-owner | best-effort | OK |
| e2e-lifecycle-cc1c7ec7-shop-A | best-effort | OK |
| e2e-lifecycle-cc1c7ec7-shop-B | best-effort | OK |
| e2e-lifecycle-cc1c7ec7-product-fixed | best-effort | OK |
| e2e-lifecycle-cc1c7ec7-product-on-request | best-effort | OK |
| e2e-lifecycle-cc1c7ec7-product-free | best-effort | OK |
| e2e-lifecycle-cc1c7ec7-product-variable | best-effort | OK |