# E2E-Tests — pundo Frontend

## Überblick

Die E2E-Tests laufen gegen eine isolierte `pundo_test`-PostgreSQL-Datenbank und testen den vollständigen Stack: Browser → Next.js (Port **3500**) → FastAPI (Port **8500**) → PostgreSQL → Google Geocoding.

**Port-Konvention (nie abweichen):**

| Instanz | Frontend | Backend | Datenbank |
|---|---|---|---|
| **Produktion** | 3000 | 8000 | `pundo` |
| **E2E-Tests** | **3500** | **8500** | `pundo_test` |

Playwright-Safety-Check in `playwright.config.ts` verwirft Port 8000 explizit.

### Was wird im Browser getestet (Playwright)

| Bereich | Warum im Browser |
|---------|-----------------|
| Login-Flow (Formular → Redirect) | Auth-Cookie-Setzen, Redirect-Logik |
| Dashboard-Navigation | Links, Sichtbarkeit von Nav-Elementen |
| Profil speichern → Toast | Formular-Submit, Server-Response, UI-Feedback |
| Öffnungszeiten → Toast + UI | Zeitinputs, Checkboxen, State-Update nach Save |
| Produkte CRUD | Anlegen (Redirect zur Liste), Bearbeiten, Löschen mit Confirm |
| Angebote CRUD | Anlegen, Archivieren (Tab-Wechsel: Active → Expired) |
| API-Keys | Einmaliger Key-Display (`<code>`), Löschen mit Confirm |
| Logout | Button-Klick → Redirect zu Login |
| Customer: Shop-Listing | Test-Shop erscheint auf `/shops` |
| Customer: Shop-Detail | Name, Adresse, optionale Karte auf `/shops/[slug]` |
| Customer: Suche | Suchfeld → Enter → Suchergebnisse enthalten Shop |

### Was via API getestet wird (kein Browser nötig)

| Prüfung | Warum kein Browser |
|---------|-------------------|
| Geocoding (lat/lng korrekt) | Reine DB-/API-Assertion |
| Such-API findet Shop | `GET /api/v1/shops/search?q=...` |
| Geo-Nearby findet Shop | `GET /api/v1/shops/nearby?lat=...&lng=...` |
| Produkte via API abrufbar | `GET /api/v1/shops/{id}/products` |
| Öffnungszeiten via API | `GET /api/v1/shops/{id}/hours` |

---

## Voraussetzungen

- PostgreSQL mit `pundo_test`-DB (mit PostGIS)
- Backend-Repo: `pundo_main_backend` mit aktivem `.venv`
- Google Geocoding API Key gesetzt in `pundo_main_backend/.env`
- Node.js ≥ 20, `npm install` bereits ausgeführt

---

## Setup einmalig

### 1. pundo_test-DB anlegen (falls noch nicht vorhanden)

