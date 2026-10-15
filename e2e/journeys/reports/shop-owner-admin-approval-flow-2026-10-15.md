## Journey: Shop-Owner Admin-Approval via Browser-UI — PASS
Datum: 2026-10-15 15:03 UTC

### Test-Daten
| Fixture | ID | Aufgebaut | Gelöscht |
|---|---|---|---|
| e2e-20261015150241-approval-17f6@pundo-e2e.io | 16854 | ja | ja |
| e2e-20261015150241-presignup-353b@pundo-e2e.io | 16855 | ja | ja |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Admin-Login via Formular | Cookie admin_token gesetzt + Redirect | http://127.0.0.1:3500/admin/dashboard | PASS |
| 2 | Shop-Owner-Liste lädt | >0 Zeilen | 16 Zeilen | PASS |
| 3 | Filter pending | Fixture A sichtbar | e2e-20261015150241-approval-17f6@pundo-e2e.io | PASS |
| 4 | Filter pre_signup | Fixture B sichtbar | e2e-20261015150241-presignup-353b@pundo-e2e.io | PASS |
| 5 | Edit-Seite öffnet mit Status pending | pending-Badge sichtbar | pending | PASS |
| 5 | Approve-Button geklickt | approved-Badge | approved | PASS |
| 6 | API-Verifikation status=approved | approved | approved | PASS |
| 6 | In approved-Filter sichtbar | Fixture A in approved-Liste | e2e-20261015150241-approval-17f6@pundo-e2e.io | PASS |
| 7 | Admin-Logout + Auth-Guard | /admin/login | http://127.0.0.1:3500/admin/login | PASS |
| 8 | Shop-Owner-Login nach Approval | /shop-admin/dashboard | http://127.0.0.1:3500/shop-admin/dashboard | PASS |
| 9 | Profil-Feld name nicht leer | non-empty | E2E-20261015150241-APPROVAL-Shop-98fb | PASS |

### Findings
_keine_