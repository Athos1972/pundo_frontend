## Journey: Admin Data Management Sweep — PASS
Datum: 2026-05-22 13:49 UTC

### Aufgebaute Test-Daten
| Fixture | ID | Status |
|---|---|---|
| e2e-adm-422e6f2e-brand-without-logo | 3793 | OK |
| e2e-adm-422e6f2e-brand-with-logo | 3794 | OK |
| e2e-adm-422e6f2e-category-parent | 9891 | OK |
| e2e-adm-422e6f2e-category-child | 9892 | OK |
| e2e-adm-422e6f2e-guide-published | N/A | FEHLER/SKIP |

### Endpoint-Unterstützung
- Logo-Upload: ja
- Admin-Categories: ja
- Guides: nein

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 3 | Category parent in Admin-Liste | categoryParentId abrufbar | gefunden | PASS |
| 4 | Category child parent_id | parent_id = 9891 | 9891 | PASS |
| 5 | Admin Categories-Seite | /admin/categories geladen | http://localhost:3500/admin/categories | PASS |
| 5 | Category-Tree-Element vorhanden | Tree/List-Element sichtbar | gefunden | PASS |

### Findings (FAIL-Einträge)
_keine_

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| e2e-adm-422e6f2e-brand-without-logo | best-effort | OK |
| e2e-adm-422e6f2e-brand-with-logo | best-effort | OK |
| e2e-adm-422e6f2e-category-parent | best-effort | OK |
| e2e-adm-422e6f2e-category-child | best-effort | OK |
| e2e-adm-422e6f2e-guide-published | best-effort | OK |