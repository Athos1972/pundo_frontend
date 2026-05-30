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
# Terminal 1: Test-Backend starten (Port 8500, DB: pundo_test)
cd /path/to/pundo_main_backend
./scripts/start_test_server.sh

# Terminal 2: E2E-Tests (Frontend startet automatisch auf Port 3500)
cd /path/to/pundo_frontend
npm run dev:test   # startet Frontend auf 3500 → Backend 8500
# oder direkt:
npx playwright test
```

`BACKEND_URL` und `E2E_FRONTEND_PORT` sind in `playwright.config.ts` auf 8500/3500 vorbelegt — kein Setzen nötig.

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

1. Führt `pundo_main_backend/scripts/prepare_e2e_db.py` aus:
   - Führt `alembic upgrade head` auf `pundo_test` aus
   - Kopiert `categories` + `category_translations` von `pundo` → `pundo_test`
   - Gibt Test-Credentials als JSON aus

2. Registriert einen Test-Shop-Owner via `POST /api/v1/shop-owner/register`

3. Approvet ihn via `PATCH /api/v1/admin/shop-owner/{id}/approve` (Bearer-Token)

4. Loggt ihn via Browser ein und speichert den JWT-Cookie als Playwright `storageState`

5. Speichert alles in `e2e/.test-state.json` (gitignored)

**Wichtig:** `pundo_test` enthält Echtdaten aus Prod (via `sync_prod_to_test.sh`). Tests resetten die DB **nicht** automatisch. Expliziter Reset nur mit `E2E_RESET_DB=true npx playwright test`.

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
| `E2E_FRONTEND_PORT` | `3500` | `npm run dev:test` in webServer |
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
