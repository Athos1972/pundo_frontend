# Journey Report: customer-shop-all-products-flow
**Datum:** 2026-10-15
**Verdict:** PASS (37/37 Steps)
**Bug:** B5900-004 — shop_id-Modus in SearchContent

## Fixtures
| Fixture | Wert |
|---|---|
| Shop-Slug (Ebene 1, Spec-Shop A) | e2e-20261015150241-allprod-a-ea3f |
| Shop-ID | 68480 |
| Produkte im Spec-Shop A | 3 (Multi-Shop: Shop B listet Produkt 1 zu 1.00) |
| Ebene 2 (Realdaten) | manjo-pet-087d8709, anna-s-bakery, o-phournos-tes-annas |

## Schritt-Protokoll
| Schritt | Erwartet | Tatsächlich | Status |
|---|---|---|---|
| A1 HTTP-Status | 200 | 200 | **PASS** |
| A2 H1 Shop-Name | Nicht leer | E2E-20261015150241-ALLPROD-A Shop | **PASS** |
| A3 Keine JS-Errors | 0 kritische Errors | 0 | **PASS** |
| B1 Top-Products sichtbar | ≥1 Produkt-Link | 6 | **PASS** |
| B2 Alle-Link href | /en/search?shop_id=68480 | /en/search?shop_id=68480 | **PASS** |
| B3 Link-Text I18n (EN) | Text ≠ "Alle" | All → | **PASS** |
| B4 Link-Text EN = "All →" | "All →" | All → | **PASS** |
| B5 Link-Text DE = "Alle →" | "Alle →" | Alle → | **PASS** |
| C1a Navigation | /en/search?shop_id=68480 | http://127.0.0.1:3500/en/search?shop_id=68480 | **PASS** |
| C1b Produkte sichtbar | ≥1 Produkt-Link | 3 | **PASS** |
| C1c API shop_id-Request | /api/v1/products?shop_id=68480 | http://127.0.0.1:3500/api/v1/products?shop_id=68480&lat=34.9009&lng=33.623&limit=20&offset=0 | **PASS** |
| C2 searchAll nicht aufgerufen | 0 /search Calls | 0 | **PASS** |
| D1 category_id-Modus | /api/v1/products?category_id=5947 aufgerufen | http://127.0.0.1:3500/api/v1/products?category_id=5947&lat=34.9009&lng=33.623&limit=20&offset=0 | **PASS** |
| E1 seed nur eigene Angebote | 0 fremde/fehlende best_offer | 0 | **PASS** |
| E1 seed product_count == total | 3 | 3 | **PASS** |
| E1 seed +geo nur eigene Angebote | 0 fremde/fehlende best_offer | 0 | **PASS** |
| E1 seed +geo product_count == total | 3 | 3 | **PASS** |
| E1 manjo-pet-087d8709 nur eigene Angebote | 0 fremde/fehlende best_offer | 0 | **PASS** |
| E1 manjo-pet-087d8709 +geo nur eigene Angebote | 0 fremde/fehlende best_offer | 0 | **PASS** |
| E1 anna-s-bakery nur eigene Angebote | 0 fremde/fehlende best_offer | 0 | **PASS** |
| E1 anna-s-bakery product_count == total | 4 | 4 | **PASS** |
| E1 anna-s-bakery +geo nur eigene Angebote | 0 fremde/fehlende best_offer | 0 | **PASS** |
| E1 anna-s-bakery +geo product_count == total | 4 | 4 | **PASS** |
| E1 o-phournos-tes-annas nur eigene Angebote | 0 fremde/fehlende best_offer | 0 | **PASS** |
| E1 o-phournos-tes-annas product_count == total | 3 | 3 | **PASS** |
| E1 o-phournos-tes-annas +geo nur eigene Angebote | 0 fremde/fehlende best_offer | 0 | **PASS** |
| E1 o-phournos-tes-annas +geo product_count == total | 3 | 3 | **PASS** |
| E2 seed nur eigene Shop-Links | 0 fremde | 0 | **PASS** |
| E2 seed Kartenanzahl | >= 3 | 6 | **PASS** |
| E2 anna-s-bakery nur eigene Shop-Links | 0 fremde | 0 | **PASS** |
| E2 anna-s-bakery Kartenanzahl | >= 4 | 10 | **PASS** |
| E2 o-phournos-tes-annas nur eigene Shop-Links | 0 fremde | 0 | **PASS** |
| E2 o-phournos-tes-annas Kartenanzahl | >= 3 | 6 | **PASS** |
| E3 seed Anzahl Karten | 3 | 3 | **PASS** |
| E3 seed nur eigene Shop-Links | 0 fremde | 0 | **PASS** |
| E3 anna-s-bakery Anzahl Karten | 4 | 4 | **PASS** |
| E3 anna-s-bakery nur eigene Shop-Links | 0 fremde | 0 | **PASS** |

## Findings
— Keine Findings. B5900-004 erfolgreich regressionsfrei.

## Cleanup
Spec-Shops A und B werden im afterAll per Admin-Delete entfernt (kaskadiert Listings, Offers, exklusive Items). Ebene 2 liest nur.
