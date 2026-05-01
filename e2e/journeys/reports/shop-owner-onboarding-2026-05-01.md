# Journey-Report: shop-owner-onboarding
**Datum:** 2026-05-01  
**SHA:** 5ad4ee2aabb7adddd1698d148f19f2f4d71928b9  
**Feature:** F5910 Schnell-Onboarding Mobil  

---

## Ergebnis: PASS — 6/6 Tests bestanden

| Test | Beschreibung | Ergebnis | Dauer |
|------|-------------|---------|-------|
| T1 | /shop-admin/register redirects → Onboarding Wizard lädt → Owner via API anlegen | ✅ PASS | 1.5s |
| T2 | /register/check-email Seite: Titel "Check your inbox" sichtbar | ✅ PASS | 682ms |
| T3 | Verification-Token aus Test-DB lesen | ✅ PASS | 282ms |
| T4 | /verify-email?token=... → Zeigt Success + Link zu /pending-approval | ✅ PASS | 1.4s |
| T5 | Admin approved den Owner | ✅ PASS | 22ms |
| T6 | Owner-Login nach Approval → /shop-admin/dashboard erreichbar | ✅ PASS | 1.0s |

**Gesamtlaufzeit:** ~2m 42s (inkl. global-setup DB-Reset)

---

## Was geprüft wurde

1. **Route-Redirect:** `/shop-admin/register` → `/shop-admin/onboarding` (F5910-Fix)
2. **Wizard-Rendering:** 4 Provider-Typ-Kacheln mit `aria-pressed` sichtbar
3. **Check-Email-Seite:** Keine 404, Titel "Check your inbox" in Body
4. **E-Mail-Verifikation:** Token aus pundo_test DB gelesen (kein SMTP nötig), verify-email-Seite zeigt Success, Link zu `/pending-approval` vorhanden
5. **Admin-Approval:** PATCH → status=approved, GET bestätigt
6. **Owner-Login:** Redirect zu /shop-admin/dashboard nach erfolgreicher Anmeldung

---

## Wichtige Fixes die während dieser Session entdeckt und behoben wurden

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `/shop-admin/onboarding` für unauthentifizierte User nicht erreichbar (HTTP 307 → Login) | `PUBLIC_SHOP_ADMIN_PATHS` in `src/proxy.ts` fehlte `/shop-admin/onboarding` und `/shop-admin/auth/callback` | Beide Pfade hinzugefügt; Regression-Test `src/tests/proxy-public-paths.test.ts` angelegt |
| T1 Selektor `button, { hasText: /handwerker/i }` nicht gefunden | Default-Sprache ist `en` (nicht `de`) → Tiles zeigen "Tradesperson" | Language-agnostischer Selektor `button[aria-pressed]` mit Count-Assertion |
| API gibt 201 zurück statt 200 | `POST /api/v1/shop-owner/register` → HTTP 201 Created | `toBe(200)` → `toContain([200, 201])` |

---

## Bekannte offene Punkte (kein Blocker für SHIP)

| Punkt | Status |
|-------|--------|
| `POST /api/v1/shop-owner/onboarding` Backend-Endpoint nicht live | Backend-Task B1 (02-backend-architecture.md) |
| Google OAuth Endpoints nicht live | Backend-Task B3-B5 |
| `shop-owner-quick-onboarding.spec.ts` noch nicht implementiert | Journey status: approved — wartet auf Backend |

---

## Umgebung

- Frontend: Port 3500 (`npm run dev:test`)
- Backend: Port 8500 (`pundo_test` DB)
- Playwright-Browser: Chromium
