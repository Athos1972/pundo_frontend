/**
 * Coverage-Variante von `@playwright/test` (nur bei E2E_COVERAGE=1).
 *
 * `tsconfig.e2e-cov.json` (von playwright.config.ts nur im Coverage-Modus gesetzt) bildet den Import
 * `@playwright/test` auf diese Datei ab. Alle Specs bekommen dadurch ein `test`, dessen Worker-Fixture `browser`
 * jede Seite mit der V8-Coverage ausstattet (e2e/coverage/client-collector.ts) - ohne dass ein Spec geaendert wird.
 * Alles andere (expect, request, devices, Typen) kommt unveraendert aus dem echten Paket.
 */
import { test as base } from '../../node_modules/@playwright/test'
import { instrumentBrowser } from './client-collector'

export * from '../../node_modules/@playwright/test'

export const test = base.extend<object>({
  browser: [async ({ browser }, provide) => {
    instrumentBrowser(browser)
    await provide(browser)
  }, { scope: 'worker' }],
})
