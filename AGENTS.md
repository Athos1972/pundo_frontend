## Autonomous Spec Workflow — ENABLED

Dieses Repo nutzt den automatischen Chain: **designer → architect → coder → e2e-tester**.

Jeder Schritt schreibt in den Pundo-Plattform-Vault (nicht ins Repo — Repo-Ordner `specs/` werden nicht mehr verwendet):

- **Features:** `Pundo-Plattform/20 Features/<FG>/<Feature>/specs/<feature-slug>/`
- **Bugs:** Bug-Datei zentral in `Pundo-Plattform/00 Überblick/__ Bugs & Hotfixes/B<id> <Titel>.md`, Specs daneben in `__ Bugs & Hotfixes/B<id> <Titel>/specs/<feature-slug>/` (Bugs überspringen den Designer)

| Schritt | Datei | Leser | Schreiber |
|---|---|---|---|
| 1 | `01-design.md` | architect | designer |
| 2 | `02-architecture.md` | coder | architect |
| 3 | `03-implementation.md` | e2e-tester | coder |
| 4 | `04-test-report.md` | Mensch | e2e-tester |

`<feature-slug>` = `YYYY-MM-DD-kebab-name`, z.B. `2026-04-22-invoice-pdf-export`.

**Commit & Push:** Subagents/Skills der Kette committen und pushen nicht — Bernhard gibt frei. Ein Push auf `main` deployt per Webhook direkt nach Prod (gewollt).

Kanonische Regeln (Cross-Repo-Marker, Rückfragen, Verdicts, Datenbanken): Vault `Pundo-Plattform/00 Überblick/Conventions.md`, Abschnitt „Spec-Workflow“.

Die Subagent-Definitionen liegen user-level in `~/.claude/agents/`. Repo-Overrides nur wenn nötig in `.claude/agents/`.

Repo-Wissen für die Rollen: `.claude/playbooks/<rolle>.md` (wird von den Agents gelesen).

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:port-convention -->
# Port-Konvention — PFLICHT, niemals abweichen

| Instanz           | Frontend-Port | Backend-Port | Datenbank        |
|-------------------|--------------|-------------|-----------------|
| **Produktion**    | **3000**     | **8000**    | postgres `pundo` |
| **Test / E2E**    | **3500**     | **8500**    | postgres `pundo_test` |
| **Worktree-Slot N** (1–5, F8970) | **3510+N** (3511–3515) | **8510+N** (8511–8515), Gateway 8611–8615, Mail-Sink 1026–1030 | postgres `pundo_wt_sN` |

**Regeln:**

- `npm run dev:test` startet Frontend auf **3500** → zeigt auf Backend **8500**
- Playwright E2E-Tests laufen immer gegen **3500 / 8500** (Safety-Check in `playwright.config.ts` verwirft Port 8000)
- Port 8000 und 3000 sind weitgehend Echtdaten — nicht für Tests verwenden, außer explizit angefordert
- Port 8500 und 3500 sind TEST — niemals für Produktion verwenden.
- Backend-Repo startet Test-Server mit `./scripts/start_test_server.sh` (Port 8500, DB: pundo_test)

**Testdaten & DB-Reset-Regel (PFLICHT):**
- `pundo_test` enthält Echtdaten aus Prod (via `sync_prod_to_test.sh`) — diese **niemals automatisch löschen**
- E2E-Tests und pytest-Fixtures resetten die DB **NICHT** — sie nutzen die bestehenden Daten
- Wenn Testdaten fehlen: `cd /Users/bb_studio_2025/dev/github/pundo_main_backend && source .venv/bin/activate && ./scripts/sync_prod_to_test.sh` ausführen
- Expliziter Reset nur mit `E2E_RESET_DB=true` (z.B. für CI oder Migrations-Tests):
  - Frontend: `E2E_RESET_DB=true npx playwright test`
  - Backend: `E2E_RESET_DB=true pytest`

> **Studio-Hinweis (F6995, ab 2026-05-01):** Am Studio-MacBook gilt nur die Test-Zeile. Die Prod-Zeile (3000/8000/`pundo`) ist eine Plattform-Referenz für die Hetzner-Maschine — am Studio existiert weder DB `pundo` noch ein Backend auf `:8000`. `npm run dev` wurde entfernt; nur `npm run dev:test` ist gültig.

**Restart-Regeln:**

- Test-Instanzen (Port **3500** / **8500**) dürfen automatisch neu gestartet werden — kein Zögern
- Produktiv-Instanzen (Port **3000** / **8000**) **NIEMALS** automatisch neu starten — nur manuell durch den User oder auf ausdrückliche Aufforderung

