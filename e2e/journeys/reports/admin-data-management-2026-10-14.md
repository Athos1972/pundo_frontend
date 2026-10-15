## Journey: Admin Data Management Sweep — PASS
Datum: 2026-10-14 22:38 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-20261014223629-adm-5573fa0a-brand-without-logo | 4079 | OK |
| e2e-20261014223629-adm-5573fa0a-brand-with-logo | 4080 | OK |
| e2e-20261014223629-adm-5573fa0a-category-parent | 21693 | OK |
| e2e-20261014223629-adm-5573fa0a-category-child | 21694 | OK |
| e2e-20261014223629-adm-5573fa0a-pending-owner | 6964 | OK |

### Endpoint-Unterstützung
- Logo-Upload: ja
- Admin-Categories: ja

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Brand ohne Logo — logo_url leer | logo_url: null | null | PASS |
| 2 | Brand Logo-Upload | HTTP 200/201 | HTTP 200 | PASS |
| 3 | Category parent in Admin-Liste | categoryParentId abrufbar | gefunden | PASS |
| 4 | Category child parent_id | parent_id = 21693 | 21693 | PASS |
| 5 | Admin Categories-Seite | /admin/categories geladen | http://localhost:3500/admin/categories | PASS |
| 5 | Category-Tree-Element vorhanden | Tree/List-Element sichtbar | gefunden | PASS |
| 6 | Pending Owner ablehnen | HTTP 2xx | HTTP 200 | PASS |
| 6 | Owner-Status nach Ablehnung | status: rejected | rejected | PASS |
| 7 | Guide-Übersicht | ≥1 Guide-Link | 32 | PASS |
| 8 | Guide-Detailseite aufrufen | HTTP 200 + H1 | http://localhost:3500/en/guides/expat-start-zypern | PASS |
| 8 | Guide RTL (lang=ar) | html[dir=rtl] | rtl | PASS |
| 9 | Admin Brands-Seite | /admin/brands geladen | http://localhost:3500/admin/brands | PASS |
| 9 | Brand in Admin-Übersicht | "e2e-20261014223629-adm-5573fa0a-brand-without-logo" sichtbar | nicht gefunden | SKIP |
| 10 | Admin-Token vorhanden | adminToken gesetzt | ja | PASS |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-20261014223629-adm-5573fa0a-brand-without-logo | best-effort | OK |
| e2e-20261014223629-adm-5573fa0a-brand-with-logo | best-effort | OK |
| e2e-20261014223629-adm-5573fa0a-category-parent | best-effort | OK |
| e2e-20261014223629-adm-5573fa0a-category-child | best-effort | OK |
| e2e-20261014223629-adm-5573fa0a-pending-owner | best-effort | OK |