```bash
createdb pundo_test
psql pundo_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 2. Backend-Env prüfen

`pundo_main_backend/.env` muss enthalten:

```env
DATABASE_URL=postgresql+psycopg://...pundo
DATABASE_URL_TEST=postgresql+psycopg://...pundo_test
JWT_SECRET=pundo-jwt-dev-secret-change-in-production
ADMIN_SECRET=pundo-admin-dev-secret
GOOGLE_GEOCODING_API_KEY=AIza...
```

---

## E2E-Tests ausführen

### Standard (empfohlen)

```bash
cd /path/to/pundo_frontend
npx playwright test e2e/journeys e2e/smoke.spec.ts e2e/smoke-shop-visibility.spec.ts
```

Das Global Setup startet das Test-Backend (Port 8500) selbst neu. **Das Frontend startet ausschließlich Playwright** (`webServer` → `node scripts/e2e-frontend.cjs start`, siehe unten) — das Global Setup startet/kill-t kein Frontend mehr, sondern prüft nur, dass der Server auf 3500 aktuellen Code ausliefert.

`BACKEND_URL` und `E2E_FRONTEND_PORT` sind in `playwright.config.ts` auf 8500/3500 vorbelegt — kein Setzen nötig. **Rate-Limits:** Onboarding 5/min und Login 10/min gelten pro IP (kein Bypass seit B6220-001). Damit volle Parallel-Läufe nicht in 429 laufen, startet `scripts/start_test_server.sh` das Test-Backend mit `RATE_LIMIT_TEST_MULTIPLIER=10` (Zähler ×10, keine Ausnahme; wirkt nur bei DB `pundo_test` und nicht-produktivem `ENVIRONMENT`, sonst ignoriert mit Warn-Log — Details `pundo_main_backend/docs/testing.md`). Ein Backend, das nicht über dieses Skript/das Global-Setup gestartet wurde, ist strikt; Start-Log: `Rate limits relaxed x10`. Die Helfer (`shopOwnerOnboardWithRetry`, `shopOwnerLogin`) warten bei 429; UI-Logins ohne Retry vermeiden (Cookie-Injection, `adminLogin()` nutzt den Admin-Token aus dem Setup). **Es darf immer nur ein E2E-Lauf gleichzeitig laufen** (Lauf-Lock `<tmpdir>/pundo-e2e-run.lock`; ein zweiter Lauf bricht mit Meldung ab, ein toter Lock wird übernommen).

### Frontend-Start: Standalone mit Fingerabdruck-Cache (B8950-012)

`scripts/e2e-frontend.cjs`:

| Befehl | Wirkung |
|---|---|
| `start` | Standalone-Build `.next/standalone/server.js` auf Port 3500. Fingerabdruck = `{git HEAD, BACKEND_URL, neueste mtime von src/, public/, content/, next.config.ts, package*.json, tsconfig.json, .env.local}` in `.next/standalone/.e2e-build-stamp.json`. Weicht er ab (oder fehlt der Build): `rm -rf .next/standalone`, `next build` (ca. 3 min), `static/` und `public/` **sauber** kopieren (kein `static/static`). Gleicher Fingerabdruck → kein Rebuild |
| `check` | prüft den Server auf 3500 (siehe unten) |
| `E2E_FRONTEND_MODE=dev` | `start` startet stattdessen `npm run dev:test` (aktueller Code, langsamer unter Last) |

Läuft schon ein Server auf 3500 (`reuseExistingServer`), klassifiziert das Global Setup ihn über Prozess und Eltern-Kette: `next dev` → ok; Standalone → Stamp muss zum aktuellen Fingerabdruck passen **und** der Prozess muss nach dem Build gestartet sein, sonst **Abbruch** mit Anleitung (Port 3500 beenden, Playwright baut neu, oder `npm run dev:test`); unbekannter Prozess → Abbruch (außer `E2E_ALLOW_UNKNOWN_FRONTEND=1`). Ein von Hand gestartetes `node .next/standalone/server.js` ist **unbekannt** (der Prozess nennt sich `next-server`). `E2E_SKIP_FRONTEND_RESTART` ist ein No-op. Die Configs `e2e/smoke-only.config.ts` und `e2e/no-setup.config.ts` prüfen dasselbe über `e2e/frontend-freshness.ts`.

### Mit expliziten Ports (Debugging)

```bash
BACKEND_URL=http://localhost:8500 E2E_FRONTEND_PORT=3500 npx playwright test
```

### Einzelne Test-Datei

```bash
npx playwright test e2e/shop-admin-e2e.spec.ts
npx playwright test e2e/shop-discovery.spec.ts
npx playwright test e2e/main.spec.ts
```

### Mit UI-Debugger

```bash
npx playwright test --ui
```

---

## Was der Global Setup macht

`e2e/global-setup.ts` läuft **einmalig vor allen Tests** und:

0. erzeugt die **Run-ID** (`E2E_RUN_ID`, UTC `YYYYMMDDHHMMSS`), nimmt den Lauf-Lock und prüft das Frontend auf 3500 (`assertFrontendFresh`)
1. startet das Test-Backend auf 8500 neu
2. räumt Reste abgebrochener Läufe (Run-ID älter als `E2E_STALE_HOURS`, Default 6 h) per `scripts/e2e_test_data.py cleanup --stale-hours 6 --apply`
3. seedet Fixtures über `pundo_main_backend/scripts/prepare_e2e_db.py` (DB-Reset nur mit `E2E_RESET_DB=true`) und die Test-Kategorien `e2e-tmp-<run>-*`
4. registriert/approved den **globalen** Test-Owner `e2e-owner@pundo-e2e.io` (Shop `e2e-test-shop`) — nur noch für Login/Logout und Read-only-Prüfungen
5. loggt ihn ein, speichert alles inkl. `runId` und Admin-Token in `e2e/.test-state.json` (**gitignored**, enthält Test-JWTs)

`e2e/global-teardown.ts` gibt den Lauf-Lock frei. Der Reporter `e2e/reporters/cleanup-test-data.ts` räumt nach jedem Lauf (grün oder rot) alles mit Marker `e2e-<RUN>-…` weg (`e2e_test_data.py cleanup --run-id <RUN> --apply`, inkl. Kategorien) und gibt Zählungen vor/nach aus; betroffen sind nur Daten dieses Laufs (exakte Run-ID). Zur DB-Analyse eines roten Laufs: `E2E_KEEP_FAILED_DATA=1` (dann bleiben die Daten stehen). Mit `--reporter=…` auf der CLI entfällt dieser Cleanup.

**Wichtig:** `pundo_test` enthält Echtdaten aus Prod (via `sync_prod_to_test.sh`). Tests resetten die DB **nicht** automatisch. Expliziter Reset nur mit `E2E_RESET_DB=true npx playwright test`. Nach einem `sync_prod_to_test.sh` kann `e2e-owner` auf einen nicht mehr existierenden Shop zeigen → `prepare_e2e_db.py --skip-reset --skip-prod-copy` ausführen und den Lauf wiederholen.

---

## Testdaten-Isolation und Konvention (B8950-012)

**Ein Shop pro Worker, nie geteilt.** Specs, die schreiben, importieren `{ test, expect } from './_helpers/worker-shop'`:
- worker-scoped Fixture `workerShop`: legt pro Playwright-Worker per `POST /admin/shops` einen Shop an, holt das Owner-Token per Impersonation (`POST /admin/shops/{id}/impersonate`, kein Login-Rate-Limit) und überschreibt `storageState` damit. Teardown: `DELETE /admin/shops/{id}` (kaskadiert Owner, Listings, Offers, exklusive Items samt Foto-Dateien) + Admin-Delete der getrackten Items.
- `workerShop.api(method, path, body)` = Owner-API, `workerShop.createItem(spec, label, { listing })` legt ein Marker-Item an, `workerShop.tracker` merkt Items/Shops für den Teardown.
- **Pflicht-`afterAll` jeder Spec im Worker-Shop:** `await workerShop.cleanupSpecData()` (aktive Offers archivieren, Offers und Listings löschen, Marker-Items tracken), damit die nächste Spec im selben Worker einen leeren Shop sieht.
- `specShop('NAME')` = eigener Shop nur für diese Spec (Shop-Einstellungen/Profil, Foto-Upload — nur der Shop-Delete räumt Foto-Dateien —, Cross-Shop). Aufräumen: `await shop.destroy()` in `afterAll`.
- Registrierung/Onboarding/Login bleiben nur dort, wo sie Prüfgegenstand sind (`shop-owner-*`, `smoke-shop-visibility`, `shop-admin-product-crud`, Matrix); dort räumt `TestDataTracker` (`tracker.owner(id)` → Admin-Shop-Delete) auf.

**Marker** (`e2e/journeys/_helpers/test-data.ts`): `E2E-<RUN>-<SPEC>` am **Anfang** von Namen (`e2eName`), `e2e-<RUN>-<spec>-<rand>@pundo-e2e.io` bzw. `@pundo.com` nur für Auto-Approve (`e2eEmail`), Shop-Slugs `e2e-<RUN>-…` (`e2eSlug`). Verankerte Selektoren (`^e2e-<run>-`), **niemals** `LIKE '%e2e%'` (echte Shops wie `…-ef9e2e27` würden getroffen). Echte Prod-Items (z. B. `avicentra`) darf eine Spec nur im eigenen Test-Shop listen; gelöscht wird dann nur das Listing.

**Aufräumen von Hand** (Backend-Repo, `.venv`; ohne `--apply` immer Dry-Run, Guards: nur localhost/`pundo_test`):
```bash
python scripts/e2e_test_data.py report                       # Inventar
python scripts/e2e_test_data.py cleanup --run-id <RUN> --apply
python scripts/e2e_test_data.py cleanup --stale-hours 6 --apply
python scripts/e2e_test_data.py cleanup --legacy --include-customers      # Einmal-Bereinigung Altlasten (erst Dry-Run prüfen!)
```

---

## Test-Dateien

| Datei | Scope | Auth |
|-------|-------|------|
| `e2e/main.spec.ts` | Customer-Facing (Homepage, Suche, RTL, Mobile, Auth-Redirect) | Nein |
| `e2e/shop-admin-e2e.spec.ts` | Shop-Admin Portal (Login, CRUD, Logout) | Ja (storageState) |
| `e2e/shop-discovery.spec.ts` | Shop Discovery (Geocoding, Suche, Customer-Seite) | Gemischt |
| `e2e/admin.spec.ts` | System-Admin-Portal | Ja |
| `e2e/smoke.spec.ts` | Schneller Smoke-Test | Nein |
| `e2e/f2350-category-search.spec.ts` | Kategoriesuche | Nein |
| `e2e/language-smoke.spec.ts` | Sprachumschaltung | Nein |
| `e2e/price-history.spec.ts` | Preisverlauf | Nein |

Vollständiger Katalog: `e2e/TESTSET.md`

---

## Env-Variablen

| Variable | Default | Scope |
|----------|---------|-------|
| `BACKEND_URL` | `http://localhost:8500` | global-setup + spec-Dateien |
| `FRONTEND_URL` | `http://localhost:3500` | playwright.config + global-setup Browser |
| `E2E_FRONTEND_PORT` | `3500` | Port des Frontends (webServer / Freshness-Check) |
| `E2E_FRONTEND_MODE` | — | `dev` → webServer startet `npm run dev:test` statt Standalone-Build |
| `E2E_RUN_ID` | automatisch | Run-ID (UTC-Zeitstempel), vom Global Setup gesetzt |
| `E2E_STALE_HOURS` | `6` | Ab wann Reste abgebrochener Läufe automatisch gelöscht werden |
| `E2E_ALLOW_UNKNOWN_FRONTEND` | — | `1` → unbekannten Prozess auf 3500 tolerieren |
| `E2E_SKIP_FRONTEND_RESTART` | — | obsolet (No-op, das Setup startet kein Frontend mehr) |
| `BACKEND_REPO` | `/Users/bb_studio_2025/dev/github/pundo_main_backend` | global-setup (Python-Script-Pfad) |
| `E2E_ADMIN_SECRET` | `pundo-admin-dev-secret` | global-setup (Admin-Approve-Bearer) |
| `E2E_RESET_DB` | — | Expliziter DB-Reset (nur wenn nötig) |