**Test-Instanz 3500/8500 und Test-Worker (F8970 Worktree-Umgebungen):**
- `next dev` auf 3500 und das Test-Backend auf 8500 nur aus dem **Main-Baum** starten, nie aus einem Feature-Worktree. Sonst laufen Frontend und Backend aus verschiedenen Checkouts, und ein gelöschter Worktree lässt einen Prozess ohne Quellcode zurück (2026-10-25: 8500 lief aus dem gelöschten Beweisarchiv-Worktree, 3500 aus dem Videos-Worktree).
- Videoaufnahmen (Admin-Schulungsvideos) laufen in einem eigenen Slot (`worktree-env new … --owner "Videos"`) oder in einem abgesprochenen Zeitfenster; das Arbeitsbaum-Gate beendet einen `next dev` auf 3500 absichtlich.
- Test-Worker (`restart_test_worker.sh`) pollen das gemeinsame Test-Gateway 8600. Das Arbeitsbaum-Gate pausiert sie vor Playwright selbst und startet sie danach wieder. Wer Journeys von Hand startet, stoppt sie vorher oder arbeitet in einem Slot (eigenes Gateway, kein Worker).

**Hauptumgebung vs. Worktree-Slots (F8970 Worktree-Umgebungen):** Die Hauptumgebung bleibt 3500/8500 (Gateway 8600) mit `pundo_test`. Worktree-Slots haben eigene Ports und eine eigene Datenbank `pundo_wt_sN` (nie `pundo_test`, nie `pundo`). 3000/8000/8100 bleiben tabu. Ein Slot wird **ausschließlich** mit `scripts/worktree-env` (Backend-Repo) angelegt und entfernt; fremde Prozesse auf Slot-Ports beendet der Controller nicht.

**Datenbanken und Migrationen (PFLICHT):**
- Migrationen **nie** aus Entwürfen oder unveröffentlichten Branches auf die gemeinsame `pundo_test` anwenden (Wettlauf 2026-10-22/23 mit `f3900ops02` und `f7600s3p01`). Dafür einen Worktree-Slot nutzen.
- `pundo_test` nur manuell über `sync_prod_to_test.sh` auffrischen; keine Fremdschlüssel-Waisen hinterlassen (Prodcopy-Slots tolerieren sie, `pundo_test` soll sauber sein).
- Push mit neuer Migration: Restore-Point-Bestätigung von prod nötig, technisch erzwungen durch den Gate-Schritt `restore-point-ack`.
- Läufe gegen `pundo_test` (volle pytest-Suite, Playwright, Skripte mit Schreibwirkung) gehen nur über die Gate-Sperre (`scripts/test-gate.sh …`) oder in einem Worktree-Slot. Gates aus Feature-Worktrees (auch von Codex) laufen über `scripts/worktree-env gate`, nicht gegen die gemeinsame Schema-Vorlage `pundo_test_schema`: Zwei Worktrees mit verschiedenen Migrationsständen setzen sie sonst gegenseitig außer Gefecht (Vorfälle 2026-10-24 und 2026-10-26). Ein freihändiges `pytest ingestor` gegen `pundo_test` blockiert fremde Push-Gates.
- Entwurfs-Migrationen werden auf `pundo_test` auch nicht gestempelt oder von Hand zurückgesetzt (Vorfälle 2026-10-24: zwei Migrations-Köpfe Foto-Moderation und CRM; 2026-10-25: sieben `privacy_*`-Tabellen und `alembic_version`).
- Manuelle Gate-Umgebungen nur per `source ~/.pundo/worktree-env/slots/slot-N/frontend.env` bzw. `backend.env` herstellen (setzt Ports, Datenbank und `MAIL_SINK_DIR` konsistent). Selbstgebaute Variablen führten am 2026-10-25 zu „keine Mail im Mail-Sink“ und zu einer `.env`, die auf `pundo_test` zeigte.

