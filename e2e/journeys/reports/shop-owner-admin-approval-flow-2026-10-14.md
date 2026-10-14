## Journey: Shop-Owner Admin-Approval via Browser-UI — PASS
Datum: 2026-10-14 09:37 UTC

### Test-Daten
| Fixture | ID | Aufgebaut | Gelöscht |
|---|---|---|---|
| e2e-20261014093505-approval-9e64@pundo-e2e.io | 3044 | ja | ja |
| e2e-20261014093505-presignup-9e61@pundo-e2e.io | 3045 | ja | ja |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Admin-Login via Formular | Cookie admin_token gesetzt + Redirect | http://localhost:3500/admin/dashboard | PASS |
| 2 | Shop-Owner-Liste lädt | >0 Zeilen | 15 Zeilen | PASS |
| 3 | Filter pending | Fixture A sichtbar | e2e-20261014093505-approval-9e64@pundo-e2e.io | PASS |
| 4 | Filter pre_signup | Fixture B sichtbar | e2e-20261014093505-presignup-9e61@pundo-e2e.io | PASS |
| 5 | Edit-Seite öffnet mit Status pending | pending-Badge sichtbar | pending | PASS |
| 5 | Approve-Button geklickt | approved-Badge | approved | PASS |
| 6 | API-Verifikation status=approved | approved | approved | PASS |
| 6 | In approved-Filter sichtbar | Fixture A in approved-Liste | e2e-20261014093505-approval-9e64@pundo-e2e.io | PASS |
| 7 | Admin-Logout + Auth-Guard | /admin/login | http://localhost:3500/admin/login | PASS |
| 8 | Shop-Owner-Login nach Approval | /shop-admin/dashboard | http://localhost:3500/shop-admin/dashboard | PASS |
| 9 | Profil-Feld name nicht leer | non-empty | E2E-20261014093505-APPROVAL-Shop-24ba | PASS |

### Findings
_keine_