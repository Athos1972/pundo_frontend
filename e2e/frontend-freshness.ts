/**
 * Minimales globalSetup fuer `smoke-only.config.ts` / `no-setup.config.ts` (B8950-012, AK6):
 * kein Kill/Start, nur die Pruefung, dass der Server auf 3500 aktuellen Code ausliefert.
 */
import { assertFrontendFresh } from '../scripts/e2e-frontend.cjs'

export default async function frontendFreshness() {
  assertFrontendFresh({ backendUrl: process.env.BACKEND_URL ?? 'http://localhost:8500' })
}
