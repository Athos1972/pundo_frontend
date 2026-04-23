# Architecture: E2E-Tester Erweiterung um User-Journey-Tests

**Slug:** `e2e-tester-journeys-20260423`
**Datum:** 2026-04-23
**Architect:** /architect
**Reads:** `01-design.md`

---

## 0. Vorbemerkung zu offenen Designfragen

Das Design hat 7 offene Fragen (OFFEN-1 bis OFFEN-7). Keine davon blockiert die Architektur, weil alle durch **konservative Defaults** aufgelöst werden können, die später entschärft/erweitert werden können:

| OFFEN | Default in dieser Architektur | Aufwand falls später anders |
|---|---|---|
| OFFEN-1 Verify-Email | Backend hat bereits `POST /api/v1/shop-owner/verify-email` mit Token (`ingestor/api/shop_owner_auth.py:158`). Fixture liest Token direkt aus DB **oder** neuer Test-Endpoint `/test/confirm-owner`. Entscheidung: **Phase 1** nutzt Admin-Approval-Pfad (existiert schon, siehe `global-setup.ts:298–315`), Flow A überspringt den Mail-Schritt explizit und dokumentiert das. | Neuer Backend-Task T9 falls echter Verify-Flow getestet werden soll. |
| OFFEN-2 Shop-Aktivierung | Im aktuellen Modell: **Admin-Approval** des Owners + `shop.status='active'` (Default). Self-Service-Aktivierung existiert nicht. Flow A nutzt Admin-Approval exakt wie `global-setup.ts`. | Keiner — wenn Self-Service kommt, eigener Flow. |
| OFFEN-3 Deaktivieren vs. Löschen | Flow A testet **beide** Pfade als `test.describe`-Blöcke: `deactivate` (PATCH status='inactive') und `delete` (DELETE). Backend-Route `DELETE /api/v1/admin/shops/{id}` existiert (`admin/shops.py:220`). | Keiner. |
| OFFEN-4 Admin-Moderation-UI | Wird in Task T7 nur als Skeleton/skip-Test angelegt. Volle Implementierung wartet auf eigenes Spec. | Eigenes Design-Spec. |
| OFFEN-5 Cleanup-Strategie | **Hybrid**: Primär `DELETE /api/v1/admin/shops/{id}` + `DELETE /api/v1/admin/shop-owners/{id}` (falls vorhanden, sonst PATCH status='rejected'). Keine neuen Backend-Endpoints in Phase 1. UUID-Präfix in allen Fixture-Daten erlaubt notfalls manuelles DB-Cleanup. | T10 (optional) neuer `DELETE /api/v1/test/cleanup?prefix=<uuid>` im Backend. |
| OFFEN-6 CI-Integration | Kein CI-Setup in dieser Iteration. Lokal `npm run e2e:journeys`. | Separater DevOps-Task. |
| OFFEN-7 Parallelität | `workers: 1` für das `journeys`-Project (sicher). Jede Journey nutzt dennoch UUID-Präfix, damit später auf `workers: 2+` gewechselt werden kann. | Config-Flip. |

---

## 1. Affected modules / files

### Neu anzulegen

