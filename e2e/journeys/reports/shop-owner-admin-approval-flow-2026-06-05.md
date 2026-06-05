## Journey: Shop-Owner Admin-Approval via Browser-UI — PASS
Datum: 2026-06-05 09:18 UTC

### Test-Daten
| Fixture | ID | Aufgebaut | Gelöscht |
|---|---|---|---|
| e2e-approval-f16af18e | 17 | ja | ja |
| e2e-presignup-f16af18e | 18 | ja | ja |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Admin-Login via Formular | Cookie admin_token gesetzt + Redirect | http://localhost:3500/admin/dashboard | PASS |
| 2 | Shop-Owner-Liste lädt | >0 Zeilen | 7 Zeilen | PASS |
| 3 | Filter pending | Fixture A sichtbar | e2e-approval-f16af18e@pundo-e2e.io | PASS |
| 4 | Filter pre_signup | Fixture B sichtbar | e2e-presignup-f16af18e@pundo-e2e.io | PASS |
| 5 | Edit-Seite öffnet mit Status pending | pending-Badge sichtbar | pending | PASS |
| 5 | Approve-Button geklickt | approved-Badge | approved | PASS |
| 6 | API-Verifikation status=approved | approved | approved | PASS |
| 6 | In approved-Filter sichtbar | Fixture A in approved-Liste | e2e-approval-f16af18e@pundo-e2e.io | PASS |
| 7 | Admin-Logout + Auth-Guard | /admin/login | http://localhost:3500/admin/login | PASS |
| 8 | Shop-Owner-Login nach Approval | /shop-admin/dashboard | http://localhost:3500/shop-admin/dashboard | PASS |
| 9 | Profil-Feld name nicht leer | non-empty | e2e-approval-shop-f16af18e | PASS |

### Findings
_keine_