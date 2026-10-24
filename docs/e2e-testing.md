# E2E-Tests — pundo Frontend

## Überblick

Die E2E-Tests laufen gegen eine isolierte `pundo_test`-PostgreSQL-Datenbank und testen den vollständigen Stack: Browser → Next.js (Port **3500**) → FastAPI (Port **8500**) → PostgreSQL → Google Geocoding.

**Port-Konvention (nie abweichen):**

| Instanz | Frontend | Backend | Datenbank |
|---|---|---|---|
| **Produktion** | 3000 | 8000 | `pundo` |
| **E2E-Tests** | **3500** | **8500** | `pundo_test` |

Playwright-Safety-Check in `playwright.config.ts` verwirft Port 8000 explizit.

### Worktree-Slots (F8970)

Slot 0 bleibt der bisherige Einzelarbeitsmodus. Ein ausdrücklich angelegter
Backend-Controller-Slot 1–4 verwendet ausschließlich das feste Portpaar
3511–3514 / 8511–8514. `e2e/env.ts` akzeptiert einen Slot nur mit passendem,
externem 0600-Manifest und Lease-Token; abweichende Ports, Produktionsports
oder eine fremde Datenbank werden vor Playwright abgelehnt. Jeder Slot besitzt
einen eigenen E2E-Lock, ein vom Controller erzeugtes privates
`E2E_STATE_DIR` (State-Datei und Admin-Storage-State) und Next-Ausgabe
`.next-worktree-s<N>`. In einem Slot startet der Controller nur das Backend;
Playwright besitzt den Frontend-Prozess und verwendet keinen vorhandenen
Standalone auf dem Slot-Port. So wird ein frischer Standalone-Build erzwungen
und `globalSetup`/`globalTeardown` bleiben vollständig slot-isoliert.

```bash
# Backend-Worktree: Slot erzeugen und nur dessen Backend starten
scripts/worktree-env new --slot 1 --backend "$PWD" --frontend <frontend-worktree> --data-mode prodcopy
scripts/worktree-env start --slot 1 backend

# Frontend-Worktree: Slot-Env laden und Browser-Smoke starten
source ~/.pundo/worktree-env/slots/slot-1/frontend.env
npx playwright test --project=smoke

# Danach im Backend-Worktree vollständig entfernen (DB, Prozesse, E2E-State)
scripts/worktree-env stop --slot 1 backend
scripts/worktree-env destroy --slot 1
```

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
| Onboarding → Login → Item → Shop je Shop-Unterart (44) | Seit F8950 T19 Backend-pytest: `pundo_main_backend/ingestor/tests/prodcopy/test_shop_type_matrix.py` |

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

## Gates, Hooks und Nightly (F8950 T34)

Ein Skript für alle Läufe: `scripts/test-gate.sh <lane>` (gemeinsame Helfer `scripts/gate-lib.sh`: Lock, Timeout, Logs, `last_run`; eine inhaltsgleiche Kopie liegt im Backend-Repo, Änderungen immer in beiden Repos nachziehen).

