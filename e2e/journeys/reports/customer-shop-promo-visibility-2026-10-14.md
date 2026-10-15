# Journey Report: Kunden-Sicht Shop-Aktionen
**Date:** 2026-10-14T22:38:45.561Z
**Verdict:** SHIP

## Notes
Started: 2026-10-14T22:38:42.765Z
Finished: 2026-10-14T22:38:45.561Z
Shops: e2e-20261014223629-promo-none-1ef3 (ohne Aktion), e2e-20261014223629-promo-on-4426 (mit Aktion)

## Step Log

| Step | Description | Expected | Actual | Status |
|------|-------------|----------|--------|--------|
| 1 | P1 — Angebotsblock fehlt ohne Aktionen | Block nicht im DOM | Block nicht im DOM | PASS |
| 2 | P2 — ShopOfferCard vorhanden | ShopOfferCard sichtbar | Card sichtbar mit Preis | PASS |
| 3 | P3 — Preis-Format | Keine 3+ Dezimalstellen | 0 Treffer mit 3+ Stellen | PASS |
| 4 | P4 — Aktions-Badge | Badge + Strikethrough sichtbar | Badge und <s> vorhanden | PASS |
| 5 | P5 — Translations alle 6 Sprachen | Kein "undefined" im DOM | Alle Sprachen geprüft, kein undefined | PASS |