| Pfad | Zweck |
|---|---|
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/shop-owner-lifecycle.spec.ts` | Flow A (Prio 1) — 12-Schritt-Journey |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/customer-discovery.spec.ts` | Flow B (Prio 2) — Kunden-Pfad inkl. RTL-Switch |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/admin-moderation.spec.ts` | Flow C (Prio 3) — Skeleton mit `test.skip` bis Admin-UI spezifiziert |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/fixtures/context.ts` | `JourneyContext`-Interface + `createJourneyContext()` Factory |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/fixtures/users.ts` | `createTestShopOwner()`, `createTestCustomer()`, `createTestAdmin()` |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/fixtures/shop.ts` | `createTestShop()`, `approveOwner()`, `setShopStatus()`, `deleteShop()` |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/fixtures/products.ts` | `createTestProduct()`, `createTestOffer()` |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/fixtures/reviews.ts` | `createTestReview()` |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/fixtures/cleanup.ts` | `cleanupJourney(ctx)` — wird in afterAll + global teardown aufgerufen |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/fixtures/api-client.ts` | Dünner fetch-Wrapper mit Admin-Cookie + Shop-Owner-Cookie-Handling, analog `global-setup.ts` |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/global-teardown.ts` | Safety-Net: Räumt alle noch übrigen Entitäten mit `e2e-journey-*`-Präfix auf |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/playwright.journeys.config.ts` | Separates Playwright-Config für das `journeys`-Project |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/README.md` | Runbook: lokal starten, Fixture-Konventionen, Debug |

### Zu ändern

| Pfad | Änderung |
|---|---|
| `/Users/bb_studio_2025/dev/github/pundo_frontend/.claude/skills/e2e-tester/SKILL.md` | Neue **Phase 3.5: User-Journey-Tests** nach Phase 3; Journey-Matrix, Trigger-Logik, TESTSET-Abschnitt |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/TESTSET.md` | Neuer Template-Abschnitt `### Journey-Tests` |
| `/Users/bb_studio_2025/dev/github/pundo_frontend/package.json` | Neues Script `e2e:journeys`: `playwright test --config playwright.journeys.config.ts` |

### Explizit NICHT geändert

- `/Users/bb_studio_2025/dev/github/pundo_frontend/playwright.config.ts` bleibt unverändert. Journeys bekommen eigene Config, um nicht versehentlich mit den bestehenden Specs zu kollidieren.
- `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/global-setup.ts` bleibt unverändert — die Journeys benutzen **keinen** shared Storage-State und keine geseedete Test-User. Jede Journey erzeugt ihre eigenen Entitäten.

---

## 2. Data model changes

**Keine Schema-Änderungen.** Alle Journey-Tests nutzen ausschließlich existierende Backend-Routen. Was wir brauchen, ist bereits da:

- `POST /api/v1/shop-owner/register` → Owner + Shop-Dummy (siehe `shop_owner_auth.py`)
- `POST /api/v1/admin/auth/login` → Admin-Token
- `PATCH /api/v1/admin/shop-owners/{id}` → `status: approved|rejected`
- `PATCH /api/v1/admin/shops/{id}` → `lat/lng/status`, `status: 'active'|'inactive'`
- `DELETE /api/v1/admin/shops/{id}` → Cascade Delete
- `POST /api/v1/shop-owner/products`, `POST /api/v1/shop-owner/offers`, `POST /api/v1/shop-owner/shop/hours` → Owner-Mutationen
- Public: `GET /api/v1/shops`, `/api/v1/shops/nearby`, `/api/v1/products/search`, `/api/v1/shops/{id}/products`, `/api/v1/shops/{id}/reviews`
- `POST /api/v1/customer-reviews` (siehe `customer_reviews.py`) → Review-Erstellung

**Shop-Status-Werte:** `shop.status` ist `String(32)` default `"active"` (siehe `shop.py:27`). Mögliche Werte müssen im Coder-Task T3 verifiziert werden (evtl. `active`/`inactive` oder `active`/`hidden`). Falls der Status nicht öffentlich filtert, ist das ein **Backend-Bug**, der im E2E-Report als Finding dokumentiert wird (nicht: Backend ändern).

---

## 3. API contracts

### 3.1 `JourneyContext` (TypeScript-Interface)

```ts
// e2e/journeys/fixtures/context.ts
export interface JourneyContext {
  /** UUID-Präfix, z.B. "e2e-journey-8f3c2a1b". In allen erzeugten Namen/Emails. */
  prefix: string
  /** Credentials des frisch registrierten Shop-Owners */
  owner: {
    id: number
    email: string        // `${prefix}+owner@pundo-e2e.test`
    password: string     // fixed strong password
    cookie: string       // shop_owner_token value
  }
  /** Der von register() automatisch erzeugte Shop */
  shop: {
    id: number
    slug: string | null
    name: string         // `${prefix} Test Shop`
    address: string      // fester Larnaca-Test-String
  }
  /** Separater Review-User (Customer) */
  customer: {
    id: number
    email: string        // `${prefix}+customer@pundo-e2e.test`
    cookie: string
  } | null
  /** Admin-Cookie (shared für alle Journeys) */
  adminCookie: string
  /** Erzeugte Produkt-IDs, Offer-IDs, Review-IDs — zum Cleanup */
  created: {
    productIds: number[]
    offerIds: number[]
    reviewIds: number[]
  }
  /** Backend-URL (aus env, mit Safety-Check) */
  backendUrl: string
}

export async function createJourneyContext(): Promise<JourneyContext>
export async function cleanupJourneyContext(ctx: JourneyContext): Promise<void>
```

