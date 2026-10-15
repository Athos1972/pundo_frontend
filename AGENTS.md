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

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:port-convention -->
# Port-Konvention — PFLICHT, niemals abweichen

| Instanz           | Frontend-Port | Backend-Port | Datenbank        |
|-------------------|--------------|-------------|-----------------|
| **Produktion**    | **3000**     | **8000**    | postgres `pundo` |
| **Test / E2E**    | **3500**     | **8500**    | postgres `pundo_test` |

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
