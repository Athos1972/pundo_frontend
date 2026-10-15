/**
 * Zentrale E2E-Fixtures und -Helfer (F8950 T30).
 *
 * Specs importieren `test`/`expect` von hier (oder von `journeys/_helpers/worker-shop`, das darauf aufbaut)
 * und nutzen:
 *   - `BASE_URL` / `BACKEND_URL`   die eine Quelle fuer URLs (`e2e/env.ts`); in Specs sonst nur relative `page.goto('/…')`
 *   - Fixture `adminPage`          Page mit Admin-storageState (`e2e/.auth/admin.json`, vom Global Setup), kein UI-Login
 *   - Fixture `adminApi`           Admin-API (`/api/v1/admin`) mit Token aus dem State, bei 401 einmal frischer Login
 *   - Fixture `ownerApi`           Shop-Owner-API (`/api/v1/shop-owner`) mit Bearer-Token
 *   - `createStepLog()`            Schrittprotokoll fuer die Journey-Reports (ersetzt 12 lokale `logStep`-Kopien)
 *   - `apiFetch`, `adminHeaders`, `adminLogin`, `shopOwnerLogin`, `shopOwnerOnboardWithRetry`   (aus `journeys/_helpers`)
 *
 * Reine Backend-Helfer ohne Playwright-Bezug liegen in `journeys/_helpers.ts` bzw. `journeys/_helpers/test-data.ts`.
 */
import { test as base, expect, type Page } from '@playwright/test'
import path from 'path'
import { BACKEND_URL, BASE_URL } from './env'
import {
  adminHeaders, adminLogin, apiFetch, shopOwnerLogin, shopOwnerOnboardWithRetry,
  type ApiFetchResult,
} from './journeys/_helpers'
import { adminApi, ownerApi, type ApiResult } from './journeys/_helpers/test-data'

export {
  BASE_URL, BACKEND_URL,
  adminHeaders, adminLogin, apiFetch, shopOwnerLogin, shopOwnerOnboardWithRetry,
}
export type { ApiFetchResult, ApiResult }

/** Admin-storageState, vom Global Setup geschrieben (`writeAdminStorageState`). */
export const ADMIN_STATE = path.join(__dirname, '.auth', 'admin.json')

// ── Schrittprotokoll fuer Journey-Reports ─────────────────────────────────────

export type StepStatus = 'PASS' | 'FAIL' | 'SKIP'

export interface StepEntry {
  step: number | string
  desc: string
  expected: string
  actual: string
  status: StepStatus
  note?: string
}

/** `logStep(step, desc, expected, actual, status[, note])`; kurze Form `logStep(step, desc, ok)`. */
export interface LogStep {
  (step: number | string, desc: string, expected: string, actual: string, status: StepStatus | boolean, note?: string): void
  (step: number | string, desc: string, ok: boolean): void
}

/**
 * Schrittprotokoll fuer die Journey-Reports. `status` darf ein Boolean sein (true = PASS, false = FAIL).
 * Eintraege landen in `target` (Default: neues Array) und werden von den `writeReport`-Funktionen der Specs
 * ausgewertet. Mit `echoTag` wird zusaetzlich auf die Konsole geschrieben.
 */
export function createStepLog(target: StepEntry[] = [], echoTag?: string): { entries: StepEntry[]; logStep: LogStep } {
  const logStep: LogStep = (
    step: number | string, desc: string, a: string | boolean, actual?: string, status?: StepStatus | boolean, note?: string,
  ): void => {
    const short = typeof a === 'boolean'
    const expected = short ? '' : a
    const raw = short ? a : status
    const s: StepStatus = typeof raw === 'boolean' ? (raw ? 'PASS' : 'FAIL') : (raw ?? 'FAIL')
    const entry: StepEntry = { step, desc, expected, actual: short ? '' : (actual ?? ''), status: s }
    if (note !== undefined) entry.note = note
    target.push(entry)
    if (echoTag) console.log(`[${echoTag}] Step ${step} [${s}]: ${desc} | expected: ${entry.expected} | actual: ${entry.actual}`)
  }
  return { entries: target, logStep }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

export type AdminApi = typeof adminApi
export type OwnerApi = typeof ownerApi

interface E2eFixtures {
  /** Page in einem eigenen Context mit Admin-storageState (eingeloggt, ohne Formular-Login). */
  adminPage: Page
  adminApi: AdminApi
  ownerApi: OwnerApi
}

export const test = base.extend<E2eFixtures>({
  adminPage: async ({ browser }, provide) => {
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: ADMIN_STATE })
    const page = await context.newPage()
    try {
      await provide(page)
    } finally {
      await context.close()
    }
  },
  adminApi: async ({}, provide) => { await provide(adminApi) },
  ownerApi: async ({}, provide) => { await provide(ownerApi) },
})

export { expect }
