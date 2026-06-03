## Journey: Reaktive Sprachnavigation: Labels ohne Reload (E2E-08) — PASS
Datum: 2026-06-03 11:48 UTC
Dauer: 12s

### Aufgebaute Test-Daten
| Fixture | ID/Slug | Status |
|---|---|---|
| keine (Live-DB read-only) | — | OK |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Ausgangszustand /de — Header-Nav erstes Label | Anbieter | Anbieter | PASS |
| 2 | Ausgangszustand /de — Footer enthält "Für Anbieter" | sichtbar | true | PASS |
| 3 | Ausgangszustand /de — Footer enthält "Ratgeber" | sichtbar | true | PASS |
| 4 | AC1 — Nach EN-Klick: Header-Nav erstes Label | Businesses | Businesses | PASS |
| 5 | AC2 — Nach EN-Klick: Footer enthält "For Businesses" | sichtbar | true | PASS |
| 6 | AC2 — Nach EN-Klick: Footer enthält "Guides" | sichtbar | true | PASS |
| 7 | AC3 — Nach DE-Klick: Header-Nav erstes Label | Anbieter | Anbieter | PASS |
| 8 | AC3 — Nach DE-Klick: Footer enthält "Für Anbieter" | sichtbar | true | PASS |
| 9 | AC4 — Nach AR-Klick: html[dir] | rtl | rtl | PASS |
| 10 | AC4 — Nach AR-Klick: Header-Nav enthält arabisches Label | sichtbar | true | PASS |
| 11 | AC5 — Nach Refresh auf /en: Header-Nav erstes Label | Businesses | Businesses | PASS |

### Findings (FAIL-Einträge)
_keine_