---

## Troubleshooting

### `globalSetup` schlägt fehl: "DB reset failed"

```bash
cd pundo_main_backend
.venv/bin/python scripts/prepare_e2e_db.py
```

### Backend-API antwortet nicht

```bash
curl http://localhost:8500/health
# Falls Fehler: start_test_server.sh neu starten
```

### `.test-state.json` fehlt

```bash
rm -f e2e/.test-state.json && npx playwright test
```

### Login schlägt im Global Setup fehl

```bash
# In pundo_main_backend/.env prüfen:
JWT_SECRET=pundo-jwt-dev-secret-change-in-production
ADMIN_SECRET=pundo-admin-dev-secret
```

### Test-Shop hat keine Geo-Koordinaten

```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Finikoudes+Beach+Larnaca&key=YOUR_KEY"
```

## Hydration-Falle bei `goto` + Klick (B8950-012)
`page.goto(url, { waitUntil: 'domcontentloaded' })` wartet nur auf das Server-HTML. Ein sofortiger Klick auf einen SSR-Button, dessen React-Handler noch nicht hängt (Chunks laden; unter Last oder `next dev` mehrere Sekunden), geht verloren — Modal/Panel öffnet sich nie, der Folgeschritt läuft in den Test-Timeout. Für den ersten Klick nach `goto` auf eine Client-Seite `clickHydrated(locator)` aus `e2e/journeys/_helpers/hydration.ts` nutzen (pollt auf `__reactProps$…`, kein fester Timeout). Für Kategorie-Vorschläge `fillNameAndAwaitSuggestions()` (`_helpers/category-picker.ts`): wartet auf die `suggest`-Antwort, prüft den Status und nennt bei Fehlern Status/Dauer.
