/**
 * Playwright Global Setup — pundo E2E Tests gegen pundo_test DB
 *
 * Läuft einmalig vor allen Tests:
 *   1. Ruft prepare_e2e_db.py auf → reset pundo_test + Kategorien kopieren
 *   2. Registriert einen Test-Shop-Owner via API
 *   3. Approvet ihn via Admin-API
 *   4. Loggt ihn ein und speichert den JWT-Cookie als Playwright Storage State
 *
 * Voraussetzung: Backend läuft auf Port 8001 gegen pundo_test.
 *   → scripts/start_test_server.sh im Backend-Repo ausführen
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { chromium } from '@playwright/test'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8001'
const frontendPort = process.env.E2E_FRONTEND_PORT ?? '3002'
const FRONTEND_URL = process.env.FRONTEND_URL ?? `http://localhost:${frontendPort}`
const BACKEND_REPO = process.env.BACKEND_REPO
  ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'
const ADMIN_SECRET = process.env.E2E_ADMIN_SECRET ?? 'pundo-admin-dev-secret'
export const STATE_FILE = path.join(__dirname, '.test-state.json')

interface TestCredentials {
  email: string
  password: string
  shop_name: string
  shop_address: string
}

async function apiPost(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function apiPatch(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'PATCH',
    headers,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PATCH ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

export default async function globalSetup() {
  console.log('\n[E2E Setup] Bereite pundo_test Datenbank vor...')

  // ── 1. DB reset + Kategorien kopieren ──────────────────────────────────────
  const pyBin = `${BACKEND_REPO}/.venv/bin/python`
  const pyScript = `${BACKEND_REPO}/scripts/prepare_e2e_db.py`

  let creds: TestCredentials
  try {
    const output = execSync(`${pyBin} ${pyScript}`, {
      cwd: BACKEND_REPO,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, PYTHONPATH: BACKEND_REPO },
    })
    // Last line of stdout is the JSON credentials
    const jsonLine = output.trim().split('\n').at(-1)!
    creds = JSON.parse(jsonLine)
    console.log('[E2E Setup] DB reset abgeschlossen, Kategorien kopiert.')
  } catch (err) {
    console.error('[E2E Setup] FEHLER beim DB-Reset:', err)
    throw err
  }

  // ── 2. Shop-Owner registrieren ─────────────────────────────────────────────
  console.log(`[E2E Setup] Registriere Shop-Owner: ${creds.email}`)
  let ownerId: number
  try {
    const reg = await apiPost('/api/v1/shop-owner/register', {
      email: creds.email,
      password: creds.password,
      name: 'E2E Test Owner',
      shop_name: creds.shop_name,
      shop_address: creds.shop_address,
    })
    ownerId = reg.id
    console.log(`[E2E Setup] Registriert, ID: ${ownerId}, status: ${reg.status}`)
  } catch (err) {
    // Wenn er schon existiert (409), Login versuchen um ID zu holen
    const loginRes = await apiPost('/api/v1/shop-owner/login', {
      email: creds.email,
      password: creds.password,
    })
    ownerId = loginRes.id
    console.log(`[E2E Setup] Shop-Owner schon vorhanden, ID: ${ownerId}`)
  }

  // ── 3. Approven ────────────────────────────────────────────────────────────
  console.log(`[E2E Setup] Approve Owner ${ownerId}...`)
  await apiPatch(`/api/v1/admin/shop-owner/${ownerId}/approve`, {
    Authorization: `Bearer ${ADMIN_SECRET}`,
  })
  console.log('[E2E Setup] Shop-Owner approved.')

  // ── 4. Login + Storage State für Playwright speichern ─────────────────────
  console.log('[E2E Setup] Erstelle Playwright Storage State (JWT-Cookie)...')
  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: FRONTEND_URL })
  const page = await context.newPage()

  // Login via API call (nicht per Browser-Formular) — zuverlässiger als
  // auf React-Hydratisierung zu warten. Der Cookie wird im Browser-Context gesetzt.
  console.log('[E2E Setup] Login via API...')
  const loginRes = await page.request.post(`${FRONTEND_URL}/api/shop-admin/login`, {
    data: { email: creds.email, password: creds.password },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!loginRes.ok()) {
    const text = await loginRes.text()
    throw new Error(`[E2E Setup] Login fehlgeschlagen: ${loginRes.status()} ${text}`)
  }
  const loginBody = await loginRes.json()
  console.log(`[E2E Setup] Login erfolgreich: status=${loginBody.status}, id=${loginBody.id}`)

  // Dashboard laden um sicherzustellen, dass der Cookie gesetzt ist und die Auth funktioniert
  await page.goto('/shop-admin/dashboard')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const dashUrl = page.url()
  console.log(`[E2E Setup] Dashboard URL: ${dashUrl}`)
  if (!dashUrl.includes('/shop-admin/dashboard')) {
    throw new Error(`[E2E Setup] Dashboard-Redirect fehlgeschlagen. URL: ${dashUrl}`)
  }
  console.log('[E2E Setup] Login erfolgreich, Dashboard erreicht.')

  const storageState = await context.storageState()
  await browser.close()

  // ── 5. State + Credentials speichern ──────────────────────────────────────
  const state = { ...creds, ownerId, storageState }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  console.log(`[E2E Setup] State gespeichert: ${STATE_FILE}`)
  console.log('[E2E Setup] Setup abgeschlossen.\n')
}