| Lane | Befehl | Inhalt | Dauer (2026-10-15) |
|---|---|---|---|
| fast | `scripts/test-gate.sh fast` | `tsc --noEmit`, eslint, `lint:i18n`, Vitest | 47 s |
| commit | `scripts/test-gate.sh commit` | `lint:i18n` + Vitest (manuell; **kein** pre-commit-Hook, mehrere Sessions committen aus einem Working Tree) | ca. 30 s |
| smoke | `scripts/test-gate.sh smoke` | Playwright-Projekt `smoke` (das Backend-Push-Gate ruft das, A5) | 45 s |
| push | `scripts/test-gate.sh push` (Pre-Push-Hook) | fast + Playwright voll (smoke, dann full) + `npm audit --omit=dev --audit-level=high` (wie die CI) + gitleaks, falls installiert | 161 s |
| nightly | `scripts/test-gate.sh nightly` (von `pundo_main_backend/scripts/nightly.sh` gerufen) | fast + Playwright `--repeat-each=2 --retries=0` + audit + gitleaks | siehe Nightly |
| e2e-coverage | `scripts/test-gate.sh e2e-coverage` (auch von der Nightly gerufen) | Messlauf, kein Gate: Playwright voll im Coverage-Modus + Vitest-Coverage + Bericht, siehe [Coverage](#coverage-der-e2e-tests-optional) | ca. 3 min |

**Vitest** läuft in `fast` (`npx vitest run`, ca. 12 bis 27 s je nach Last). Tests liegen in `src/tests/` (Komponenten, Utilities), Architektur-Guards über viele Dateien in `tests/unit/guards/` (z. B. Client-IP-Helper in allen Routen, Shop-Admin-Boundary), Journey-Parser in `e2e/journeys/_parser.spec.ts`. Kein Test liest den Quelltext einer einzelnen Komponente per Regex; dafür gibt es Render-Tests (Testing Library).

**Aktivierung des Hooks (einmal je Klon, nicht automatisch).**

```bash
scripts/install-hooks.sh                 # = git config core.hooksPath .githooks
git config --unset core.hooksPath        # deaktivieren
```

`.githooks/pre-push` prüft nur Pushes, die `refs/heads/main` aktualisieren (andere Branches und Löschungen laufen durch) und startet `scripts/test-gate.sh push`.

**Robustheit (mehrere Sessions, ein Working Tree).**
- **Fail-closed.** PostgreSQL aus `pundo_main_backend/.env` (`DATABASE_URL_TEST`) nicht erreichbar, Backend-Repo oder `.venv` fehlt → sofort Abbruch mit Hinweis. Test-Backend 8500 startet der Playwright-Global-Setup selbst (kill + restart), das Test-Frontend 3500 der `webServer` (Standalone-Build, ein Rebuild kostet ca. 3 min); jeder Schritt hat ein hartes Timeout (die Prozessgruppe wird beendet), das Gate hängt also nie.
- **Ein Lauf zur Zeit.** Gemeinsamer Lock `~/Library/Caches/pundo-test-gate/lock.d` für Backend-Gate, Frontend-Gate und Nightly (verwaiste Locks toter Prozesse werden übernommen), zusätzlich der Playwright-Lauf-Lock der Specs. Ist der Gate-Lock belegt, bricht der Hook mit PID und Lane ab (`GATE_LOCK_WAIT=<s>` wartet stattdessen). Laufende fremde `pytest`- oder `playwright test`-Prozesse (beide Seiten teilen `pundo_test`) lässt das Gate bis zu 90 s (`GATE_BUSY_WAIT`) abklingen und bricht dann ab.
- **Frontend 3500 nur Standalone im Gate (B8950-013 §10).** Die Playwright-Lanes (`smoke`, `push`, `nightly`, `e2e-coverage`) rufen nach `gate_wait_idle` `node scripts/e2e-frontend.cjs gate-prepare` und setzen `E2E_REQUIRE_STANDALONE=1`: ein laufender `next dev` (und ein veralteter Standalone) auf 3500 wird beendet, `E2E_FRONTEND_MODE=dev` bricht ab. Taucht danach wieder ein `next dev` auf, bricht das Global Setup mit „Gate-Modus“ ab.
- **Bereits grün.** Lief das Push-Gate für genau den zu pushenden Commit grün (Arbeitsbaum ohne getrackte Änderungen, < 6 h), überspringt der Hook den zweiten Lauf (`GATE_FORCE=1` erzwingt ihn).
- **Der Lauf testet den Arbeitsbaum**, nicht isoliert den gepushten Commit. Halbfertige Änderungen anderer Sessions können das Gate rot machen: klären, nicht umgehen. Die Playwright-Läufe schreiben außerdem `e2e/journeys/reports/*` neu; das Verzeichnis ist gitignored (lokale Laufartefakte, seit 2026-10-16).
- **Nachweis.** `.claude/playbooks/state/test-gate.last_run` (JSON: Lane, Start, Dauer, Ergebnis, Commit, Einzelschritte, Log-Pfad; gitignored) plus `test-gate.<lane>.last_run`. Logs je Schritt: `~/Library/Logs/pundo-test-gate/<Zeit>-<repo>-<lane>/<Schritt>.log` (14 Tage).
- **`--no-verify` ist verboten ohne Bernhards Freigabe.** Zulässige Gründe: Gate selbst defekt (Skriptfehler, Registry/npm nicht erreichbar bei dringendem Hotfix) oder reine Doku-/Vault-Änderung. Der Grund steht in der Handoff-Notiz bzw. Commit-Nachricht; die nächste Nightly prüft nach.
- Agents rufen `git push` mit hohem Tool-Timeout (mind. 600000 ms) auf.
- **gitleaks** ist lokal optional (`brew install gitleaks`); ohne Installation meldet das Gate `skip gitleaks` und die CI scannt weiterhin. Das ist eine bekannte Lücke gegenüber der CI.

**Nightly.** `pundo_main_backend/scripts/nightly.sh` (launchd-Vorlage und Installationsanleitung: `pundo_main_backend/ops/launchd/`) läuft beide Repos nacheinander: Backend ruff, Semgrep, pytest in vier Varianten (Template-DB / Prod-Kopie x fest / zufällig), dann dieses Repo mit `scripts/test-gate.sh nightly` und zuletzt mit `scripts/test-gate.sh e2e-coverage` (jede Nacht, ca. 3 bis 4 min; Bericht `~/Library/Logs/pundo-nightly/<Datum>/frontend-e2e-coverage/summary.md`, die Kennzahl steht zusätzlich in `summary.txt`; `NIGHTLY_E2E_COVERAGE=0` schaltet den Schritt ab). Logs: `~/Library/Logs/pundo-nightly/<Datum>/`, bei Rot eine macOS-Benachrichtigung.

## E2E-Tests ausführen

### Standard (empfohlen)

```bash
cd /Users/bb_studio_2025/dev/github/pundo_frontend
scripts/test-gate.sh push                    # Gate: statisch + Vitest + Playwright voll + audit (ca. 2,7 min)
npx playwright test                          # nur Playwright voll: smoke, dann full (ca. 1,9 min, warmer Build)
npx playwright test --project=smoke          # nur das Smoke-Gate (ca. 45 s)
npx playwright test --repeat-each=2 --retries=0    # Flake-Prüfung (ca. 3,1 min)
```

Das Global Setup startet das Test-Backend (Port 8500) selbst neu. **Das Frontend startet ausschließlich Playwright** (`webServer` → `node scripts/e2e-frontend.cjs start`, siehe unten) — das Global Setup startet/kill-t kein Frontend mehr, sondern prüft nur, dass der Server auf 3500 aktuellen Code ausliefert.

`BACKEND_URL` und `E2E_FRONTEND_PORT` sind in `playwright.config.ts` auf 8500/3500 vorbelegt — kein Setzen nötig. **Rate-Limits:** Onboarding 5/min und Login 10/min gelten pro IP (kein Bypass seit B6220-001). Damit volle Parallel-Läufe nicht in 429 laufen, startet `scripts/start_test_server.sh` das Test-Backend mit `RATE_LIMIT_TEST_MULTIPLIER=40` (Zähler ×40, keine Ausnahme; seit F6225 zählen alle 4 Backend-Worker gemeinsam in Postgres `pundo_test.rate_limit_counters`, der Multiplikator wirkt daher exakt statt bis ×4 lockerer; wirkt nur bei DB `pundo_test` und nicht-produktivem `ENVIRONMENT`, sonst ignoriert mit Warn-Log — Details `pundo_main_backend/docs/testing.md`). Ein Backend, das nicht über dieses Skript/das Global-Setup gestartet wurde, ist strikt; Start-Log: `Rate limits relaxed x40`. Die Helfer (`shopOwnerOnboardWithRetry`, `shopOwnerLogin`) warten bei 429; UI-Logins ohne Retry vermeiden (Cookie-Injection, `adminLogin()` nutzt den Admin-Token aus dem Setup). **Es darf immer nur ein E2E-Lauf gleichzeitig laufen** (und kein voller Backend-pytest gleichzeitig: beide teilen `pundo_test`; `scripts/test-gate.sh` prüft das vor dem Start) (Lauf-Lock `<tmpdir>/pundo-e2e-run.lock`; ein zweiter Lauf bricht mit Meldung ab, ein toter Lock wird übernommen).

### Projekte `smoke` und `full`, Workers (F8950 T15/T16)

`playwright.config.ts` kennt zwei Projekte; **jeder Test läuft in genau einem**:

| Projekt | Inhalt | Start |
|---|---|---|
| `smoke` | Tests mit Tag `@smoke` (ca. 39: `smoke.spec`, `smoke-shop-visibility`, `language-smoke` en + ar, je ein Test aus `main`, `admin`, `shop-admin-e2e`, `price-history`, `contact-form`) | `npx playwright test --project=smoke` (allein ca. 20 s inkl. Setup) |
| `full` | alle übrigen, `dependencies: ['smoke']` | `npx playwright test` (beide) bzw. `--project=full --no-deps` |

Schlägt ein Smoke-Test fehl, überspringt Playwright `full` („did not run“): ein kaputter Build kostet so Sekunden statt eines Volllaufs. Tag setzen: `test('…', { tag: '@smoke' }, …)` bzw. `test.describe('…', { tag: '@smoke' }, …)`; serielle Gruppen nur ganz in `smoke` oder ganz in `full`. `workers: 4`, `maxFailures: 15` (`E2E_MAX_FAILURES` überschreibt). `smoke-only.config.ts` (ohne Global Setup, für `smoketest.yml`) bleibt unverändert.

**Flake-Prüfung (AK5):** `npx playwright test --repeat-each=2 --retries=0` muss ohne einen Fehler laufen. Beide Wiederholungen teilen die Run-ID; Specs, die Namen in derselben Kategorie anlegen, wählen deshalb eine zufällige Kategorie (Fuzzy-409 des Backends).

### Geteilter State (Audit F8950 T16)

Der globale Owner/Shop aus `e2e/.test-state.json` (`e2e-owner@pundo-e2e.io`, Prod-Kopie-Shop 7937 `happy-pets-nicosia`) wird **nur gelesen**. Wer schreibt, nutzt `workerShop`/`specShop`. Stand der Prüfung der 11 State-Leser:

| Spec | Nutzung des globalen State | Schreibt in den globalen Shop? |
|---|---|---|
| `shop-discovery.spec` | Shopname/Owner-ID für Suche und Detailseite; Schreibtests in `workerShop` | nein |
| `variable-price.spec` | früher `fixtures.product_slugs` (nie geschrieben, ganze Spec lief als Skip); jetzt Fixture-Vertrag per by-slug-API | nein |
| `shop-admin-e2e.spec` | nur Login-Credentials für den UI-Login-Test; alles andere `workerShop` | nein |
| `journeys/shop-admin-import-image-url.spec` | **früher** `storageState` des globalen Owners (Upload-Test hätte in Shop 7937 geschrieben); jetzt `specShop('IMPORT-IMAGE-URL')` | nein (umgestellt) |
| `journeys/customer-discovery.spec` | Shopname/-slug für Suche und Detailseite | nein |
| `journeys/import-page-ac-check.spec` | `storageState` des globalen Owners zum Lesen der Import-Seite | nein (nur GET der Seite) |
| `journeys/customer-shop-promo-visibility.spec` | **früher** Slug des globalen Shops; jetzt zwei `specShop` mit synthetischen Daten | nein (umgestellt) |
| `journeys/shop-admin-offers.spec` | `workerShop`; Cross-Shop-Gruppe `specShop` | nein |
| `journeys/social-link-moderation.spec` | nur Admin-Token; Schreiben in `specShop('SOCIAL-LINK')` | nein |
| `journeys/customer-and-review-lifecycle.spec` | **früher** Slug des globalen Shops als Review-Ziel; jetzt `specShop('CARL')` | nein (umgestellt) |
| `journeys/_helpers.ts` | Admin-Token (ein Login pro Lauf) | nein |

Nachweis nach den Läufen: `e2e_test_data.py report` zeigt keine Reste; `item_photos`, `shop_listings` und `offers` des Shops 7937 sind unverändert.

### Frontend-Start: Standalone mit Fingerabdruck-Cache (B8950-012)

`scripts/e2e-frontend.cjs`:

| Befehl | Wirkung |
|---|---|
| `start` | Standalone-Build `.next/standalone/server.js` auf Port 3500. Fingerabdruck = `{git HEAD, BACKEND_URL, neueste mtime von src/, public/, content/, next.config.ts, package*.json, tsconfig.json, .env.local}` in `.next/standalone/.e2e-build-stamp.json`. Weicht er ab (oder fehlt der Build): `rm -rf .next/standalone`, `next build` (ca. 3 min), `static/` und `public/` **sauber** kopieren (kein `static/static`). Gleicher Fingerabdruck → kein Rebuild |
| `check` | prüft den Server auf 3500 (siehe unten) |
| `gate-prepare` | nur Gate (`test-gate.sh`, vor Playwright): beendet `next dev` (Listener + dev-Vorfahren) bzw. einen veralteten Standalone auf 3500; frischer Standalone bleibt, unbekannter Prozess → Abbruch (nie beendet). Ausgabe: JSON `{action, pids}`; Ports 3000/8000 werden verweigert |
| `E2E_FRONTEND_MODE=dev` | `start` startet stattdessen `npm run dev:test` (aktueller Code, langsamer unter Last) |

Läuft schon ein Server auf 3500 (`reuseExistingServer`), klassifiziert das Global Setup ihn über Prozess und Eltern-Kette: `next dev` → ok bei lokalen Läufen (mit WARNUNG: kein Turnstile-Sitekey, Doppel-Render; nicht gate-gleichwertig), im Gate (`E2E_REQUIRE_STANDALONE=1`) beendet `test-gate.sh` ihn vorher und das Global Setup bricht ab, falls er wieder auftaucht; Standalone → Stamp muss zum aktuellen Fingerabdruck passen **und** der Prozess muss nach dem Build gestartet sein, sonst **Abbruch** mit Anleitung (Port 3500 beenden, Playwright baut neu, oder `npm run dev:test`); unbekannter Prozess → Abbruch (außer `E2E_ALLOW_UNKNOWN_FRONTEND=1`). Ein von Hand gestartetes `node .next/standalone/server.js` ist **unbekannt** (der Prozess nennt sich `next-server`). `E2E_SKIP_FRONTEND_RESTART` ist ein No-op. Die Configs `e2e/smoke-only.config.ts` und `e2e/no-setup.config.ts` prüfen dasselbe über `e2e/frontend-freshness.ts`.

### Mit expliziten Ports (Debugging)

```bash
BACKEND_URL=http://localhost:8500 E2E_FRONTEND_PORT=3500 npx playwright test
```

### Einzelne Test-Datei

Einzelaufrufe laufen ohne Gate-Lock, aber mit Global Setup und Lauf-Lock (nie neben einem Backend-pytest-Volllauf):

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

## Coverage der E2E-Tests (optional)

Misst, welche Zeilen und Funktionen von `src/**` die Playwright-Tests ausführen, getrennt nach Browser und Server, und kombiniert das mit der Vitest-Abdeckung. Reine Messung ohne Schwellenwert. Der normale Lauf ändert sich nicht: ohne `E2E_COVERAGE=1` greift keine der Änderungen, `build:prod` bleibt unverändert.

```bash
npm run test:e2e:coverage                      # = node scripts/e2e-coverage.mjs: Playwright voll + Vitest + Bericht (ca. 3 min)
npm run test:e2e:coverage -- e2e/smoke.spec.ts --project=smoke   # Argumente gehen an `playwright test`
npm run test:e2e:coverage:report               # nur den Bericht aus vorhandenen Rohdaten neu bauen
scripts/test-gate.sh e2e-coverage              # wie oben, mit Lock/Preflight; Bericht im Log-Verzeichnis des Gates
E2E_COVERAGE=1 npx playwright test             # nur Rohdaten sammeln (kein Bericht)
```

Ergebnis in `coverage-e2e/` (gitignored, anderes Verzeichnis: `E2E_COVERAGE_DIR`): `summary.md` (Tabellen je Bereich), `summary.json` (auch je Datei), `client/index.html` und `server/index.html` (V8-Bericht je Seite bis in den Quelltext), `vitest/coverage-final.json`.

**Wie gemessen wird.**
- **Eigener Build.** Mit `E2E_COVERAGE=1` baut `scripts/e2e-frontend.cjs` nach `.next-cov/` (`next.config.ts` reagiert auf `E2E_COVERAGE_BUILD=1`): Source-Maps für Browser und Server, nicht minifiziert, Typprüfung aus (macht `tsc` im Gate). Der normale `.next`-Build samt Fingerabdruck-Cache bleibt unberührt; `.next-cov` hat einen eigenen Stamp (Rebuild ca. 15 bis 60 s). `tsconfig.next-cov.json` ist nur dafür da, dass `next build` `tsconfig.json` (Fingerabdruck-Input) nicht umschreibt.
- **Browser.** `playwright.config.ts` setzt im Coverage-Modus `tsconfig: tsconfig.e2e-cov.json`; dort wird `@playwright/test` auf `e2e/coverage/pw-test.ts` abgebildet. Dieses `test` überschreibt die Worker-Fixture `browser`, sodass jede Seite jedes Contexts (auch `adminPage`, `browser.newContext()`) eine V8-Precise-Coverage über ein CDP-Session bekommt (`e2e/coverage/client-collector.ts`). Kein Spec wurde angepasst. Gesichert wird vor jeder Navigation und beim Schließen des Contexts, Rohdaten: `client-raw/*.json.gz`. Nur Chromium.
- **Server.** Der Standalone-Server startet mit `NODE_V8_COVERAGE=<Ausgabeordner>/server-raw`; Node schreibt beim Beenden (Playwright sendet SIGTERM und wartet bis zu 20 s, `gracefulShutdown`). Deckt Server Components, Route-Handler und `proxy.ts` ab.
- **Auswertung.** `monocart-coverage-reports` (MIT, devDependency) führt die V8-Daten über die Source-Maps auf `src/` zurück. Gerechnet wird auf Zeilenebene: Nenner sind die Statement-Zeilen, die Vitest kennt (`--coverage.include=src/**/*.{ts,tsx}`, nicht geladene Dateien zählen mit 0 %); eine Zeile ist durch E2E abgedeckt, wenn V8 dort Ausführung meldet. Kombiniert = E2E oder Vitest. Vitest erscheint mit seinen eigenen Zahlen, E2E und Kombination sind Zeilen-Näherungen (Statement-genau ist nur Vitest). Funktionen zählen unter ihrer Startzeile.
- **Browser vs. Server.** Client Components laufen auch beim SSR auf dem Server; Server-Code läuft nie im Browser. "E2E gesamt" ist die Vereinigung.

**Grenzen und Betrieb.**
- Der Lauf braucht Port 3500 frei (ein bereits laufender, nicht instrumentierter Server würde sonst wiederverwendet; `reuseExistingServer` ist im Coverage-Modus aus) und teilt sich Lock, `pundo_test` und 8500 mit den Gates. Das Skript bricht ab, wenn Playwright, pytest oder ein Server auf 3500 läuft.
- Vitest läuft innerhalb des Skripts (`E2E_COVERAGE_VITEST=run|reuse|skip`). Ohne Vitest fehlen die Spalten Vitest und Kombiniert, der Nenner sind dann die Codezeilen des Bundles.
- `E2E_COVERAGE_KEEP_RAW=0` löscht die Rohdaten nach dem Bericht (die Gate-Lane tut das; Rohdaten sind für den vollen Lauf ca. 10 MB komprimiert plus Server-Dump).
- Der Coverage-Fingerabdruck ignoriert `src/tests/` (Tests sind nicht im Bundle); der normale Fingerabdruck nicht.
- Messung läuft mit `workers: 4` wie sonst, kostet etwa 30 % Laufzeit.

## Was der Global Setup macht

`e2e/global-setup.ts` läuft **einmalig vor allen Tests** und:

0. erzeugt die **Run-ID** (`E2E_RUN_ID`, UTC `YYYYMMDDHHMMSS`), nimmt den Lauf-Lock und prüft das Frontend auf 3500 (`assertFrontendFresh`)
1. startet das Test-Backend auf 8500 neu
2. räumt Reste abgebrochener Läufe (Run-ID älter als `E2E_STALE_HOURS`, Default 6 h) per `scripts/e2e_test_data.py cleanup --stale-hours 6 --apply`
3. seedet Fixtures über `pundo_main_backend/scripts/prepare_e2e_db.py` (DB-Reset nur mit `E2E_RESET_DB=true`), die Test-Kategorien `e2e-tmp-<run>-*` und bei jedem Lauf die synthetische Preisverlauf-Fixture (`--seed-price-history`, siehe „Zwei-Ebenen-Prinzip“)
3b. setzt bei jedem Lauf den **globalen Kontakt-Tageszähler** zurück (`prepare_e2e_db.py --reset-contact-limit`: nur Key `LIMITER/contact:global/…` in `pundo_test.rate_limit_counters`; `contact-form` C4 verbraucht pro Lauf ca. 120 der 4000 Test-Tageskontingente, sonst 429 im `@smoke`-Test nach ca. 33 Läufen; Prod-Limits unberührt)
4. registriert/approved den **globalen** Test-Owner `e2e-owner@pundo-e2e.io` (Shop `e2e-test-shop`) — nur noch für Login/Logout und Read-only-Prüfungen
5. loggt ihn ein, speichert alles inkl. `runId` und Admin-Token in `e2e/.test-state.json` (**gitignored**, enthält Test-JWTs)

`e2e/global-teardown.ts` ruft `e2e/cleanup-run.ts`: nur der Prozess, der den Lauf-Lock hält (`ownsLock`: gleiche PID + Run-ID; ein `playwright test --list` übernimmt zwar die Run-ID aus `.test-state.json`, hält aber nie den Lock und räumt nichts auf), räumt nach jedem Lauf (grün oder rot) alles mit Marker `e2e-<RUN>-…` weg (`e2e_test_data.py cleanup --run-id <RUN> --apply`, inkl. Kategorien) und gibt Zählungen vor/nach aus; betroffen sind nur Daten dieses Laufs (exakte Run-ID). Danach gibt er den Lock frei. Zur DB-Analyse eines roten Laufs: `E2E_KEEP_FAILED_DATA=1` (die Daten bleiben stehen, unabhängig vom Teststatus, weil der Teardown ihn nicht kennt). Der Cleanup liegt im globalTeardown und läuft auch mit `--reporter=…` auf der CLI; ein CLI-Reporter ersetzt allerdings den JSON-Report (siehe unten).

**Laufzeit-Report (T3):** `playwright.config.ts` schreibt `test-results/e2e-report.json` (JSON-Reporter). Auswertung: `node scripts/e2e-durations.mjs [report.json] [--top N]` (Wanduhr, Testanzahl, Skips, Flakes, Top-N Dateien). **Admin-Specs:** das Global Setup schreibt den Admin-Token als storageState nach `e2e/.auth/admin.json` (gitignored); `admin.spec.ts` nutzt ihn, ein fehlender/ungültiger Token lässt die Tests fehlschlagen (kein Skip). Im Reuse-Modus (`E2E_REUSE_STATE=1`) nimmt das Setup ebenfalls den Lauf-Lock.

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

## Datenabhängige Tests: Zwei-Ebenen-Prinzip

`pundo_test` ist eine Prod-Kopie und driftet (Preise ändern sich, Crawls altern aus Zeitfenstern heraus). Tests, deren Prüfgegenstand von bestimmten Daten abhängt, werden deshalb in **zwei Ebenen** geschrieben — Referenz-Umsetzung: `e2e/price-history.spec.ts`.

| Ebene | Daten | Verhalten |
|---|---|---|
| **1. Funktionale Regression** | **synthetische, permanente Fixture**, vom Global Setup bei **jedem** Lauf idempotent upserted | läuft **immer**, **kein Skip**; fehlt die Fixture, schlägt der Test mit Hinweis fehl |
| **2. Realdaten-Check** | Kandidat wird zur Laufzeit per API auf 8500 in der Prod-Kopie gesucht (synthetische `e2e-*` ausgeschlossen) | Kernprüfungen gegen das echte Objekt, sonst `test.skip` mit konkreter Begründung (z. B. „keine produktiven Preisdaten im 90-Tage-Fenster in pundo_test“) |

Regeln für Ebene-1-Fixtures:
- **Ort:** `pundo_main_backend/scripts/prepare_e2e_db.py` (eigenes Flag, z. B. `--seed-price-history`), aufgerufen in `e2e/global-setup.ts`. Zeitabhängige Felder (`crawled_at` u. ä.) **relativ zu „jetzt“** schreiben, damit nichts aus Backend-Zeitfenstern läuft.
- **Idempotent:** Upsert über stabile Slugs (`ON CONFLICT (slug)`), abhängige Zeilen (Offers) nur unterhalb der eigenen Listings ersetzen — keine Duplikate, nie Prod-Kopie-Daten anfassen, kein TRUNCATE/DROP.
- **Marker + Schutz:** Slugs `e2e-<thema>-…` (ohne Run-ID → kein Stale-Cleanup); Shop-/Item-Slugs zusätzlich als permanent in `scripts/e2e_test_data.py` eintragen (sonst räumt `cleanup --legacy` sie weg).
- **Unsichtbar halten:** Shop ohne Adresse/Location (nicht indexierbar → keine Shop-Sitemap, keine Karte/Nearby), Items ohne Kategorie (keine Kategorie-Zählungen), Listing-`created_at` alt (nie „newest“), Namen ohne gängige Suchbegriffe. Restwirkung: Produkt-Sitemap listet alle Items (wie bei den übrigen `e2e-*`-Fixtures).
- **Erwartungswerte** stehen gespiegelt in der Spec; der `beforeAll` prüft den Fixture-Vertrag per API (Preise, Zeitfenster), damit Drift der Fixture sofort als Fehler auffällt.

Preisverlauf-Fixture (`--seed-price-history`, Shop `e2e-price-history-shop`): `e2e-price-history-falling` (4 Punkte, aktuell = Tiefstwert), `-rising` (aktuell ≠ Tiefstwert), `-flat` (gleiche Preise, kein Trend-Badge), `-single` (genau 1 Punkt → Empty-State), `-outside-window` (einziger Crawl vor 120 Tagen → kein Block).

Inaktive Such-Fixture (`--seed-inactive-shop`, Shop `e2e-inactive-search-shop`, Name „Zzquokka Dormant Bakery“, Status `inactive`, Standort Larnaca): bewusst **mit** Location im Default-Radius und mit eindeutigem Namen, damit die Namenssuche ihn ohne Statusfilter fände; `shop-discovery.spec.ts` prüft, dass er nicht erscheint (AC10, F2250). Eigene Fixture je ausschließendem Zustand (aktiv/inaktiv), keine „Alles-Fixture“. Läuft bei jedem Lauf aus `e2e/global-setup.ts` (Schritt 1c2), nur gegen `pundo_test`.

---

## Test-Dateien

Stand 2026-10-15: 710 Tests (39 `smoke`, 671 `full`; 703 passed, 7 bedingte Skips mit Grund im Test). Verteilung: 24 Specs im Wurzelverzeichnis `e2e/`, 45 Journey-Specs in `e2e/journeys/` (je Journey eine `.md` im Katalog, `CATALOG.md`), 3 Security-Specs in `e2e/security/`. Auswahl:

| Datei | Scope | Auth |
|-------|-------|------|
| `e2e/smoke.spec.ts`, `smoke-shop-visibility.spec.ts` | Smoke-Gate (Tag `@smoke`) | Nein |
| `e2e/main.spec.ts` | Customer-Facing (Homepage, Suche, RTL, Mobile, Auth-Redirect) | Nein |
| `e2e/shop-admin-e2e.spec.ts` | Shop-Admin Portal (Login, CRUD, Logout) | Ja (storageState) |
| `e2e/shop-discovery.spec.ts` | Shop Discovery (Geocoding, Suche, Customer-Seite) | Gemischt |
| `e2e/admin.spec.ts` | System-Admin-Portal (Admin-storageState) | Ja |
| `e2e/f2350-category-search.spec.ts` | Kategoriesuche | Nein |
| `e2e/language-smoke.spec.ts` | Sprachumschaltung (en, ar im Smoke) | Nein |
| `e2e/price-history.spec.ts` | Preisverlauf (Zwei-Ebenen-Referenz) | Nein |
| `e2e/journeys/*.spec.ts` | Katalog-Journeys (Shop-Owner-Lebenszyklus, Admin, Customer, Offers, Onboarding, Service-Katalog …) | Gemischt |

Vollständiger Katalog und Messwerte: `e2e/TESTSET.md`

### Claim-Journeys (F5970)

`shop-claim-self-service` und `shop-claim-dispute` (Status `proposed`, Schritte teils `test.fixme`). Verifikations-Token und Codes kommen per `psql` (`shop_owners.email_verification_token`; Code-Hash `sha256("claim:{id}:{purpose}:{code}")`), nie per Mail-Warten. Hochgeladene Nachweisdokumente landen im Upload-Pfad der Testinstanz (`SHOP_CLAIM_UPLOAD_PATH`, `/tmp/pundo-claim-docs-test`).

### Bot-User-Agents und Activity-Events (F6998)

Das Backend loggt keine Activity-Events fuer Bot-UAs, und der Playwright-Default-UA `HeadlessChrome` gilt als Bot. Tests, die ein Event erwarten (`price_comparison_viewed`, `shop_discovered`, `search_performed`), muessen einen Browser-UA setzen (`browser.newContext({ userAgent })`, Konstante `BROWSER_UA` in `e2e/journeys/activity-feed-bot-filter.spec.ts`). Bisher prueft kein anderer Spec Events.

---

## Env-Variablen

| Variable | Default | Scope |
|----------|---------|-------|
| `BACKEND_URL` | `http://localhost:8500` | `e2e/env.ts` (global-setup, Configs, Specs) |
| `FRONTEND_URL` | `http://localhost:3500` | playwright.config + global-setup Browser |
| `E2E_FRONTEND_PORT` | `3500` | Port des Frontends (webServer / Freshness-Check) |
| `E2E_FRONTEND_MODE` | — | `dev` → webServer startet `npm run dev:test` statt Standalone-Build (im Gate nicht erlaubt) |
| `E2E_REQUIRE_STANDALONE` | — | `1` (vom Gate gesetzt) → `next dev` auf dem Port bzw. `E2E_FRONTEND_MODE=dev` bricht ab |
| `E2E_RUN_ID` | automatisch | Run-ID (UTC-Zeitstempel), vom Global Setup gesetzt |
| `E2E_STALE_HOURS` | `6` | Ab wann Reste abgebrochener Läufe automatisch gelöscht werden |
| `E2E_ALLOW_UNKNOWN_FRONTEND` | — | `1` → unbekannten Prozess auf 3500 tolerieren |
| `E2E_SKIP_FRONTEND_RESTART` | — | obsolet (No-op, das Setup startet kein Frontend mehr) |
| `BACKEND_REPO` | `/Users/bb_studio_2025/dev/github/pundo_main_backend` | global-setup (Python-Script-Pfad) |
| `E2E_ADMIN_SECRET` | `pundo-admin-dev-secret` | global-setup (Admin-Approve-Bearer) |
| `E2E_RESET_DB` | — | Expliziter DB-Reset (nur wenn nötig) |
| `E2E_MAX_FAILURES` | `15` | Abbruch des Laufs nach N Fehlern (`maxFailures`) |
| `E2E_COVERAGE` | — | `1` → Coverage-Modus (eigener Build `.next-cov`, Messung Browser + Server), siehe Abschnitt Coverage |
| `E2E_COVERAGE_DIR` | `coverage-e2e` | Ausgabe- und Rohdatenordner des Coverage-Modus |
| `E2E_COVERAGE_VITEST` | `run` | `run` / `reuse` / `skip` für die Vitest-Coverage im Bericht |
| `E2E_COVERAGE_KEEP_RAW` | `1` | `0` → Rohdaten nach dem Bericht löschen |

### Isolierte Worktree-Slots (F8970)

Ein Controller-Slot ist ein bewusst gepaartes Backend-/Frontend-Artefakt. Der
Aufruf `scripts/worktree-env new --backend <backend-worktree> --frontend
<frontend-worktree>` prüft beide registrierten Git-Worktrees und speichert
deren Heads im Slot-Manifest. Verwende deshalb Backend- und Frontend-Stand,
die zusammen entwickelt wurden. Der Controller führt den Frontend-Fast-Lauf
mit dem gepaarten Backend-Checkout aus; ein neuer Backend-API-Vertrag ohne
aktualisierten Frontend-API-Typ-Snapshot ist absichtlich rot statt eine
stillschweigend tolerierte Inkompatibilität.

Nach `source ~/.pundo/worktree-env/slots/slot-N/frontend.env` nutzt der
Standalone-Build ausschließlich `.next-worktree-sN`. Build-Stamp und
`globalSetup` verwenden dieselbe effektive Test-Backend-URL
(`TEST_BACKEND_URL` vor `BACKEND_URL`), damit ein Slot weder Slot 0 noch einen
anderen Slot als frischen Build ausgeben kann.

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

## Zentrale Fixtures und Helfer (F8950 T30)

| Datei | Inhalt |
|---|---|
| `e2e/env.ts` | **einzige Quelle** für `BASE_URL` (Frontend, immer `127.0.0.1:3500`, Cookie-Domain des storageState) und `BACKEND_URL` (`localhost:8500`). Lehnt 3000/8000 ab. Specs importieren sie (`import { BASE_URL, BACKEND_URL } from '../env'`, bei Bedarf `BASE_URL as FRONTEND_URL`); neue URL-Literale mit `localhost:3500`/`127.0.0.1:8500` gibt es nicht mehr. Cookies setzen mit `domain: new URL(BASE_URL).hostname`. |
| `e2e/fixtures.ts` | `test`/`expect` mit Fixtures `adminPage` (Page mit Admin-storageState `e2e/.auth/admin.json`, kein UI-Login), `adminApi`, `ownerApi`; dazu `createStepLog()`, `ADMIN_STATE`, Re-Exports. `journeys/_helpers/worker-shop.ts` baut darauf auf (`workerShop` + `adminPage` zusammen nutzbar). |
| `e2e/journeys/_helpers.ts` | `adminLogin()` (nutzt den Admin-Token des Setups), `adminHeaders(token?)`, `apiFetch(method, path, body?, headers?)`, `shopOwnerLogin`, `shopOwnerOnboardWithRetry`. Keine lokalen Kopien in Specs (`grep -rE "(function|const) (logStep|apiFetch|adminLogin|adminHeaders)\b" e2e` trifft nur diese Dateien). |
| `journeys/_helpers/test-data.ts` | Marker, `adminApi`/`ownerApi`, `TestDataTracker`, `psql`, `populatedCategoryId()` (echte Kategorie mit Nachbarn für „verwandte Produkte“). |
| `journeys/_helpers/offers-api.ts` | Owner-API- und UI-Helfer der Shop-Admin-Offers-Specs. |
| `journeys/_helpers/png.ts` | gültige PNGs für Foto-Uploads (`workerShop.uploadPhoto(itemId)`). |

Schrittprotokoll für Journey-Reports: `const { logStep } = createStepLog(ctx.stepLog)` (Signatur `logStep(step, desc, expected, actual, 'PASS'|'FAIL'|'SKIP')`, Kurzform `logStep(step, desc, ok)`).

Admin-Seiten testen: `test('…', async ({ adminPage: page }) => { … })` statt Formular-Login oder Cookie-Injektion. Der Formular-Login bleibt nur dort, wo er Prüfgegenstand ist (`admin.spec` E2E-11, `shop-owner-admin-approval-flow` AC-1).

### Keine festen Prod-Kopie-Slugs (T31)

Kernprüfungen hängen nicht an festen Slugs/IDs der Prod-Kopie. Die Spec seedet per API: `specShop('NAME')` oder `workerShop.createItem(spec, label, { listing: true, categoryId })`, Angebot per `shop.api('POST', '/offers', …)`, Foto per `shop.uploadPhoto(item.id)`; Aufräumen per `shop.destroy()` / `cleanupSpecData()`. Realdaten-Checks (Ebene 2 des Zwei-Ebenen-Prinzips) sind eigene Tests mit `test.skip(!vorhanden, '<konkreter Grund>')`. Beispiele: `main.spec` (`seedProduct`), `customer-shop-all-products-flow` (zwei Spec-Shops, Ebene 2 = reale Shops), `b5910-007` P5a/P5b.

### Dateigröße (T32)

Specs bleiben unter ca. 600 Zeilen, damit die 4 Worker sie parallel abarbeiten. Geteilt: `shop-admin-offers*` (4 Dateien), `service-catalog-*` (2), `shop-owner-quick-onboarding*` (2), `social-link-moderation*` (2). Begründete Ausnahmen: `shop-owner-full-lifecycle` (eine nummerierte Geschichte, die Reihenfolge der Schritte ist Prüfgegenstand) und `shop-detail-attribute-matrix` (serielle Tabula-rasa-/Roundtrip-Tests auf einem gemeinsamen Spec-Shop; ein Split würde den Shop-Aufbau verdoppeln).

## Kein `networkidle`, kein `waitForTimeout` (F8950 T22)

`waitForLoadState('networkidle')` und feste Timeouts sind in der gesamten Suite durch Bedingungen ersetzt (Stufe 4: 0 Aufrufe im Code) (Web-first-Assertions, `waitForResponse`/`waitForRequest` auf den konkreten Call, `expect.poll`, `toPass`). Helfer in `e2e/journeys/_helpers/hydration.ts`:

- `waitForPageHydrated(page)` — Seite geladen und React hat hydriert. Für „keine JS-Fehler“-Tests und synchrone DOM-Reads. Nach dem Hydrieren per fetch nachgeladene Inhalte (Suchergebnisse, Listen) zusätzlich über einen Locator abwarten.
- `waitForHydrated(locator)` / `clickHydrated(locator)` — einzelne Elemente.

Fallen, die dabei auftauchten: (1) Während des Streamings liegt kurz eine **versteckte Kopie** (`<div hidden id="S:0">`) im DOM, deshalb `getByRole(...)` oder `:visible` statt blanker Selektoren. (2) Such- und Shop-Seiten rendern Desktop- **und** Mobile-Liste; der erste Treffer kann `display:none` sein (`:visible`). (3) Karten- und Shop-Links tragen den Sprachpräfix (`/en/shops/<slug>`), `a[href^="/shops/"]` trifft nie. (4) Sprache per URL-Präfix wählen (`/ar/…`); Cookie-Wechsel plus `reload` ändert den Präfix nicht.

## Wirkung statt Durchlauf: Verträge und Helfer (Bug „Fehlende Verträge zwischen Sender und Empfänger“, Stand 2026-10-21)

Regeln R1–R9: Vault `Pundo-Plattform/00 Überblick/Conventions.md`, Abschnitt „Verträge und Wirkungsnachweis“. Backend-Seite (Golden-Fixtures,
Meta-Tests, Checkliste): `pundo_main_backend/docs/testing.md`, gleichnamiger Abschnitt. Hier die Frontend-Werkzeuge:

| Werkzeug | Ort | Zweck |
|---|---|---|
| Mail-Sink-Helfer | `e2e/journeys/_helpers/mail-sink.ts` | liest die `.eml`-Dateien, die die Testinstanz über den lokalen SMTP-Sink (Port 1025, gestartet von `start_test_server.sh`) empfangen hat: `waitForMail(adresse)`, Teile, Links, Bild-URLs. Fehlt der Sink, schlägt der Test fehl statt zu überspringen. Journeys: `crm-opt-out`, `shop-owner-onboarding`, `shop-owner-admin-approval-flow`, `shop-owner-self-deactivate` |
| Golden-Worker für LLM-Ketten | `e2e/journeys/_helpers/gateway-worker.ts` | beantwortet **genau den eigenen** Gateway-Task (Filter `payload_contains`) mit der Golden-Fixture des Workers (`pundo_llm_workers/tests/contracts/golden/`), das Gateway sendet den signierten Webhook. Braucht den Gateway-Testserver auf 8600; fehlt er, wird sichtbar übersprungen. Journeys: `llm-effects-homesick-spotted`, `admin-catalog-review` |
| Aufgezeichnete Mock-Antworten | `e2e/journeys/_helpers/contracts.ts`, `e2e/fixtures/contracts/*.json` | Mocks (`page.route`) lesen `{status, body}`-Dateien statt Handtexte. Ein „Real backend“-Test derselben Journey vergleicht die echte Antwort mit der Datei und wird rot, wenn das Backend die Form ändert. Neu aufzeichnen: `E2E_RECORD_CONTRACTS=1 npx playwright test <spec>`, Dateien committen. Wächter: `src/tests/e2e-contract-fixtures.test.ts` |
| Typ-Verträge zum Backend | `src/types/contracts.ts`, `src/types/generated/{openapi.json,backend.ts}` | `node scripts/api-types.cjs sync` kopiert den **committeten** Stand von `pundo_main_backend/docs/openapi.json` (`git show HEAD:…`) und erzeugt die Typen; `check` läuft im Gate. `PUNDO_BACKEND_WORKTREE=1` erzwingt die Arbeitsdatei. `contracts.ts` prüft per `tsc`, dass die Backend-Antwort zum Frontend-Typ passt; bewusste Abweichungen stehen mit Grund als `@ts-expect-error` |
| Selektor-Regel | `eslint-rules/no-positional-tag-locator.js` | verbietet `.first()/.last()/.nth()` auf Tag-Locatoren (`form`, `button` …) in Journeys; `data-testid`/`getByRole` nutzen |
| Proxy-Vertragstabelle | `src/tests/proxy-catchall-contract.test.ts` | Cookie→Bearer, Header-Allowlist, Fehlerformen der Catch-all-Routen |
| Betriebswege | `src/tests/ops-routes-contract.test.ts` | Sitemap-Revalidierung (`x-revalidate-secret`) und Nominatim-Proxy |

### F3900: Progression-Aufnahmen und Journeys

Die Fixtures `progression-*.json` werden ausschließlich von der abgestimmten Backend-Probe auf **8500** übernommen: zuerst Status, Header (insbesondere `Retry-After`) und Body unter dem Spec-Ordner `fixtures-8500/<flag-aus|flag-an>/` aufnehmen, dann unverändert nach `e2e/fixtures/contracts/` kopieren. Handgeschriebene Bodies in `route.fulfill` sind verboten. `src/tests/e2e-contract-fixtures.test.ts` und `src/tests/progression-api.test.ts` prüfen Form und fail-closed Decoder; der nachfolgende Journey `e2e/journeys/homesick-wallet.spec.ts` verwendet dieselben Dateien für Gratis-, Paid-, Guthaben- und Limit-Zustände. Fehlt die vom Backend markierte `READY.md`, bleiben diese aufnahmebasierten Journeys bewusst ausstehend; es wird keine Ersatzfixture erfunden.

Regeln, die sich aus den Funden ergeben haben:

1. **`page.route()` sieht nur Browser-Anfragen.** Server-Komponenten holen ihre Daten serverseitig (z. B. `/related` der Produktseite); ein Mock im
   Browser kann diese Anfrage nie abfangen, der Test wäre grün, ohne etwas zu prüfen. Server-Fälle testet ein Vitest, der die Seiten-Funktion
   direkt aufruft (`src/tests/product-page-related-fallback.test.tsx`).
2. **Ein Mock ist erst gültig, wenn ein Real-Test denselben Body bestätigt** (Fund: Mock mit `category: shortener_unresolvable`, das Backend sendet
   `error: shortener_unresolvable`).
3. **Übersprungene Tests sind Lücken.** Der Rate-Limit-Test des Kontaktformulars lief monatelang nie, weil er bei konfiguriertem SMTP abbrach;
   `test.skip` mit Bedingung nur mit sichtbarem Grund und nur, wenn die Bedingung wirklich ein Sonderfall ist.
4. **Gate-Zeitüberschreitungen unter Last.** Läuft der Mac heiß (Time Machine, Spotlight, hängender `fseventsd`/`SystemUIServer`, IDE-Indexierung),
   scheitern im vollen Lauf wahllos 1 bis 4 Tests mit `page.goto … 30000ms`; einzeln laufen sie durch. Vor einem Push `uptime` prüfen (Last unter etwa 4),
   die Ursache beheben und regulär neu pushen, nicht `--no-verify`.