**Worktrees (F8970):**
- Verpflichtend bei größeren Änderungen (Migration, Vertrags-Snapshot oder mehr als zwölf Dateien; Entwurf `scripts/push_mode.py`, an den Hooks noch nicht aktiv) und bei jeder Migration. Bugfixes weiter direkt im Main-Arbeitsbaum.
- Push-Gate einer größeren Änderung läuft aus einem frischen Worktree: `.venv`/`.env` verlinken, Frontend mit echtem `npm ci`, `MAIL_SINK_DIR` auf den laufenden Sink; Backend-Gate mit `PUNDO_FRONTEND_REPO`, Frontend-Gate mit `BACKEND_REPO`/`PUNDO_BACKEND_DIR` auf die zusammengehörigen Worktrees. Parken fremder Dateien per `git stash` entfällt dadurch.
- Selbstbedienung (aus dem Backend-Worktree):
  ```bash
  scripts/worktree-env new --slot 2 --backend "$PWD" --frontend <frontend-worktree> --data-mode prodcopy --restore-prodcopy
  scripts/worktree-env start --slot 2 backend
  # Frontend: source ~/.pundo/worktree-env/slots/slot-2/frontend.env && npx playwright test --project=smoke
  scripts/worktree-env gate --slot 2 full
  scripts/worktree-env stop --slot 2 all && scripts/worktree-env destroy --slot 2
  scripts/worktree-env doctor --all --repair   # bei Resten
  ```
- Gemeinsamer Main-Baum: nur explizite Pfade committen (`git commit -- <pfade>`), Commit und Push nie in einem Befehl verketten, den Push-Check (`git fetch`, `origin/main..main`) unmittelbar vor `git push` ausführen. Am 2026-10-24 gingen so drei fremde Commits mit einem Datenschutz-Push raus.
- Das Gate im Arbeitsbaum-Modus testet auch die uncommitteten Dateien anderer Sessions mit (2026-10-25: fremde Worker-Dateien machten einen Fast-Gate rot). Größere Pushes laufen deshalb aus dem sauberen Worktree-Paar.
- Slots: Entwicklungs-Sessions belegen von Slot 1 aufwärts und tragen sich mit `new --owner "<Session/Auftrag>"` ein; `verify-push`/`verify-pair` nehmen von Slot 5 abwärts, reservieren atomar und warten bei Vollbelegung bis zu 300 s. `list` zeigt Besitzer, Branches, Leerlauf und `lease_expired` (nur Hinweis; der Controller räumt nie von selbst auf). `doctor --all --repair` entfernt auch Reste abgebrochener Verify-Läufe.
- Offene Punkte: Der Pre-Push-Hook des Frontends wird noch auf die automatische Moduswahl umgestellt (der Backend-Hook nutzt `verify-push` bereits); Test `test_generate_category_synonyms` ist im vollen Prodcopy-Lauf reihenfolgeabhängig (einzeln grün).
<!-- END:port-convention -->

<!-- BEGIN:test-gates -->
# Test-Gates und Pre-Push-Hook (F8950 T34) — PFLICHT vor jedem Push auf main

Ein Push auf `main` deployt direkt nach Prod. Deshalb gibt es je Repo ein versioniertes Pre-Push-Gate (`.githooks/pre-push` → `scripts/test-gate.sh push`); aktivieren: `scripts/install-hooks.sh` (= `git config core.hooksPath .githooks`).

| Repo | Alltag | Push-Gate (automatisch bei `git push` auf main) |
|---|---|---|
| `pundo_main_backend` | `scripts/test-gate.sh fast` (14 s) / `full` (28 s) / `lint` (ruff + Semgrep) | ruff, **Semgrep wie in der CI**, pytest full, Playwright-Smoke im Frontend-Repo (ca. 80 s) |
| `pundo_frontend` | `scripts/test-gate.sh fast` (tsc, eslint, `lint:i18n`, Vitest; 47 s) | fast + Playwright voll + `npm audit` + gitleaks (falls installiert) (ca. 160 s) |

- **`git push --no-verify` nur mit Bernhards ausdrücklicher Freigabe** und mit Grund in der Handoff-Notiz.
- Das Gate bricht fail-closed ab (PostgreSQL nicht erreichbar, anderer Gate-/Testlauf aktiv, Timeout), statt zu hängen. Es nimmt einen gemeinsamen Lock für beide Repos und die Nightly; volle pytest- und Playwright-Läufe laufen **nie gleichzeitig** (beide teilen `pundo_test`).
- Der Nachweis des letzten Laufs steht in `.claude/playbooks/state/test-gate.last_run` (lokal, nicht committen). Die Nightly (`pundo_main_backend/scripts/nightly.sh`, launchd) prüft beide Repos nachts inkl. Prod-Kopie-Modus und `--repeat-each=2`; Ergebnis: `~/Library/Logs/pundo-nightly/latest/summary.txt`.
- Details: Backend `docs/testing.md` („Gates und Hooks“), Frontend `docs/e2e-testing.md`.
<!-- END:test-gates -->

<!-- BEGIN:backend-repo -->
# Repositories — Übersicht

