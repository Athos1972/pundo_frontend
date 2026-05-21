# Journey Report: Kunden-Sicht Shop-Aktionen
**Date:** 2026-05-21T11:04:23.031Z
**Verdict:** SHIP

## Notes
Started: 2026-05-21T11:04:21.810Z
Finished: 2026-05-21T11:04:23.031Z
Shop slug: e2e-test-shop-1
Backend promo support: depends on BE-1–BE-4 deployment

## Step Log

| Step | Description | Expected | Actual | Status |
|------|-------------|----------|--------|--------|
| 1 | P1 — Angebotsblock fehlt ohne Aktionen | Block nicht im DOM | Block nicht im DOM | PASS |
| 2 | P2 — ShopOfferCard vorhanden | ShopOfferCard sichtbar | SKIP — kein aktives Angebot in pundo_test | SKIP |
| 3 | P3 — Preis-Format | Keine 3+ Dezimalstellen | 0 Treffer mit 3+ Stellen | PASS |
| 4 | P4 — Aktions-Badge | Badge sichtbar | SKIP — kein aktives Angebot | SKIP |
| 5 | P5 — Translations alle 6 Sprachen | Kein "undefined" im DOM | Alle Sprachen geprüft, kein undefined | PASS |