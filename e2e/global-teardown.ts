/**
 * Playwright Global Teardown (B8950-012): Lauf-Lock freigeben.
 * (Der Cleanup-Reporter ist nicht garantiert der letzte Hook, daher hier.)
 */
import { releaseLock } from './run-lock'

export default async function globalTeardown() {
  releaseLock(process.env.E2E_RUN_ID)
}