| Repo | Pfad | Port Test / Prod | Zweck |
|---|---|---|---|
| `pundo_main_backend` | `/Users/bb_studio_2025/dev/github/pundo_main_backend` | 8500 / 8000 | REST-API, DB, Ingestor |
| `pundo_llm_gateway` | `/Users/bb_studio_2025/dev/github/pundo_llm_gateway` | 8600 / 8100 | LLM-Task-Dispatcher (Queue-Manager, kein SDK) |
| `pundo_llm_workers` | `/Users/bb_studio_2025/dev/github/pundo_llm_workers` | — (pollt Gateway) | LLM-Worker-Prozesse (Provider-Calls nur hier) |
| `pundo_mcp_server` | `/Users/bb_studio_2025/dev/github/pundo_mcp_server` | — | MCP-Server für Claude-Integration |

**Backend** (`pundo_main_backend`):
- Backend-Playbooks: `/Users/bb_studio_2025/dev/github/pundo_main_backend/.claude/playbooks/`
- Falls Backend-Änderungen nötig: explizit benennen und in das Repo wechseln.

**LLM-Gateway** (`pundo_llm_gateway`):
- Reiner Queue-Manager — spricht selbst **niemals** mit einem LLM-Provider.
- `routing.yml` ist autoritativ für Job-Typ → Modell/Lease/Retries-Mapping.
- Neuer Job-Typ = Eintrag in `routing.yml` + (falls nötig) Priorität in `gateway/queue/job_priority.py`.
- Test-Server: `./scripts/start_test_server.sh` (Port **8600**, DB `pundo_llm_gateway_test`). **Niemals** Port 8100 für Tests verwenden.

**LLM-Worker** (`pundo_llm_workers`):
- Provider-Calls leben **nur** hier: aktiv sind `ollama` (lokal am Mac Studio) und `openrouter` (über das `openai`-SDK); die `anthropic`-/`openai`-Adapter sind noch im Code, aber nicht konfiguriert.
- Neuer Job-Typ = Jinja2-Template `prompts/<job_type>.j2` + Eintrag in `security.yml::untrusted_fields`.
- Worker-Restart (Test): `./restart_test_worker.sh`. Prod: `./restart_prod_worker.sh` — **nur manuell**.
<!-- END:backend-repo -->

<!-- BEGIN:i18n-routing -->
# i18n Routing — PFLICHT bei jedem Link und router.push()

**Customer-Pages** liegen unter `src/app/(customer)/[lang]/` und brauchen immer einen `/{lang}/`-Präfix.
**Bypass-Pfade** (`/account`, `/auth`, `/api`, `/shop-admin`, `/admin` u.a.) haben **keinen** lang-Präfix.

**Goldene Regel:** Alle `<Link href>` und `router.push()` zu Customer-Pages müssen `localePath(lang as Lang, '/pfad')` verwenden:

```typescript
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'

// Customer-Page — PFLICHT mit localePath:
router.push(localePath(lang as Lang, `/products/${slug}`))
<Link href={localePath(lang as Lang, `/shops/${slug}`)}>

// Bypass-Pfad — direkt, KEIN localePath:
<Link href="/account/mcp">
<Link href="/auth/login">
```

**Konsequenz bei Fehler:** Next.js prefetcht alle sichtbaren Links als RSC-Payload (`?_rsc=`). Fehlender `/{lang}/`-Präfix → HTTP 404 → Konsolen-Fehler im Smoketest.

**Vollständige Bypass-Liste:** maßgeblich ist `I18N_BYPASS_PREFIXES` in `src/proxy.ts` (derzeit u. a. `/_next /api /admin /shop-admin /auth /account /oauth /crm /favicon /og /brands /brand_logos /product_images /review_photos /shop_logos /avatars /manifest.webmanifest /robots.txt /sitemap.xml /llms.txt`) + Dateien mit Extension (außer mit gültigem Sprach-Prefix).

**Detaildoku:** `/Users/bb_studio_2025/Vaults/obsidian/Documents/Pundo-Plattform/10 Wissen/i18n-routing-model.md`
<!-- END:i18n-routing -->

<!-- BEGIN:languages -->
# Sprachen & i18n — PFLICHT

| Code | Sprache    | RTL |
|------|-----------|-----|
| `en` | English   | Nein |
| `de` | Deutsch   | Nein |
| `el` | Ελληνικά  | Nein |
| `ru` | Русский   | Nein |
| `ar` | العربية   | **Ja** |
| `he` | עברית     | **Ja** |

