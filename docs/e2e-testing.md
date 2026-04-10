# E2E-Tests — pundo Frontend

## Überblick

Die E2E-Tests laufen gegen eine isolierte `pundo_test`-PostgreSQL-Datenbank und testen den vollständigen Stack: Browser → Next.js → FastAPI → PostgreSQL → Google Geocoding.

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
# PostGIS-Extension aktivieren
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
# Terminal 1: Test-Backend starten (Port 8002, pundo_test)
cd /path/to/pundo_main_backend
E2E_BACKEND_PORT=8002 ./scripts/start_test_server.sh

# Terminal 2: E2E-Tests (Frontend startet automatisch auf Port 3000)
cd /path/to/pundo_frontend
BACKEND_URL=http://localhost:8002 npx playwright test
```

### Mit eigenem Frontend-Port

```bash
# Backend: Port 8002
E2E_BACKEND_PORT=8002 ./scripts/start_test_server.sh

# Tests mit Frontend auf Port 3001
BACKEND_URL=http://localhost:8002 \
FRONTEND_URL=http://localhost:3001 \
E2E_FRONTEND_PORT=3001 \
npx playwright test
```

### Wenn Frontend bereits läuft

Playwright erkennt einen laufenden Server automatisch (`reuseExistingServer: true`).

```bash
# Frontend läuft schon auf :3000
BACKEND_URL=http://localhost:8002 npx playwright test
```

### Einzelne Test-Datei

```bash
BACKEND_URL=http://localhost:8002 npx playwright test e2e/shop-admin-e2e.spec.ts
BACKEND_URL=http://localhost:8002 npx playwright test e2e/shop-discovery.spec.ts
BACKEND_URL=http://localhost:8002 npx playwright test e2e/main.spec.ts
```

### Mit UI-Debugger

```bash
BACKEND_URL=http://localhost:8002 npx playwright test --ui
```

---

## Was der Global Setup macht

`e2e/global-setup.ts` läuft **einmalig vor allen Tests** und:

1. Führt `pundo_main_backend/scripts/prepare_e2e_db.py` aus:
   - Setzt `pundo_test`-Schema zurück (alembic upgrade head)
   - Kopiert `categories` + `category_translations` von `pundo` → `pundo_test`
   - Gibt Test-Credentials als JSON aus

2. Registriert einen Test-Shop-Owner via `POST /api/v1/shop-owner/register`

3. Approvet ihn via `PATCH /api/v1/admin/shop-owner/{id}/approve` (Bearer-Token)

4. Loggt ihn via Browser ein und speichert den JWT-Cookie als Playwright `storageState`

5. Speichert alles in `e2e/.test-state.json` (gitignored)

---

## Test-Dateien

| Datei | Scope | Auth |
|-------|-------|------|
| `e2e/main.spec.ts` | Customer-Facing (Homepage, Suche, RTL, Mobile, Auth-Redirect) | Nein |
| `e2e/shop-admin-e2e.spec.ts` | Shop-Admin Portal (Login, CRUD, Logout) | Ja (storageState) |
| `e2e/shop-discovery.spec.ts` | Shop Discovery (Geocoding, Suche, Customer-Seite) | Gemischt |

---

## Env-Variablen

| Variable | Default | Scope |
|----------|---------|-------|
| `BACKEND_URL` | `http://localhost:8001` | global-setup + spec-Dateien |
| `FRONTEND_URL` | `http://localhost:3000` | playwright.config + global-setup Browser |
| `E2E_FRONTEND_PORT` | `3000` | `npm run dev` in webServer |
| `BACKEND_REPO` | `/Users/bb_studio_2025/dev/github/pundo_main_backend` | global-setup (Python-Script-Pfad) |
| `E2E_ADMIN_SECRET` | `pundo-admin-dev-secret` | global-setup (Admin-Approve-Bearer) |

---

## Troubleshooting

### `globalSetup` schlägt fehl: "DB reset failed"

```bash
# Manuell prüfen:
cd pundo_main_backend
.venv/bin/python scripts/prepare_e2e_db.py
```

### Backend-API antwortet nicht

```bash
curl http://localhost:8002/health
# Falls Fehler: start_test_server.sh neu starten
```

### `.test-state.json` fehlt

```bash
# Datei erzwungen löschen und global-setup neu laufen lassen:
rm -f e2e/.test-state.json
BACKEND_URL=http://localhost:8002 npx playwright test --project=setup 2>/dev/null || \
BACKEND_URL=http://localhost:8002 npx playwright test
```

### Login schlägt im Global Setup fehl

Prüfen ob Backend den JWT-Secret kennt:
```bash
# In pundo_main_backend/.env:
JWT_SECRET=pundo-jwt-dev-secret-change-in-production
ADMIN_SECRET=pundo-admin-dev-secret
```

### Test-Shop hat keine Geo-Koordinaten

Google Geocoding API prüfen:
```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Finikoudes+Beach+Larnaca&key=YOUR_KEY"
```