### 3.2 Entscheidung: REST vs. DB-Zugriff

**REST-API-only.** Begründung:

1. **Konsistenz:** `global-setup.ts` nutzt bereits ausschließlich REST-Calls gegen das Test-Backend (bis auf `seed_admin.py` und `prepare_e2e_db.py`, die keine Journey-Entitäten anfassen).
2. **Kein DB-Credential-Leak in Playwright-Code:** Direkter `psql`-Zugriff würde `DATABASE_URL_TEST` in Test-Fixtures ziehen.
3. **Realitätsnähe:** Journey-Tests sollen echte API-Pfade durchlaufen, nicht Shortcuts nehmen, die in Prod nicht existieren.

**Ausnahmen** (falls REST-Route fehlt):
- Falls `DELETE /api/v1/admin/shop-owners/{id}` nicht existiert → wir setzen `status='rejected'` als Soft-Delete und markieren im Cleanup-Report.
- Falls Review-Löschung nur via Admin-Route geht → wir nutzen die Admin-Route.

### 3.3 Journey-Flow-Calls (Flow A, verkürzt)

```
POST  /api/v1/shop-owner/register           → owner.id, shop.id
POST  /api/v1/admin/auth/login              → adminCookie
PATCH /api/v1/admin/shop-owners/{id}        { status: 'approved' }
POST  /api/v1/shop-owner/login              → owner.cookie
POST  /api/v1/shop-owner/products           → productId 1, 2
POST  /api/v1/shop-owner/offers             → offerId 1
PATCH /api/v1/admin/shops/{id}              { lat, lng }       // Geocoding ersetzen
# Browser-Verifikation (Playwright page):
GET  /map                                   (Marker sichtbar?)
GET  /search?q=<productName>                (Treffer?)
GET  /shops/{slug}                          (Produkte + Offers sichtbar?)
# Review anlegen:
POST  /api/v1/customer-reviews              (als customer)
# Deaktivieren:
PATCH /api/v1/admin/shops/{id}              { status: 'inactive' }
# Browser-Negativ-Verifikation der selben drei Seiten
# Cleanup:
DELETE /api/v1/admin/shops/{id}
PATCH  /api/v1/admin/shop-owners/{id}       { status: 'rejected' }
```

### 3.4 Error-Cases die abgefangen werden müssen

| Fehler | Verhalten |
|---|---|
| Backend 500 bei register | `test.fail` mit klarer Message, trigger cleanup |
| Backend nicht erreichbar (Healthcheck) | `test.skip` mit "backend unavailable" |
| Admin-Login schlägt fehl (seed_admin nicht gelaufen) | `test.skip` + Hinweis |
| Cleanup schlägt teilweise fehl | Log-Warning, global-teardown räumt Rest |

---

## 4. Dependencies & integration points

### Libraries
**Keine neuen npm-Packages.** Playwright, fetch und node:crypto (für UUID) reichen.

### Backend-Abhängigkeiten (existieren bereits — verifiziert)

| Endpoint | Datei | Status |
|---|---|---|
| `POST /shop-owner/register` | `ingestor/api/shop_owner_auth.py:138` | vorhanden |
| `POST /shop-owner/verify-email` | `ingestor/api/shop_owner_auth.py:158` | vorhanden (nicht genutzt, Admin-Approve bypasst) |
| `POST /shop-owner/login` | `shop_owner_auth.py` | vorhanden |
| `PATCH /admin/shop-owners/{id}` | `ingestor/api/admin/shop_owners.py` | vorhanden |
| `PATCH /admin/shops/{id}` | `ingestor/api/admin/shops.py:189` | vorhanden |
| `DELETE /admin/shops/{id}` | `ingestor/api/admin/shops.py:220` | vorhanden |
| Admin-Seed-Script | `scripts/seed_admin.py` | vorhanden |

