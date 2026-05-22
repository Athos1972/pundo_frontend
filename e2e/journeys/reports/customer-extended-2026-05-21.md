# Journey Report: customer-extended (2026-05-21)

**FAV Customer:** fav-4b529094@pundo.com
**DEL Customer:** del-4b529094@pundo.com
**MCP Customer:** mcp-4b529094@pundo.com
**Test Item ID:** 21476

## Findings
- SETUP: Using public item ID 21476 for favorites tests
- T1 WARN: favorites tab click failed — locator.click: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('a:has-text("Favorites"), a:has-text("Favoriten"), button:has-text("Favorites"), button:has-text("Favoriten"), [data-tab="favorites"]').first()[22m
[2m    - locator resolved to <button role="tab" id="tab-favorites" aria-selected="false" aria-controls="tabpanel-favorites" class="text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap transition-colors text-start text-text-muted hover:bg-surface-alt hover:text-text">My Favorites</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div class="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div class="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m      - waiting 100ms[22m
[2m    9 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div class="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m      - waiting 500ms[22m

- T1 WARN: Keine Favoriten-Items in der Liste gefunden (account-page rendering or UI gap)
- T1 PASS: Favorit nach Entfernen nicht mehr sichtbar
- T2 SKIP: POST /reviews failed 404 — {"detail":"Not Found"}
- T3 WARN: GET /admin/otp/del-4b529094@pundo.com returned 404 — trying without OTP
- T3 SKIP: Could not retrieve OTP — admin endpoint not available
- T4 PASS: /account/mcp lädt ohne 404/5xx