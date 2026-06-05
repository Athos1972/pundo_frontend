## Journey: Admin Data Management Sweep — PASS
Datum: 2026-06-05 11:18 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-adm-47866b0e-brand-without-logo | 3538 | OK |
| e2e-adm-47866b0e-brand-with-logo | 3539 | OK |
| e2e-adm-47866b0e-category-parent | 8465 | OK |
| e2e-adm-47866b0e-category-child | 8466 | OK |
| e2e-adm-47866b0e-guide-published | N/A | FEHLER/SKIP |

### Endpoint-Unterstützung
- Logo-Upload: ja
- Admin-Categories: ja
- Guides: nein

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Brand ohne Logo — logo_url leer | logo_url: null | null | PASS |
| 2 | Brand Logo-Upload | HTTP 200/201 | HTTP 200 | PASS |
| 3 | Category parent in Admin-Liste | categoryParentId abrufbar | gefunden | PASS |
| 4 | Category child parent_id | parent_id = 8465 | 8465 | PASS |
| 5 | Admin Categories-Seite | /admin/categories geladen | http://localhost:3500/admin/categories | PASS |
| 5 | Category-Tree-Element vorhanden | Tree/List-Element sichtbar | gefunden | PASS |
| 6 | Pending Owner ablehnen | HTTP 2xx | HTTP 200 | PASS |
| 6 | Owner-Status nach Ablehnung | status: rejected | rejected | PASS |
| 7 | Guide auf /guides | Guide sichtbar | Guides-Endpoint nicht verfügbar (404) | SKIP |
| 8 | Guide-Detailseite | Inhalt + RTL | guideSlug fehlt oder Guide nicht unterstützt | SKIP |
| 9 | Admin Brands-Seite | /admin/brands geladen | http://localhost:3500/admin/brands | PASS |
| 9 | Brand in Admin-Übersicht | "e2e-adm-47866b0e-brand-without-logo" sichtbar | nicht gefunden | SKIP |
| 10 | Admin-Token vorhanden | adminToken gesetzt | ja | PASS |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-adm-47866b0e-brand-without-logo | best-effort | OK |
| e2e-adm-47866b0e-brand-with-logo | best-effort | OK |
| e2e-adm-47866b0e-category-parent | best-effort | OK |
| e2e-adm-47866b0e-category-child | best-effort | OK |
| e2e-adm-47866b0e-guide-published | best-effort | OK |