### Backend-Abhängigkeiten — neu (nur wenn explizit gewünscht, siehe Risiken)

Keine zwingend neuen Backend-Endpoints. **Optional** für spätere Iteration:
- `DELETE /api/v1/test/cleanup?prefix=<uuid>` — aktuell ersetzt durch REST-Cleanup-Kaskade.
- `POST /api/v1/test/verify-email-direct` — aktuell ersetzt durch Admin-Approve-Pfad.

### Feature-Flags
Keine. Journey-Tests laufen nur, wenn `playwright.journeys.config.ts` explizit gestartet wird.

### Integration in den bestehenden `e2e-tester`-Skill

SKILL.md-Phase 3.5 orchestriert den Trigger:

```
Phase 3.5: User-Journey-Tests (neu)
  Trigger:  Nach Phase 3 (E2E-Tests grün)
  Pflicht:  shop-owner-lifecycle (Prio 1, immer)
  Bedingt:  customer-discovery (Prio 2) wenn git-diff src/app/map|search|shops
            admin-moderation    (Prio 3) wenn git-diff src/app/admin
  Command:  npm run e2e:journeys
  Timeout:  180s pro Test
  Auf Fehler: TESTSET.md dokumentiert, NICHT blockierend für Abschlussbericht
```

---

## 5. Risiken & Mitigations

### R1 — Leaky Test Data in `pundo_test`
**Risiko:** Wenn Cleanup nicht läuft, akkumuliert die Test-DB über Zeit hunderte Fake-Owner/Shops → Flaky-Tests, unsaubere Suchergebnisse für andere E2E-Tests.
**Mitigation:**
- UUID-Präfix in allen Fixture-Daten (`e2e-journey-<uuid>`)
- `afterAll`-Hook ruft `cleanupJourney(ctx)`
- Globaler Teardown (`global-teardown.ts`) listet alle Shops mit Präfix `e2e-journey-*` und löscht sie
- `prepare_e2e_db.py` im bestehenden `global-setup.ts` (nicht Journey-Setup) macht ohnehin einen DB-Reset vor jedem Gesamtlauf

### R2 — Shop-Status-Filterung im Backend ist unklar
**Risiko:** AC-3 (deaktivierter Shop verschwindet aus Public-API) könnte fehlschlagen, nicht weil der Test fehlerhaft ist, sondern weil das Backend `status='inactive'`-Shops in `/api/v1/shops` noch ausliefert.
**Mitigation:**
- Coder verifiziert in Task T3 den genauen Filter-Code (`ingestor/api/shop_query.py`)
- Wenn Filter fehlt: **Finding** im Test-Report (AC-3 als FAIL dokumentieren), **kein** Backend-Fix im Rahmen dieses Tasks
- Test-Assertion soll die Backend-API direkt prüfen (nicht nur DOM) und fail-Reason präzise loggen

### R3 — Parallelität + Shared Admin-Seed
**Risiko:** Alle Journeys teilen denselben Admin-User (`e2e-admin@pundo-e2e.io`). Bei `workers > 1` könnten parallele Admin-Logins race-conditions erzeugen.
**Mitigation:**
- `playwright.journeys.config.ts` setzt `workers: 1`
- `JourneyContext.adminCookie` wird einmal in `beforeAll` geholt und geteilt
- README dokumentiert: "Journey-Tests sind serialisiert — bewusst. Nicht auf parallel stellen, bevor Backend-Admin-Login idempotent ist."

---

## 6. Task breakdown

Jeder Task ist ~1 fokussierter Coder-Pass (≤1 Tag). Abhängigkeiten in eckigen Klammern.

