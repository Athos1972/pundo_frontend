# Journey-Report: service-catalog-auto-assign

**Datum:** 2026-05-21T18:28:23.251Z
**Frontend:** http://localhost:3500
**Backend:** http://localhost:8500
**Test-Owner:** e2e-sca-4b662bd7@pundo-e2e.io
**Shop-ID:** 8697  **Owner-ID:** 1327

## Ergebnis: 4/5 PASS  |  0 FAIL  |  1 SKIP

## Schritte

| Schritt | Beschreibung | Erwartet | Tatsächlich | Status |
|---------|-------------|---------|------------|--------|
| S5 | Preis-Edit | auto_seeded Listing vorhanden | kein autoListingId — vorheriger Test fehlgeschlagen | **SKIP** |
| S6a | Shop-Seite erreichbar | HTTP 200, Shop-Seite sichtbar | http://localhost:3500/en/shops/e2e-sca-shop-4b662bd7 | **PASS** |
| S6b | Listings in Customer-Sicht sichtbar | ≥1 Listing/Offer-Card | 3 product-links, 0 offer-cards | **PASS** |
| S7a | "Auf Anfrage"-Preis in Customer-Sicht | "Auf Anfrage" oder lokalisierter Text sichtbar | "Auf Anfrage" gefunden | **PASS** |
| S6c | Bilder in Customer-Sicht geladen | ≥0 Bilder (Shop hat evtl. keine Bilder) | 12 geladen | **PASS** |