**Regeln:**
- Sprachkonstanten: Frontend `src/lib/lang.ts`, Backend `core/languages.py`
- UI-Strings: Namespace-Dateien `src/lib/i18n/*.ts` (`src/lib/translations.ts` ist nur Barrel; kein i18n-Framework, statisch in TypeScript)
- Jede neue UI-Komponente mit sichtbarem Text **muss** alle 6 Sprachen bedienen (Customer + Shop-Admin) — Paritätsprüfung: `npm run lint:i18n`. **Ausnahme System-Admin (`/admin`): nur `en` + `el`** (`src/lib/system-admin-translations.ts`). Maßgeblich: Vault `Pundo-Plattform/00 Überblick/Conventions.md`, Abschnitt „UI-Sprachen je Oberfläche“
- Kein hartkodierter UI-Text im JSX (Text-Children, `aria-label`, `alt`, `title`, `placeholder`) — ESLint-Rule `local-i18n/no-hardcoded-jsx-text` (warn) fängt das ab; `lint:i18n` sieht solche Literale nicht. Opt-out nur für Markennamen/dekorative Ausnahmen mit `// @i18n-allow-literal` (bzw. `{/* @i18n-allow-literal */}`) direkt darüber. Strings in Objekt-Arrays, die später gerendert werden, erkennt die Rule nicht — dort selbst aufpassen.
- RTL-Layout: Tailwind `rtl:`-Modifier verwenden, niemals RTL raten
- API-Calls senden automatisch `Accept-Language`-Header (siehe `src/lib/api.ts`)
- Cookie `app_lang` speichert die Sprachauswahl (1 Jahr)
<!-- END:languages -->



## Projektkontext (pundo_frontend)

- **Zweck:** Price- und Produktlocator-App — findet Produkte und Dienstleistungen in der Nähe
- **Stack:** Next.js 16 (genaue Version siehe `package.json`), React 19, TypeScript, Tailwind CSS 4
- Backend-Playbooks: `/Users/bb_studio_2025/dev/github/pundo_main_backend/.claude/playbooks/`
- **Config:** `.env.local` für BACKEND_URL, ALLOWED_DEV_ORIGINS
- **Repository-Struktur:**
  - `src/app/` — Next.js App Router: Seiten, Layouts, Loading, Error
  - `src/components/` — Wiederverwendbare React-Komponenten (map/, product/, search/, shop/, ui/)
  - `src/lib/` — API-Clients (`api.ts`, `customer-api.ts`, `shop-admin-api.ts`, …), Sprachlogik (`lang.ts`, `i18n/`), Utilities
  - `src/proxy.ts` — Next-Proxy (i18n-Redirects, Brand, Auth-Gate, CSP)
  - `src/types/` — TypeScript-Typen (`api.ts`, `shop-admin.ts`, …)
  - Details: `docs/architecture.md`
- **Tests:** Vitest für Unit-Tests (`npx vitest run`, `vitest.config.ts`), Playwright für E2E (`npx playwright test`, Journeys unter `e2e/journeys/`)
- **Shop-Admin Clean Boundary (Architektur-Prinzip):**
  `src/app/shop-admin/`, `src/components/shop-admin/` und `src/lib/shop-admin-api.ts` dürfen **keine Imports** aus customer-facing Code haben (außer generischen UI-Primitives aus `src/components/ui/`). Shop-Admin-Types gehören in `src/types/shop-admin.ts`, nicht in `src/types/api.ts`. Admin-Translations in eigenem Namespace-Objekt. Dieses Prinzip sichert, dass die spätere Auslagerung in ein separates Repo in 2–3 Tagen machbar bleibt statt 2–3 Wochen zu kosten.
- **SEO-Guardrails (F6400):**
  Neue Customer-Pages brauchen `generateMetadata` oder `export const metadata` (ESLint-Warn). Checkliste: `docs/seo.md`. Breadcrumb-Komponente: `src/components/ui/Breadcrumb.tsx`. Metadata-Helpers: `src/lib/seo/metadata-defaults.ts`. Audit: `npm run seo:audit`.
- **Inline-Styles (`style={{…}}`):** Nur verwenden wenn Tailwind nicht ausreicht (dynamische Werte, Leaflet-Maps). Kein allgemeines CSS-Escape-Hatch — ESLint-Rule `local-csp/no-inline-style` warnt automatisch. Opt-out: `// @csp-allow-inline-style` direkt über die `style={{`-Zeile (z.B. für Leaflet-`MapContainer`, berechnete Breiten, Blur-Platzhalter).

---
