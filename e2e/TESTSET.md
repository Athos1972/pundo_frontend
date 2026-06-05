# TESTSET — pundo_frontend

## Letzter Testlauf
Datum: 2026-06-05 (CSP Inline-Style Fix)
Ergebnis: 2026/2026 bestanden (+7 neue Tests durch neue Dateien)
Journey-Ergebnis: 28/28 PASS (Smoke 9/9 + CSP 5/5 + reactive-lang 5/5 + cookie-consent 13/13 + shop-all-products 4/4 — 2 fixme-skips im lifecycle)

### Statische Prüfung (CSP-Run)
| Prüfung | Status |
|---------|--------|
| TypeScript | PASS (0 Fehler) |
| ESLint | PASS (0 neue Errors/Warnings; 1 pre-existing Error SearchContent.tsx react-hooks/preserve-manual-memoization) |

### Unit-Tests
| Test-File | Tests | Status |
|---|---|---|
| shop-admin-login-oauth.test.tsx | 11 | PASS |
| _parser.spec.ts | 20 | PASS |
| seed-visuals-manifest.test.ts | 12 | PASS (nach Manifest-Bereinigung) |
| ... (105 weitere) | 1976 | PASS |
| **Gesamt** | **2019** | **PASS** |

### COVERAGE_GAP (nicht blockierend)
| Modul | Aktuell | Ursache |
|-------|---------|---------|
| ShopMapClient.tsx | ~0% | Leaflet braucht Browser-Canvas |

### E2E-Journeys (mustRun)
| Journey | Tests | Status |
|---|---|---|
| shop-owner-lifecycle | 7/9 (2 fixme) | PASS |
| shop-owner-quick-onboarding | 9/9 | PASS |

### Journey-Katalog-Drift (Bestätigung durch BB ausstehend)
- `shop-owner-quick-onboarding` touches-modules: `src/app/(shop-admin)/shop-admin/auth/callback/**` fehlt — OAuth-Callback ist Teil des OAuth-Wizard-Flows

### Fixes während dieses Testlaufs
| Datei | Änderung | Grund |
|---|---|---|
| `src/app/(shop-admin)/shop-admin/auth/callback/page.tsx:18` | `/shop-admin/` → `/shop-admin/dashboard` | Primär-Fix: OAuth Post-Login 404 |
| `src/tests/shop-admin-login-oauth.test.tsx:187` | Assertion auf `/shop-admin/dashboard` korrigiert | Test-Update begleitend zu T1 |
| `e2e/journeys/customer-shop-all-products-flow.md` | `---` → `----` (3 Stellen im Body) | Body-Separator parsebar machen |
| `e2e/journeys/_parser.spec.ts` | `toHaveLength(26)` → `toHaveLength(27)` (3 Stellen) | Korrekte Journey-Count nach `---`-Fix |
| `public/seed-visuals/_manifest.json` | Duplikate bereinigt, `total` + Dateigrössen aktualisiert | FIXTURE-DEFEKT: Build-Script erzeugt Duplikate |

### CSP-Fix Änderungen (2026-06-05)
| Datei | Änderung | Grund |
|---|---|---|
| `src/proxy.ts` | `style-src 'unsafe-inline'`, `allowInlineStyles`-Param + isBlogPage-Block entfernt | Kernfix — CSP-Violation dauerhaft beseitigen |
| `eslint-rules/no-inline-style.js` | Neue lokale ESLint-Rule `local-csp/no-inline-style` | Guardrail: warnt bei künftigen `style={{}}` |
| `eslint.config.mjs` | Rule registriert als warn für `src/**/*.tsx` | — |
| `AGENTS.md` | Coding-Guideline Inline-Styles | KI-Agents und Menschen |
| 10 TSX-Dateien | `@csp-allow-inline-style` Opt-out-Kommentare oder Tailwind-Ersatz | Bestandscode whitelist |

### Open Failures
`verdict:"SHIP"` erlaubt — `open_failures: []`

| Bug-ID | Kategorie | Status | Beschreibung |
|---|---|---|---|
| — | — | — | Keine offenen Failures |

### Docs-Sync (CSP-Run)
| Dokument | Status |
|---|---|
| llms.txt/route.ts | kein Signal |
| README.md | kein Signal |
| AGENTS.md | aktualisiert (Inline-Style Guideline) |
