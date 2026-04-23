## Journey: Admin Data Management Sweep — FAIL
Datum: 2026-04-23 13:48 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-adm-eb59d54b-brand-without-logo | N/A | FEHLER/SKIP |
| e2e-adm-eb59d54b-brand-with-logo | N/A | FEHLER/SKIP |
| e2e-adm-eb59d54b-category-parent | N/A | FEHLER/SKIP |
| e2e-adm-eb59d54b-category-child | N/A | FEHLER/SKIP |
| e2e-adm-eb59d54b-guide-published | N/A | FEHLER/SKIP |
| e2e-adm-eb59d54b-pending-owner | 2 | OK |

### Endpoint-Unterstützung
- Logo-Upload: ja
- Admin-Categories: ja
- Guides: nein

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Brand ohne Logo anlegen | brandId gesetzt | POST /api/v1/admin/brands fehlgeschlagen | FAIL |

### Findings (FAIL-Einträge)
| Schritt | Erwartet | Tatsächlich |
|---|---|---|
| 1 | brandId gesetzt | POST /api/v1/admin/brands fehlgeschlagen |

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-adm-eb59d54b-brand-without-logo | best-effort | OK |
| e2e-adm-eb59d54b-brand-with-logo | best-effort | OK |
| e2e-adm-eb59d54b-category-parent | best-effort | OK |
| e2e-adm-eb59d54b-category-child | best-effort | OK |
| e2e-adm-eb59d54b-guide-published | best-effort | OK |
| e2e-adm-eb59d54b-pending-owner | best-effort | OK |