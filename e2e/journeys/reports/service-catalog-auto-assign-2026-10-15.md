# Journey-Report: service-catalog-auto-assign

**Datum:** 2026-10-15T15:03:25.731Z
**Frontend:** http://127.0.0.1:3500
**Backend:** http://localhost:8500
**Test-Owner:** e2e-20261015150241-sca-5808@pundo-e2e.io
**Shop-ID:** 68484  **Owner-ID:** 16850

## Ergebnis: 12/13 PASS  |  1 FAIL  |  0 SKIP

## Schritte

| Schritt | Beschreibung | Erwartet | Tatsächlich | Status |
|---------|-------------|---------|------------|--------|
| AC-5a | Owner Login via API | HTTP 200 | HTTP 200 | **PASS** |
| AC-5b | Auto-seeded Listings in DB | ≥1 Listing mit source=auto_seeded | 3 auto_seeded | **PASS** |
| AC-5c | /shop-admin/offers erreichbar | URL enthält shop-admin | http://127.0.0.1:3500/shop-admin/offers | **PASS** |
| AC-5d | Badge "Vorgeschlagen" sichtbar | Amber-Badge mit Text "Vorgeschlagen"/"Suggested" | Badge: "Suggested" | **PASS** |
| AC-5e | Preis "Auf Anfrage" sichtbar | "Auf Anfrage" oder "On Request" im HTML | gefunden | **PASS** |
| S3b-1 | Vor Freigabe: Vorschläge nicht in Suche/Produktliste/Produktdetail/Shop-Detail | keine Leaks | keine Leaks | **PASS** |
| S3b-2 | Nach Freigabe: Vorschläge öffentlich sichtbar | mind. ein öffentlicher Pfad zeigt Angebote | /products?shop_id (total=3), /search best_offer, /products/by-slug/elektriker-elektroinstallation, /products/by-slug/elektriker-smart-home-einrichtung, /products/by-slug/elektriker-solaranlage-installation, /shops/{id} top_products/product_count | **PASS** |
| S5a | Owner Login | HTTP 200 | HTTP 200 | **PASS** |
| S5b | Preis via API auf 50 EUR gesetzt | PATCH erfolgreich | Fehler: Error: PATCH http://localhost:8500/api/v1/shop-owner/offers/69557 → 422: {"detail":[{"type":"string_type","loc":["body","price_tiers",0,"unit"],"msg":"Input should be a valid string","input":null},{"type":"missing","loc":["body","price_tiers",0,"steps"],"msg":"Field required","input":{"currency":"EUR","amount":50,"unit":null}}]} | **FAIL** |
| S6a | Shop-Seite erreichbar | HTTP 200, Shop-Seite sichtbar | http://127.0.0.1:3500/en/shops/e2e-20261015150241-sca-shop-acad | **PASS** |
| S6b | Listings in Customer-Sicht sichtbar | ≥1 Listing/Offer-Card | 6 product-links, 0 offer-cards | **PASS** |
| S7a | "Auf Anfrage"-Preis in Customer-Sicht | "Auf Anfrage" oder lokalisierter Text sichtbar | "Auf Anfrage" gefunden | **PASS** |
| S6c | Bilder in Customer-Sicht geladen | ≥0 Bilder (Shop hat evtl. keine Bilder) | 7 geladen | **PASS** |

## Findings

- S5b: Preis-Update fehlgeschlagen. err1="Error: PATCH http://localhost:8500/api/v1/shop-owner/shop-listings/69557/offers → 404: {"detail":"Not Found"}" err2="Error: PATCH http://localhost:8500/api/v1/shop-owner/offers/69557 → 422: {"detail":[{"type":"string_type","loc":["body","price_tiers",0,"unit"],"msg":"Input should be a valid string","input":null},{"type":"missing","loc":["body","price_tiers",0,"steps"],"msg":"Field required","input":{"currency":"EUR","amount":50,"unit":null}}]}"