/**
 * Aufgezeichnete Backend-Antworten fuer gemockte Journeys (B8950-016 T19, Grenze B14).
 *
 * Ein Mock mit handgeschriebenem Body prueft nur, dass das Frontend SEINE Annahme ueber das Backend anzeigt. Hier liegt der
 * Body als Datei unter `e2e/fixtures/contracts/<name>.json` (`{status, body}`); ein "Real backend"-Test derselben Journey
 * ruft das echte Backend und vergleicht seine Antwort mit genau dieser Datei (`expectRealMatchesContract`). Aendert das
 * Backend die Form, wird dieser Test rot, und der Mock folgt nicht still einer veralteten Annahme.
 *
 * Neu aufzeichnen (nur wenn die Aenderung gewollt ist): `E2E_RECORD_CONTRACTS=1 npx playwright test <spec>`, Dateien committen.
 */
import fs from 'fs'
import path from 'path'
import { expect } from '@playwright/test'

const DIR = path.join(__dirname, '..', '..', 'fixtures', 'contracts')

export interface Contract {
  status: number
  body: unknown
}

export function contractPath(name: string): string {
  return path.join(DIR, `${name}.json`)
}

export function loadContract(name: string): Contract {
  return JSON.parse(fs.readFileSync(contractPath(name), 'utf8')) as Contract
}

/** Mock-Antwort fuer `route.fulfill` aus der aufgezeichneten Datei; `override` ersetzt einzelne Body-Felder (nur Objekt-Bodies). */
export function fulfillFrom(name: string, override: Record<string, unknown> = {}) {
  const { status, body } = loadContract(name)
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(Object.keys(override).length ? { ...(body as Record<string, unknown>), ...override } : body),
  }
}

/** Vergleicht die ECHTE Antwort mit der Datei (oder schreibt sie bei E2E_RECORD_CONTRACTS=1). `pick` waehlt den Body-Teil. */
export function expectRealMatchesContract(name: string, status: number, body: unknown): void {
  if (process.env.E2E_RECORD_CONTRACTS === '1') {
    fs.mkdirSync(DIR, { recursive: true })
    fs.writeFileSync(contractPath(name), JSON.stringify({ status, body }, null, 2) + '\n', 'utf8')
    return
  }
  expect(fs.existsSync(contractPath(name)), `Vertragsdatei ${name}.json fehlt: E2E_RECORD_CONTRACTS=1 aufzeichnen`).toBe(true)
  expect({ status, body }, `die echte Backend-Antwort weicht von e2e/fixtures/contracts/${name}.json ab`).toEqual(loadContract(name))
}
