## Journey: Admin Data Management Sweep — FAIL
Datum: 2026-04-24 13:39 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-adm-06f90865-brand-without-logo | 3497 | OK |
| e2e-adm-06f90865-brand-with-logo | 3498 | OK |
| e2e-adm-06f90865-category-parent | N/A | FEHLER/SKIP |
| e2e-adm-06f90865-category-child | N/A | FEHLER/SKIP |
| e2e-adm-06f90865-guide-published | N/A | FEHLER/SKIP |
| e2e-adm-06f90865-pending-owner | 2 | OK |

### Endpoint-Unterstützung
- Logo-Upload: ja
- Admin-Categories: ja
- Guides: nein

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Brand ohne Logo — logo_url leer | logo_url: null | null | PASS |
| 2 | Brand Logo-Upload | HTTP 200/201 | HTTP 404 | FAIL |

### Findings (FAIL-Einträge)
| Schritt | Erwartet | Tatsächlich |
|---|---|---|
| 2 | HTTP 200/201 | HTTP 404 |

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-adm-06f90865-brand-without-logo | best-effort | OK |
| e2e-adm-06f90865-brand-with-logo | best-effort | OK |
| e2e-adm-06f90865-category-parent | best-effort | OK |
| e2e-adm-06f90865-category-child | best-effort | OK |
| e2e-adm-06f90865-guide-published | best-effort | OK |
| e2e-adm-06f90865-pending-owner | best-effort | OK |