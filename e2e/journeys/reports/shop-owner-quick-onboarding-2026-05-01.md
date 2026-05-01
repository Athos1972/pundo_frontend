# Journey Report: shop-owner-quick-onboarding (F5910 Backend E2E)

**Datum:** 2026-05-01
**Tester:** e2e-tester skill
**Spec-File:** `e2e/journeys/shop-owner-quick-onboarding.spec.ts`
**Verdict: FIX — kritischer Frontend-Bug blockiert T1/T4/T5**

---

## Umgebung

| Komponente | Details |
|---|---|
| Frontend | Next.js 16.2.4, dev-Server auf Port 3500 (`npm run dev:test`) |
| Backend | pundo_main_backend, Port 8500 (`./scripts/start_test_server.sh`) |
| DB | `pundo_test`, Alembic-Stand: `z9n0o1p2q3r4` (F5910 Onboarding-Tables HEAD) |
| Playwright | Repo `pundo_frontend`, `E2E_REUSE_STATE=1` |
| Backend-Tests | 35/35 PASS (pytest) |

**Domains-Fixture:**
Manuell via Admin-API geseeded (9 Domains, 1 Specialty):
- handwerker: elektriker (+ Specialty: solaranlagen), maler, klempner
- dienstleister: buchhalter, anwalt
- haendler: supermarkt, bekleidung
- gastro: restaurant, cafe

---

## Backend-Tests (Schritt 2)

| Test-Datei | Tests | Ergebnis |
|---|---|---|
| `test_shop_owner_onboarding.py` | 15 | 15/15 PASS |
| `test_shop_owner_oauth.py` | 7 | 7/7 PASS |
| `test_admin_onboarding_domains.py` | 13 | 13/13 PASS |
| **Gesamt** | **35** | **35/35 PASS** |

Keine Regressions in anderen Test-Dateien beobachtet.

---

## Endpoint-Verifikation (Steps 4+5)

| Endpoint | HTTP Status | Ergebnis |
|---|---|---|
| `GET /api/v1/shop-owner/onboarding/domains?lang=en&type=handwerker` | 200 | PASS — 3 Domains, 1 Specialty |
| `POST /api/v1/shop-owner/onboarding` (neue Email) | 201 | PASS — `{user_id, shop_id, status:"pending"}` |
| `POST /api/v1/shop-owner/onboarding` (konflikt Email) | 409 | PASS |
| `GET /api/v1/shop-owner/auth/google/authorize` | 200 | PASS (via pytest) |
| `GET /api/v1/admin/onboarding-domains` | 200 | PASS |
| `POST /api/v1/admin/onboarding-domains` | 201 | PASS |

---

## Journey-Run: shop-owner-onboarding (Rerun Schritt 7)

Alle 6 Tests: **6/6 PASS**

```
T1 — /shop-admin/register redirects → Onboarding Wizard lädt → Owner via API anlegen  PASS
T2 — /register/check-email Seite: Titel "Check your inbox" sichtbar                   PASS
T3 — Verification-Token aus Test-DB lesen                                              PASS
T4 — /verify-email?token=... → Zeigt Success + Link zu /pending-approval              PASS
T5 — Admin approved den Owner                                                          PASS
T6 — Owner-Login nach Approval → /shop-admin/dashboard erreichbar                     PASS
```

Keine Regression durch F5910 Backend-Implementierung.

---

## Journey-Run: shop-owner-quick-onboarding (Erste Ausführung — Schritt 8)

**1/6 PASS, 5/6 FAIL**

| Test | Status | Root Cause |
|---|---|---|
| T1 — GET /domains → Domains-Chips laden | **FAIL** | Frontend-Bug: `domains.filter is not a function` |
| T2 — Draft persistence: Banner nach Reload | **FAIL** | React Hydration Mismatch (SSR vs localStorage) |
| T3 — Draft discard: "Neu beginnen" | **PASS** | — |
| T4 — Conditional specialties | **FAIL** | Frontend-Bug: selbe Ursache wie T1 |
| T5 — Email conflict → Login-Link | **FAIL** | Frontend-Bug: selbe Ursache wie T1 |
| T6 — Progress bar + i18n | **FAIL** | Test-Authoring: `?lang=de` ändert Sprache nicht (Cookie nötig) |