### T1 — Playwright-Journey-Config & npm-Script
**Dateien:** `playwright.journeys.config.ts` (neu), `package.json` (ändern)
**Tun:**
- Kopie von `playwright.config.ts`, aber `testDir: './e2e/journeys'`, `workers: 1`, `timeout: 180_000`, `retries: 1`, `globalTeardown: './e2e/journeys/global-teardown.ts'`
- Safety-Check übernehmen (Port 8000/3000 ablehnen)
- Kein globalSetup — Journey-Fixtures setzen sich selbst auf
- `webServer`-Block identisch zum Haupt-Config (frontend auf 3500)
- npm-Script `"e2e:journeys": "playwright test --config playwright.journeys.config.ts"`

**Abnahme:** `npm run e2e:journeys -- --list` zeigt 0 Tests ohne Fehler.

### T2 — Fixture-Basis: context.ts, api-client.ts, users.ts [→ T1]
**Dateien:** `e2e/journeys/fixtures/context.ts`, `api-client.ts`, `users.ts`
**Tun:**
- `api-client.ts`: dünner `fetch`-Wrapper mit `apiGet/Post/Patch/Delete`, akzeptiert `{ cookie?: string }`, wirft bei !ok
- `users.ts`: `createTestShopOwner(prefix)` macht `/shop-owner/register` + Admin-Approve + `/shop-owner/login`; `createTestCustomer(prefix)` macht `/customer/register` + `/customer/login` (falls Customer-Auth existiert, sonst null zurückgeben)
- `context.ts`: `createJourneyContext()` generiert prefix (node:crypto randomUUID kurz), ruft `createTestShopOwner`, loggt Admin ein, baut Context

**Abnahme:** Eigener Vitest oder ein Smoke-Journey-Test, der nur `createJourneyContext()` aufruft + `cleanupJourneyContext()` und prüft, dass in `/api/v1/shops?q=<prefix>` nach Cleanup 0 Treffer sind.

### T3 — Fixture: shop.ts + products.ts [→ T2]
**Dateien:** `e2e/journeys/fixtures/shop.ts`, `products.ts`
**Tun:**
- `setShopStatus(ctx, status)` → `PATCH /admin/shops/{id}` mit `{ status }`
- `deleteShop(ctx)` → `DELETE /admin/shops/{id}`
- `createTestProduct(ctx, {name, categoryId, price, unit})` → `POST /shop-owner/products`
- `createTestOffer(ctx, {title, price, valid_from, valid_until})` → `POST /shop-owner/offers`
- **Wichtig:** In `shop.ts` beim Anlegen eine Kategorie aus `/api/v1/categories` fetchen (Code von `fetchShopByOwner` in `shop-discovery.spec.ts` als Referenz)

**Abnahme:** Isolierter Call in Smoke-Test legt Produkt + Offer an; Assertions prüfen Response-IDs > 0.

### T4 — Fixture: reviews.ts + cleanup.ts + global-teardown.ts [→ T2, T3]
**Dateien:** `e2e/journeys/fixtures/reviews.ts`, `cleanup.ts`, `e2e/journeys/global-teardown.ts`
**Tun:**
- `createTestReview(ctx, shopId, {rating, text})` → `POST /api/v1/customer-reviews` als customer
- `cleanupJourney(ctx)`: delete shop (cascade löscht Produkte/Offers/Hours), PATCH owner→rejected, best-effort-warn bei Fehler
- `global-teardown.ts`: Admin-Login, `GET /api/v1/admin/shops?q=e2e-journey-`, für jeden → delete; dasselbe für shop-owners

**Abnahme:** Nach absichtlich abgebrochener Journey (throw in Schritt 3) ist `GET /admin/shops?q=e2e-journey-` nach Teardown leer.

### T5 — shop-owner-lifecycle.spec.ts (Flow A, Prio 1) [→ T2, T3, T4]
**Datei:** `e2e/journeys/shop-owner-lifecycle.spec.ts`
**Tun:** Alle 12 Schritte aus Design §2 Flow A implementieren, inkl.:
- `test.describe.serial('shop-owner-lifecycle', ...)` mit `test.beforeAll(createJourneyContext)` und `test.afterAll(cleanupJourney)`
- Split in 2 Blocks: "deactivate"-Variante und "delete"-Variante (OFFEN-3 Auflösung)
- Browser-Assertions mit `page.goto` + `expect(page.getByText(...))`
- Backend-Assertions parallel (z.B. Shop nicht in `/api/v1/shops?q=<prefix>` nach Deaktivierung)

