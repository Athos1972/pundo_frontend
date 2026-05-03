## Journey: Admin Data Management Sweep — PASS
Datum: 2026-05-03 18:55 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-adm-0b0d774a-brand-without-logo | 3 | OK |
| e2e-adm-0b0d774a-brand-with-logo | 4 | OK |
| e2e-adm-0b0d774a-category-parent | 3 | OK |
| e2e-adm-0b0d774a-category-child | 4 | OK |
| e2e-adm-0b0d774a-guide-published | N/A | FEHLER/SKIP |

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
| 4 | Category child parent_id | parent_id = 3 | 3 | PASS |
| 5 | Admin Categories-Seite | /admin/categories oder Login-Redirect | http://localhost:3500/admin/login | PASS |
| 6 | Pending Owner ablehnen | HTTP 2xx | HTTP 200 | PASS |
| 6 | Owner-Status nach Ablehnung | status: rejected | rejected | PASS |
| 7 | Guide auf /guides | Guide sichtbar | Guides-Endpoint nicht verfügbar (404) | SKIP |
| 8 | Guide-Detailseite | Inhalt + RTL | guideSlug fehlt oder Guide nicht unterstützt | SKIP |
| 9 | Admin Brands-Seite | /admin/brands | http://localhost:3500/admin/login | SKIP |
| 10 | Admin-Token vorhanden | adminToken gesetzt | ja | PASS |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-adm-0b0d774a-brand-without-logo | best-effort | OK |
| e2e-adm-0b0d774a-brand-with-logo | best-effort | OK |
| e2e-adm-0b0d774a-category-parent | best-effort | OK |
| e2e-adm-0b0d774a-category-child | best-effort | OK |
| e2e-adm-0b0d774a-guide-published | best-effort | OK |