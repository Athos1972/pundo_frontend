# Journey Report: customer-extended (2026-10-15)

**FAV Customer:** e2e-20261015150241-fav-34009e37@pundo.com
**DEL Customer:** e2e-20261015150241-del-34009e37@pundo.com
**MCP Customer:** e2e-20261015150241-mcp-34009e37@pundo.com
**Test Item ID:** 21476

## Findings
- SETUP: Using public item ID 21476 for favorites tests
- T1 WARN: Keine Favoriten-Items in der Liste gefunden (account-page rendering or UI gap)
- T1 PASS: Favorit nach Entfernen nicht mehr sichtbar
- T3 PASS: falscher OTP abgelehnt, Konto bleibt (positiver OTP-Pfad: Backend-pytest)
- T4 PASS: /account/mcp lädt ohne 404/5xx