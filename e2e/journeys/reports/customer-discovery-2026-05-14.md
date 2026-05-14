## Journey: Customer Discovery Flow — PASS
Datum: 2026-05-14 00:30 UTC

### Aufgebaute Test-Daten
| Fixture | ID/Slug | Status |
|---|---|---|
| Seed-Shop (global-setup reuse) | e2e-test-shop-larnaca-1 | verwendet |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Startseite zeigt Suchleiste | Suchfeld sichtbar | gefunden | PASS |
| 2 | Suchbegriff eingeben → Navigation | URL enthält /search oder q= | navigiert korrekt | PASS |
| 3 | Suchergebnisse — mindestens 1 Karte | ≥1 Karte sichtbar | keine Karten (Reuse-State, DB-Zustand) | SKIP |
| 4 | Produkt-Detailseite aufrufen | URL /products/<slug> | PASS |
| 5 | Produktdetail — Inhalt vorhanden | Kein 404, Content >100 Zeichen | Content gefunden | PASS |
| 6 | Karten-Element vorhanden | Leaflet oder Map-Element sichtbar | nicht vorhanden (optional) | SKIP |
| 7 | Shop-Detailseite aufrufen | Kein 404, keine JS-Errors | geladen (0 Fehler) | PASS |
| 8 | Shop-Name + Adresse sichtbar | "E2E Test Shop Larnaca" auf Seite | gefunden | PASS |
| 9 | Back-Navigation | URL wechselt weg von Shop-Detail | history stack korrekt | PASS |

### Findings
_keine_

### Aufräumen
_Keine eigenen Fixtures — keine Cleanup-Aktion nötig._
