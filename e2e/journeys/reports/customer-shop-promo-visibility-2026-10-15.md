# Journey Report: Kunden-Sicht Shop-Aktionen
**Date:** 2026-10-15T15:03:22.591Z
**Verdict:** SHIP

## Notes
Started: 2026-10-15T15:03:18.631Z
Finished: 2026-10-15T15:03:22.591Z
Shops: e2e-20261015150241-promo-none-2b8b (ohne Aktion), e2e-20261015150241-promo-on-2a93 (mit Aktion)

## Step Log

| Step | Description | Expected | Actual | Status |
|------|-------------|----------|--------|--------|
| 1 | P1 — Angebotsblock fehlt ohne Aktionen | Block nicht im DOM | Block nicht im DOM | PASS |
| 2 | P2 — ShopOfferCard vorhanden | ShopOfferCard sichtbar | Card sichtbar mit Preis | PASS |
| 3 | P3 — Preis-Format | Keine 3+ Dezimalstellen | 0 Treffer mit 3+ Stellen | PASS |
| 4 | P4 — Aktions-Badge | Badge + Strikethrough sichtbar | Badge und <s> vorhanden | PASS |
| 5 | P5 — Translations alle 6 Sprachen | Kein "undefined" im DOM | Alle Sprachen geprüft, kein undefined | PASS |