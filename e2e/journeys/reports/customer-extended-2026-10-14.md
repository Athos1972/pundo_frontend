# Journey Report: customer-extended (2026-10-14)

**FAV Customer:** e2e-20261014093505-fav-bf8c0fd2@pundo.com
**DEL Customer:** e2e-20261014093505-del-bf8c0fd2@pundo.com
**MCP Customer:** e2e-20261014093505-mcp-bf8c0fd2@pundo.com
**Test Item ID:** 21476

## Findings
- SETUP: Using public item ID 21476 for favorites tests
- T1 WARN: Keine Favoriten-Items in der Liste gefunden (account-page rendering or UI gap)
- T1 PASS: Favorit nach Entfernen nicht mehr sichtbar
- T2 SKIP: POST /reviews failed 404 — {"detail":"Not Found"}
- T3 WARN: GET /admin/otp/e2e-20261014093505-del-bf8c0fd2@pundo.com returned 404 — trying without OTP
- T3 SKIP: Could not retrieve OTP — admin endpoint not available
- T4 PASS: /account/mcp lädt ohne 404/5xx