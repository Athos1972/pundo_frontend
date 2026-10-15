## Journey: Customer Discovery Flow — PASS
Datum: 2026-10-15 15:03 UTC

### Aufgebaute Test-Daten
| Fixture | ID/Slug | Status |
|---|---|---|
| Seed-Shop (global-setup) | happy-pets-nicosia | verwendet |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Startseite zeigt Suchleiste | Suchfeld sichtbar | gefunden | PASS |
| 2 | Suchbegriff eingeben → Navigation | URL enthält /search oder q= | http://127.0.0.1:3500/en/search?q=Happy%20Pets%20Nicosia | PASS |
| 3 | Suchergebnisse — mindestens 1 Karte | ≥1 Karte sichtbar | 2 Karten gefunden | PASS |
| 3b | Shop-Name-Suche → Shop-Sektion | Karte für happy-pets-nicosia in der Shop-Sektion | gefunden | PASS |
| 3b | Klick auf Shop-Karte → Shop-Detailseite | URL /shops/happy-pets-nicosia, H1 sichtbar | http://127.0.0.1:3500/en/shops/happy-pets-nicosia | PASS |
| 4 | Produkt-Detailseite aufrufen | URL /products/<slug> | http://127.0.0.1:3500/en/products/avicentra-avicentra-classic-menu-budgie-1kg | PASS |
| 5 | Produktdetail — Inhalt vorhanden | Kein 404, Content >100 Zeichen | Content gefunden | PASS |
| 6 | Karten-Element vorhanden | Leaflet oder Map-Element sichtbar | nicht vorhanden (optional) | SKIP |
| 7 | Shop-Detailseite aufrufen | Kein 404, keine JS-Errors | geladen (0 Fehler) | PASS |
| 8 | Shop-Name sichtbar | "Happy Pets Nicosia" auf Seite | gefunden | PASS |
| 9 | Back-Navigation | URL wechselt weg von Shop-Detail | http://127.0.0.1:3500/en | PASS |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
_Keine eigenen Fixtures — keine Cleanup-Aktion nötig._