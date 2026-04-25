## Journey: Admin Data Management Sweep — FAIL
Datum: 2026-04-25 18:33 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-adm-7f919f03-brand-without-logo | 3497 | OK |
| e2e-adm-7f919f03-brand-with-logo | 3498 | OK |
| e2e-adm-7f919f03-category-parent | 8458 | OK |
| e2e-adm-7f919f03-category-child | 8459 | OK |
| e2e-adm-7f919f03-guide-published | N/A | FEHLER/SKIP |
| e2e-adm-7f919f03-pending-owner | 3 | OK |

### Endpoint-Unterstützung
- Logo-Upload: nein (404)
- Admin-Categories: ja
- Guides: nein

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Brand ohne Logo — logo_url leer | logo_url: null | null | PASS |
| 2 | Logo-Upload | Logo hochgeladen | /api/v1/admin/brands/logo nicht gefunden (404) | SKIP |
| 3 | Category parent in Admin-Liste | categoryParentId in Liste | nicht gefunden | FAIL |

### Findings (FAIL-Einträge)
| Schritt | Erwartet | Tatsächlich |
|---|---|---|
| 3 | categoryParentId in Liste | nicht gefunden |

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-adm-7f919f03-brand-without-logo | best-effort | OK |
| e2e-adm-7f919f03-brand-with-logo | best-effort | OK |
| e2e-adm-7f919f03-category-parent | best-effort | OK |
| e2e-adm-7f919f03-category-child | best-effort | OK |
| e2e-adm-7f919f03-guide-published | best-effort | OK |
| e2e-adm-7f919f03-pending-owner | best-effort | OK |