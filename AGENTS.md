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
- `npm run dev` startet Frontend auf **3000** → zeigt auf Backend **8000**
- `npm run dev:test` startet Frontend auf **3500** → zeigt auf Backend **8500**
- Playwright E2E-Tests laufen immer gegen **3500 / 8500** (Safety-Check in `playwright.config.ts` verwirft Port 8000)
- Port 8000 und 3000 sind PRODUKTIV — niemals für Tests verwenden
- Port 8500 und 3500 sind TEST — niemals für Produktion verwenden
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
