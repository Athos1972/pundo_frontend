## Autonomous Spec Workflow — ENABLED

Dieses Repo nutzt den automatischen Chain: **designer → architect → coder → e2e-tester**.

Jeder Schritt schreibt in `specs/<feature-slug>/`:

| Schritt | Datei | Leser | Schreiber |
|---|---|---|---|
| 1 | `01-design.md` | architect | designer |
| 2 | `02-architecture.md` | coder | architect |
| 3 | `03-implementation.md` | e2e-tester | coder |
| 4 | `04-test-report.md` | Mensch | e2e-tester |

`<feature-slug>` = `YYYY-MM-DD-kebab-name`, z.B. `2026-04-22-invoice-pdf-export`.

Die Subagent-Definitionen liegen user-level in `~/.claude/agents/`. Repo-Overrides nur wenn nötig in `.claude/agents/`.

---

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
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

<!-- BEGIN:backend-repo -->
# Backend-Repository

Das Backend liegt in `/Users/bb_studio_2025/dev/github/pundo_main_backend`.
Backend-Skills: `/Users/bb_studio_2025/dev/github/pundo_main_backend/.claude/skills/`

Falls eine Anforderung Backend-Änderungen erfordert: explizit benennen und ggf. in das Backend-Repo wechseln.
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

**Vollständige Bypass-Liste:** `/_next /api /admin /shop-admin /auth /account /favicon /og /brands /brand_logos` + Dateien mit Extension.

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
- UI-Strings: `src/lib/translations.ts` (kein i18n-Framework, statisch in TypeScript)
- Jede neue UI-Komponente mit sichtbarem Text **muss** alle 6 Sprachen in `translations.ts` bedienen
- RTL-Layout: Tailwind `rtl:`-Modifier verwenden, niemals RTL raten
- API-Calls senden automatisch `Accept-Language`-Header (siehe `src/lib/api.ts`)
- Cookie `app_lang` speichert die Sprachauswahl (1 Jahr)
<!-- END:languages -->



## Projektkontext (pundo_frontend)

- **Zweck:** Price- und Produktlocator-App — findet Produkte und Dienstleistungen in der Nähe
- **Stack:** Next.js 16.2.2, React 19, TypeScript, Tailwind CSS 4
- Backend-Skills: `/Users/bb_studio_2025/dev/github/pundo_main_backend/.claude/skills/`
- **Config:** `.env.local` für BACKEND_URL, ALLOWED_DEV_ORIGINS
- **Repository-Struktur:**
  - `src/app/` — Next.js App Router: Seiten, Layouts, Loading, Error
  - `src/components/` — Wiederverwendbare React-Komponenten (map/, product/, search/, shop/, ui/)
  - `src/lib/` — API-Client (`api.ts`), Sprachlogik (`lang.ts`, `translations.ts`), Utilities
  - `src/types/` — TypeScript-Typen (`api.ts`)
- **Tests:** Vitest für Unit-Tests, Playwright für E2E empfohlen
- **Shop-Admin Clean Boundary (Architektur-Prinzip):**
  `src/app/shop-admin/`, `src/components/shop-admin/` und `src/lib/shop-admin-api.ts` dürfen **keine Imports** aus customer-facing Code haben (außer generischen UI-Primitives aus `src/components/ui/`). Shop-Admin-Types gehören in `src/types/shop-admin.ts`, nicht in `src/types/api.ts`. Admin-Translations in eigenem Namespace-Objekt. Dieses Prinzip sichert, dass die spätere Auslagerung in ein separates Repo in 2–3 Tagen machbar bleibt statt 2–3 Wochen zu kosten.
- **SEO-Guardrails (F6400):**
  Neue Customer-Pages brauchen `generateMetadata` oder `export const metadata` (ESLint-Warn). Checkliste: `docs/seo.md`. Breadcrumb-Komponente: `src/components/ui/Breadcrumb.tsx`. Metadata-Helpers: `src/lib/seo/metadata-defaults.ts`. Audit: `pnpm seo:audit`.

---
