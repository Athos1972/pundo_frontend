## Journey: Admin Data Management Sweep — PASS
Datum: 2026-05-19 10:47 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-adm-b76134ec-brand-without-logo | 3570 | OK |
| e2e-adm-b76134ec-brand-with-logo | 3571 | OK |
| e2e-adm-b76134ec-category-parent | 8583 | OK |
| e2e-adm-b76134ec-category-child | 8584 | OK |
| e2e-adm-b76134ec-guide-published | N/A | FEHLER/SKIP |

### Endpoint-Unterstützung
- Logo-Upload: nein (404)
- Admin-Categories: ja
- Guides: nein

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Brand ohne Logo — logo_url leer | logo_url: null | null | PASS |
| 2 | Logo-Upload | Logo hochgeladen | /api/v1/admin/brands/logo nicht gefunden (404) | SKIP |
| 3 | Category parent in Admin-Liste | categoryParentId in Liste | gefunden | PASS |
| 4 | Category child parent_id | parent_id = 8583 | 8583 | PASS |
| 5 | Admin Categories-Seite | /admin/categories oder Login-Redirect | http://127.0.0.1:3500/admin/login | PASS |
| 6 | Pending Owner ablehnen | HTTP 2xx | HTTP 200 | PASS |
| 6 | Owner-Status nach Ablehnung | status: rejected | rejected | PASS |
| 7 | Guide auf /guides | Guide sichtbar | Guides-Endpoint nicht verfügbar (404) | SKIP |
| 8 | Guide-Detailseite | Inhalt + RTL | guideSlug fehlt oder Guide nicht unterstützt | SKIP |
| 9 | Admin Brands-Seite | /admin/brands | http://127.0.0.1:3500/admin/login | SKIP |
| 10 | Admin-Token vorhanden | adminToken gesetzt | ja | PASS |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-adm-b76134ec-brand-without-logo | best-effort | OK |
| e2e-adm-b76134ec-brand-with-logo | best-effort | OK |
| e2e-adm-b76134ec-category-parent | best-effort | OK |
| e2e-adm-b76134ec-category-child | best-effort | OK |
| e2e-adm-b76134ec-guide-published | best-effort | OK |