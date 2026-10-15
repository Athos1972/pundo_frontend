/**
 * Einzige Quelle fuer Frontend- und Backend-URL der E2E-Suite (F8950 T30).
 *
 * Alle Specs, Helfer und Configs importieren `BASE_URL` / `BACKEND_URL` von hier (oder ueber `e2e/fixtures.ts`).
 * Frontend-Host ist ueberall `127.0.0.1` (passt zur Cookie-Domain des storageState und zu `setLangCookie` in
 * `language-smoke`), Backend `localhost:8500`. Keine reine Modul-Abhaengigkeit auf Playwright, damit auch
 * `playwright.config.ts`, Global Setup und Skripte den Wert nutzen koennen.
 *
 * Port-Konvention: Test 3500/8500, Produktion 3000/8000 wird hart abgelehnt.
 */

const frontendPort = process.env.E2E_FRONTEND_PORT ?? '3500'

/** Frontend (Next.js) der Testinstanz. */
export const BASE_URL: string =
  process.env.FRONTEND_URL ?? process.env.TEST_BASE_URL ?? `http://127.0.0.1:${frontendPort}`

/** Backend (FastAPI) der Testinstanz. */
export const BACKEND_URL: string =
  process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'

// Sicherheitsnetz: Produktiv-Ports niemals fuer E2E.
if (BACKEND_URL.includes(':8000')) {
  throw new Error(
    '\n[E2E] BACKEND_URL zeigt auf Port 8000 - das ist der PRODUKTIV-Port!\n' +
    '  E2E-Tests verwenden Port 8500.\n' +
    '  Loesung: BACKEND_URL weglassen (-> auto 8500) oder BACKEND_URL=http://localhost:8500 setzen.\n'
  )
}
if (BASE_URL.includes(':3000')) {
  throw new Error('[E2E] FRONTEND_URL zeigt auf Port 3000 - das ist der PRODUKTIV-Port! E2E verwendet 3500.')
}
