## Journey: Admin Data Management Sweep — PASS
Datum: 2026-10-14 09:36 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-20261014093505-adm-7ba05466-brand-without-logo | 3639 | OK |
| e2e-20261014093505-adm-7ba05466-brand-with-logo | 3640 | OK |
| e2e-20261014093505-adm-7ba05466-category-parent | 10762 | OK |
| e2e-20261014093505-adm-7ba05466-category-child | 10763 | OK |
| e2e-20261014093505-adm-7ba05466-guide-published | N/A | FEHLER/SKIP |
| e2e-20261014093505-adm-7ba05466-pending-owner | 3035 | OK |

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
| 4 | Category child parent_id | parent_id = 10762 | 10762 | PASS |
| 5 | Admin Categories-Seite | /admin/categories geladen | http://localhost:3500/admin/categories | PASS |
| 5 | Category-Tree-Element vorhanden | Tree/List-Element sichtbar | gefunden | PASS |
| 6 | Pending Owner ablehnen | HTTP 2xx | HTTP 200 | PASS |
| 6 | Owner-Status nach Ablehnung | status: rejected | rejected | PASS |
| 7 | Guide auf /guides | Guide sichtbar | Guides-Endpoint nicht verfügbar (404) | SKIP |
| 8 | Guide-Detailseite | Inhalt + RTL | guideSlug fehlt oder Guide nicht unterstützt | SKIP |
| 9 | Admin Brands-Seite | /admin/brands geladen | http://localhost:3500/admin/brands | PASS |
| 9 | Brand in Admin-Übersicht | "e2e-20261014093505-adm-7ba05466-brand-without-logo" sichtbar | nicht gefunden | SKIP |
| 10 | Admin-Token vorhanden | adminToken gesetzt | ja | PASS |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-20261014093505-adm-7ba05466-brand-without-logo | best-effort | OK |
| e2e-20261014093505-adm-7ba05466-brand-with-logo | best-effort | OK |
| e2e-20261014093505-adm-7ba05466-category-parent | best-effort | OK |
| e2e-20261014093505-adm-7ba05466-category-child | best-effort | OK |
| e2e-20261014093505-adm-7ba05466-guide-published | best-effort | OK |
| e2e-20261014093505-adm-7ba05466-pending-owner | best-effort | OK |