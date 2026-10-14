/**
 * Playwright Global Teardown (B8950-012 / T1 F8950): Testdaten des Laufs aufraeumen und Lauf-Lock freigeben.
 * Bewusst hier und nicht in einem Reporter: CLI-`--reporter=…` ersetzt Config-Reporter, globalTeardown nicht.
 */
import { cleanupRun } from './cleanup-run'

export default async function globalTeardown() {
  cleanupRun()
}
