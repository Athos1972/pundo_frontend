## Journey: Customer Discovery Flow — FAIL
Datum: 2026-04-23 13:42 UTC

### Aufgebaute Test-Daten
| Fixture | ID/Slug | Status |
|---|---|---|
| Seed-Shop (global-setup) | e2e-test-shop-larnaca-1 | verwendet |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Startseite zeigt Suchleiste | Suchfeld sichtbar | gefunden | PASS |
| 2 | Suchbegriff eingeben → Navigation | URL enthält /search oder q= | http://localhost:3500/ | FAIL |

### Findings (FAIL-Einträge)
| Schritt | Erwartet | Tatsächlich |
|---|---|---|
| 2 | URL enthält /search oder q= | http://localhost:3500/ |

### Aufräumen
_Keine eigenen Fixtures — keine Cleanup-Aktion nötig._