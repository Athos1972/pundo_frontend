# Journey Report: Kunden-Sicht Shop-Aktionen
**Date:** 2026-05-20T13:15:04.229Z
**Verdict:** SHIP

## Notes
Started: 2026-05-20T13:14:57.215Z
Finished: 2026-05-20T13:15:04.229Z
Shop slug: e2e-test-shop
Backend promo support: depends on BE-1–BE-4 deployment

## Step Log

| Step | Description | Expected | Actual | Status |
|------|-------------|----------|--------|--------|
| 1 | P1 — Angebotsblock fehlt ohne Aktionen | Block nicht im DOM | Block vorhanden (Prod-Daten mit aktivem Angebot?) | SKIP |
| 2 | P2 — ShopOfferCard vorhanden | ShopOfferCard sichtbar | Card sichtbar mit Preis | PASS |
| 3 | P3 — Preis-Format | Keine 3+ Dezimalstellen | 0 Treffer mit 3+ Stellen | PASS |
| 4 | P4 — Aktions-Badge | Badge + Strikethrough sichtbar | Badge und <s> vorhanden | PASS |
| 5 | P5 — Translations alle 6 Sprachen | Kein "undefined" im DOM | Alle Sprachen geprüft, kein undefined | PASS |