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
  - Wenn Testdaten fehlen aus pundo-datenbank in die pundo_test kopieren
- Backend-Repo startet Test-Server mit `./scripts/start_test_server.sh` (Port 8500, DB: pundo_test)

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

---