**Abnahme:** `npx playwright test --config playwright.journeys.config.ts shop-owner-lifecycle` grün in <120s (AC-2), AC-3 + AC-4 grün.

### T6 — customer-discovery.spec.ts (Flow B, Prio 2) [→ T2, T3, T5]
**Datei:** `e2e/journeys/customer-discovery.spec.ts`
**Tun:** Flow B 6 Schritte. Nutzt denselben Context-Factory. Sprachwechsel via `page.goto('/?lang=ar')` + Cookie-Assertion. String-Vergleich gegen `src/lib/translations.ts` via `import`.

**Abnahme:** AC-8 grün (`<html dir="rtl">` UND ein Label in AR).

### T7 — admin-moderation.spec.ts Skeleton (Flow C) [→ T2]
**Datei:** `e2e/journeys/admin-moderation.spec.ts`
**Tun:** Test-Gerüst mit `test.skip(true, 'Pending spec 2026-04-24 admin-moderation')`. Jeder Schritt als eigene `test()` mit TODO-Kommentar und leerer Implementierung. So kompiliert der Test und zählt in TESTSET.md als "SKIPPED".

**Abnahme:** `--list` zeigt Tests, alle mit Status skipped.

### T8 — SKILL.md Phase 3.5 + TESTSET.md-Template [→ T5, T6]
**Dateien:** `.claude/skills/e2e-tester/SKILL.md`, `e2e/TESTSET.md`
**Tun:**
- Neuer Abschnitt `## Phase 3.5: User-Journey-Tests` nach Phase 3 mit:
  - Journey-Matrix-Tabelle (Name, Prio, Soll-Dauer, Trigger-Bedingung)
  - Command: `npm run e2e:journeys`
  - Nicht-blocking-Regel (Failure → dokumentieren, nicht abbrechen)
  - Snippet für `.last_run`-Integration (optional)
- TESTSET.md: Template-Abschnitt `### Journey-Tests` mit Tabelle `| Name | Status | Dauer | Failed Step |`
- Phase 4 Abschlussbericht um Journey-Zeile erweitern

**Abnahme:** SKILL.md validiert gegen AC-1, TESTSET.md gegen AC-7.

### T9 — README für Journey-Ordner [→ T5]
**Datei:** `e2e/journeys/README.md`
**Tun:** Kurz-Runbook: Voraussetzungen (Backend 8500, Frontend 3500), Start-Command, Debug-Hinweise (`--headed`, Traces), Fixture-Konventionen (UUID-Präfix, REST-only), bekannte Einschränkungen (workers=1, Flow C skipped).

**Abnahme:** README existiert, enthält Abschnitte "Quick Start", "Fixtures", "Debugging", "Known Limitations".

### T10 (OPTIONAL) — Test-Only-Cleanup-Endpoint im Backend
**Datei:** `/Users/bb_studio_2025/dev/github/pundo_main_backend/ingestor/api/test_support.py` (neu)
**Tun:** `DELETE /api/v1/test/cleanup?prefix=<uuid>` — nur registriert wenn `ENV == 'test'`; löscht alle Entitäten mit Name/Email-Prefix. Updated `cleanup.ts`, um diesen Endpoint zu bevorzugen.

**Abnahme:** Optional, nur wenn R1 bei echtem Lauf aufschlägt.

---

## Dependency-Graph

```
T1 ─┬─ T2 ─┬─ T3 ─┬─ T5 ─┬─ T6
    │      │      │      ├─ T8
    │      │      ├─ T4 ─┤
    │      │             └─ T9
    │      └─ T7
    └─ (T10 optional, entkoppelt)
```

Kritischer Pfad: **T1 → T2 → T3 → T4 → T5 → T8** (ca. 5 fokussierte Coder-Sessions).

---

Architecture complete at `specs/e2e-tester-journeys-20260423/02-architecture.md`. Ready for coder.