---

## Failures (Detail)

### T1/T4/T5 — FAIL: `domains.filter is not a function`

**Observed:** Nach Auswahl von Handwerker + Klick auf Next: Runtime TypeError in `StepDomains.tsx:33`
`domains.filter is not a function`

**Expected:** Domain-Chips (Elektriker, Maler, Klempner) laden und sind klickbar.

**Root Cause:** `src/lib/onboarding/domains.ts` Zeile 50 castet die API-Response fälschlicherweise:
```typescript
// IST (falsch):
const data = (await res.json()) as OnboardingDomain[]
// Backend gibt zurück: { "domains": [...] }
// data ist also { domains: OnboardingDomain[] }, kein Array

// MUSS:
const data = (await res.json()) as { domains: OnboardingDomain[] }
return data.domains  // statt data
```

Der Proxy `/api/shop-admin/onboarding/domains` leitet `{ domains: [...] }` vom Backend durch, aber `getDomains()` erwartet `[]`. Der Cast als `OnboardingDomain[]` ist typmäßig falsch und wird von TypeScript nicht abgefangen.

**Severity: KRITISCH** — Step 2 des Wizards ist für alle Nutzer kaputt in der aktuellen Frontend-Version.

### T2 — FAIL: React Hydration Mismatch (SSR vs localStorage)

**Observed:** Seite zeigt "This page couldn't load" nach Klick auf "Continue". Next.js Dev-Overlay zeigt: `Hydration failed because the server rendered text didn't match the client.`

**Diff:** Server rendert `<p>Step 1 of 6</p>` (Wizard-State). Client rendert `OnboardingDraftBanner` weil localStorage einen Draft enthält.

**Root Cause:** `OnboardingWizard` nutzt `useState(() => !resumeOAuth && loadDraft() !== null)` für `showDraftBanner`. Dieser Wert unterscheidet sich zwischen Server (kein localStorage) und Client (localStorage vorhanden). React 19 + Next.js 16 behandelt diese Hydrations-Divergenz als Fehler.

**Fix-Strategie:** `showDraftBanner` aus dem initial `useState` rausnehmen und stattdessen in einem `useEffect` setzen (Client-only). Alternative: `suppressHydrationWarning` auf dem relevanten Element.

**Severity: HOCH** — Betrifft alle Nutzer, die den Wizard verlassen und zurückkommen.

### T6 — FAIL: `?lang=de` ändert UI-Sprache nicht

**Observed:** Nach Navigation zu `/shop-admin/onboarding?lang=de` zeigt Seite weiterhin "Step 1 of 6" (EN).

**Root Cause:** `OnboardingPage` liest die Sprache über `getLangServer()` aus dem `app_lang` Cookie, nicht aus dem URL-Parameter. Dies ist kein Bug — der URL-Parameter ist schlicht kein Mechanismus für Language-Switching in diesem System.

**Severity: KEIN Bug** — Test-Authoring-Fehler in T6. Die Spec muss `context.addCookies([{name:'app_lang', value:'de', ...}])` verwenden.

---

## Bekannte Lücken vom Backend-Coder (Audit)

| Lücke | Status | Bewertung |
|---|---|---|
| `GOOGLE_SHOP_OWNER_REDIRECT_URI` fehlt in `.env.example` | BESTÄTIGT | Muss ergänzt werden |
| `shop_owners.status` DB CHECK-Constraint | BESTÄTIGT — KEIN Problem | VARCHAR(16) ohne CHECK, `pre_signup` ist erlaubt |
| Login NULL `password_hash` guard | BESTÄTIGT OPEN | `_verify_password(body.password, owner.password_hash)` crasht wenn `password_hash = None` (OAuth-only user versucht Email-Login) |

---

## Vault-Pflege-Hinweise

- **Repo-Docs-Sync-Skript:** `scripts/sync_docs_from_vault.py` existiert im Backend-Repo. Im Frontend-Repo kein äquivalentes Skript gefunden.
- **Journey `shop-owner-quick-onboarding`:** Keine Journey-Verlinkung in `15 Journeys/` gefunden. Da der Wizard ein direkter Shop-Owner-Touchpoint ist, wäre eine Journey-Verlinkung sinnvoll.
