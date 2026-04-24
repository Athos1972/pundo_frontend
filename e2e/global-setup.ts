/**
 * Playwright Global Setup — pundo E2E Tests gegen pundo_test DB
 *
 * Läuft einmalig vor allen Tests:
 *   1. Test-Backend auf Port 8500 killen und neu starten (sauberer Zustand)
 *   2. Wartet bis Backend-Healthcheck antwortet
 *   3. Ruft prepare_e2e_db.py auf → reset pundo_test + Kategorien kopieren
 *   4. Registriert einen Test-Shop-Owner via API
 *   5. Approvet ihn via Admin-API
 *   6. Loggt ihn ein und speichert den JWT-Cookie als Playwright Storage State
 *
 * Kein manueller Backend-Start nötig — global-setup übernimmt das automatisch.
 * Port-Trennung wird erzwungen: Port 8000/8001 (Produktion) wird abgelehnt.
 */

import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { chromium } from '@playwright/test'

// Port 8000/8001 ist der Produktiv-Port — niemals für E2E.
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8500'
if (backendUrl.includes(':8000') || backendUrl.includes(':8001')) {
  throw new Error(
    '\n[E2E Setup] BACKEND_URL zeigt auf Port 8000/8001 — das ist der PRODUKTIV-Port!\n' +
    '  E2E-Tests laufen immer gegen Port 8500.\n'
  )
}

const BACKEND_URL = backendUrl
const frontendPort = process.env.E2E_FRONTEND_PORT ?? '3500'
const FRONTEND_URL = process.env.FRONTEND_URL ?? `http://127.0.0.1:${frontendPort}`
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

async function apiPatch(path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'PATCH',
    headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PATCH ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return {}
  return res.json()
}

async function adminLogin(): Promise<string> {
  const BACKEND_REPO_PATH = process.env.BACKEND_REPO
    ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'
  const pyBin = `${BACKEND_REPO_PATH}/.venv/bin/python`
  const adminEmail = 'e2e-admin@pundo-e2e.io'
  const adminPassword = 'E2eAdminPassword!99'
  // Seed admin user into the test DB (idempotent).
  // Read DATABASE_URL_TEST from backend's .env if not in process.env, then
  // override DATABASE_URL so seed_admin.py writes to pundo_test.
  let testDbUrl = process.env.DATABASE_URL_TEST
  if (!testDbUrl) {
    const envFile = fs.readFileSync(path.join(BACKEND_REPO_PATH, '.env'), 'utf8')
    const match = envFile.match(/^DATABASE_URL_TEST=(.+)$/m)
    if (match) testDbUrl = match[1].trim()
  }
  if (!testDbUrl) throw new Error('[E2E Setup] DATABASE_URL_TEST not found — check backend .env')
  execSync(
    `${pyBin} scripts/seed_admin.py --email ${adminEmail} --password ${adminPassword}`,
    { cwd: BACKEND_REPO_PATH, stdio: 'pipe', env: { ...process.env, DATABASE_URL: testDbUrl } }
  )
  // Login to get admin_token cookie
  const res = await fetch(`${BACKEND_URL}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Admin login failed: ${res.status}: ${text}`)
  }
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const match = cookieHeader.match(/admin_token=([^;]+)/)
  if (!match) throw new Error('admin_token cookie not found in login response')
  return match[1]
}

export default async function globalSetup() {
  // ── 0. Test-Backend auf Port 8002 killen und neu starten ───────────────────
  const backendPort = new URL(BACKEND_URL).port || '8500'
  console.log(`\n[E2E Setup] Starte Test-Backend neu (Port ${backendPort})...`)

  // Laufendes Backend auf diesem Port killen
  try {
    execSync(`lsof -ti TCP:${backendPort} -sTCP:LISTEN | xargs kill -9 2>/dev/null || true`, { stdio: 'pipe' })
    console.log(`[E2E Setup] Altes Backend auf Port ${backendPort} beendet.`)
  } catch {
    // kein Prozess lief — ok
  }

  // Kurz warten damit der Port freigegeben ist
  await new Promise(r => setTimeout(r, 500))

  // Backend im Hintergrund starten
  const backendScript = path.join(BACKEND_REPO, 'scripts', 'start_test_server.sh')
  if (!fs.existsSync(backendScript)) {
    throw new Error(`[E2E Setup] start_test_server.sh nicht gefunden: ${backendScript}`)
  }
  const backendProc = spawn('bash', [backendScript], {
    cwd: BACKEND_REPO,
    env: { ...process.env, E2E_BACKEND_PORT: backendPort },
    detached: false,
    stdio: 'pipe',
  })
  backendProc.stderr?.on('data', (d: Buffer) => {
    const line = d.toString().trim()
    if (line) console.log(`[backend] ${line}`)
  })

  // Healthcheck-Poll bis Backend antwortet (max 60s)
  console.log('[E2E Setup] Warte auf Backend-Healthcheck...')
  const deadline = Date.now() + 60_000
  let healthy = false
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/products?limit=1`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) { healthy = true; break }
      console.log(`[E2E Setup] Healthcheck: ${res.status} — warte...`)
    } catch (e) {
      // not ready yet — continue polling
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  if (!healthy) {
    backendProc.kill()
    throw new Error(
      `\n[E2E Setup] Test-Backend auf ${BACKEND_URL} antwortet nach 30s nicht.\n` +
      `  Prüfe ${BACKEND_REPO}/scripts/start_test_server.sh und DATABASE_URL_TEST in .env\n`
    )
  }
  console.log('[E2E Setup] Test-Backend bereit.')

  console.log('[E2E Setup] Bereite pundo_test Datenbank vor...')

  // ── 1. DB reset + Kategorien kopieren ──────────────────────────────────────
  const pyBin = `${BACKEND_REPO}/.venv/bin/python`
  const pyScript = `${BACKEND_REPO}/scripts/prepare_e2e_db.py`

  let creds!: TestCredentials
  // Retry up to 3x — TRUNCATE CASCADE can deadlock with backend's open connections
  let dbErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const output = execSync(`${pyBin} ${pyScript}`, {
        cwd: BACKEND_REPO,
        encoding: 'utf8',
        timeout: 300_000,
        env: { ...process.env, PYTHONPATH: BACKEND_REPO },
      })
      // Last line of stdout is the JSON credentials
      const jsonLine = output.trim().split('\n').at(-1)!
      creds = JSON.parse(jsonLine)
      console.log('[E2E Setup] DB reset abgeschlossen, Kategorien kopiert.')
      dbErr = undefined
      break
    } catch (err) {
      dbErr = err
      console.warn(`[E2E Setup] DB-Reset Versuch ${attempt}/3 fehlgeschlagen (Deadlock?), warte 3s…`)
      await new Promise(r => setTimeout(r, 3000))
    }
  }
  if (dbErr) {
    console.error('[E2E Setup] FEHLER beim DB-Reset nach 3 Versuchen:', dbErr)
    throw dbErr
  }

  // ── 1b. Backend nach Schema-Reset neu starten ──────────────────────────────
  // prepare_e2e_db runs DROP SCHEMA + alembic upgrade, which invalidates all
  // open SQLAlchemy connections in the running uvicorn workers.  Workers then
  // crash on the next DB request (ECONNREFUSED from the caller's perspective).
  // Fix: kill + restart the backend with a fresh connection pool.
  console.log('[E2E Setup] Starte Backend nach DB-Reset neu (frischer Connection-Pool)...')
  try {
    execSync(`lsof -ti TCP:${backendPort} -sTCP:LISTEN | xargs kill -9 2>/dev/null || true`, { stdio: 'pipe' })
  } catch { /* ok */ }
  await new Promise(r => setTimeout(r, 1000))

  const backendProc2 = spawn('bash', [backendScript], {
    cwd: BACKEND_REPO,
    env: { ...process.env, E2E_BACKEND_PORT: backendPort },
    detached: false,
    stdio: 'pipe',
  })
  backendProc2.stderr?.on('data', (d: Buffer) => {
    const line = d.toString().trim()
    if (line) console.log(`[backend] ${line}`)
  })

  const deadline2 = Date.now() + 30_000
  let healthy2 = false
  while (Date.now() < deadline2) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/products?limit=1`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) { healthy2 = true; break }
    } catch { /* noch nicht bereit */ }
    await new Promise(r => setTimeout(r, 1000))
  }
  if (!healthy2) {
    backendProc2.kill()
    throw new Error(`\n[E2E Setup] Backend nach DB-Reset nicht erreichbar nach 30s.\n`)
  }
  console.log('[E2E Setup] Backend nach DB-Reset bereit.')

  // ── 2 + 3. Shop-Owner registrieren und approven ────────────────────────────
  // Also handles re-runs where the owner already exists (DB not fully reset).
  console.log(`[E2E Setup] Registriere Shop-Owner: ${creds.email}`)

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  async function ensureOwner(): Promise<number> {
    // ── try registration (with retry for transient 5xx) ───────────────────
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const reg = await apiPost('/api/v1/shop-owner/register', {
          email: creds.email,
          password: creds.password,
          name: 'E2E Test Owner',
          shop_name: creds.shop_name,
          shop_address: creds.shop_address,
        })
        console.log(`[E2E Setup] Registriert, ID: ${reg.id}, status: ${reg.status}`)
        return reg.id
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('400') || msg.includes('Already registered')) {
          console.log('[E2E Setup] Email already registered, falling back to login…')
          break // user exists → fall through to login
        }
        if (attempt < 5) {
          console.log(`[E2E Setup] Registrierung Versuch ${attempt} fehlgeschlagen (${msg.slice(0, 80)}), warte 2s…`)
          await sleep(2000)
        } else {
          throw err
        }
      }
    }

    // ── user already exists: login or approve+login ───────────────────────
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await apiPost('/api/v1/shop-owner/login', {
          email: creds.email,
          password: creds.password,
        })
        console.log(`[E2E Setup] Shop-Owner schon vorhanden, ID: ${res.id}`)
        return res.id
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        // 403 = pending approval — approve by ID (after clean DB reset it's always 1)
        if (msg.includes('403') || msg.includes('pending')) {
          console.log('[E2E Setup] Account pending — approving via admin API…')
          try {
            const tok = await adminLogin()
            await apiPatch('/api/v1/admin/shop-owners/1', { status: 'approved' }, { Cookie: `admin_token=${tok}` })
          } catch {/* ignore if already approved */}
          continue
        }
        if (attempt < 3) {
          await sleep(1000)
        } else {
          throw err
        }
      }
    }
    throw new Error('[E2E Setup] Could not register or log in test owner')
  }

  const ownerId = await ensureOwner()

  // ── 3. Approven ────────────────────────────────────────────────────────────
  console.log(`[E2E Setup] Approve Owner ${ownerId}...`)
  try {
    const adminToken = await adminLogin()
    await apiPatch(
      `/api/v1/admin/shop-owners/${ownerId}`,
      { status: 'approved' },
      { Cookie: `admin_token=${adminToken}` }
    )
    console.log('[E2E Setup] Shop-Owner approved.')
  } catch (err: unknown) {
    // Ignore if already approved (idempotent)
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes('already') && !msg.includes('200')) throw err
    console.log('[E2E Setup] Shop-Owner war bereits approved.')
  }

  // ── 3b. Geo-Koordinaten für Test-Shop setzen + Slug ermitteln ──────────────
  let testShopId: number | null = null
  let testShopSlug: string | null = null
  try {
    const adminToken = await adminLogin()
    // Get shop_id from owner record (shop_owners.shop_id is a direct FK)
    const ownerRes = await fetch(`${BACKEND_URL}/api/v1/admin/shop-owners/${ownerId}`, {
      headers: { Cookie: `admin_token=${adminToken}` },
    })
    if (ownerRes.ok) {
      const ownerData = await ownerRes.json()
      const shopId = ownerData?.shop_id
      if (shopId) {
        testShopId = shopId
        // Set geo-coordinates (geocoding service not available in test env)
        const shopRes = await apiPatch(
          `/api/v1/admin/shops/${shopId}`,
          { lat: 34.9177, lng: 33.6273 },
          { Cookie: `admin_token=${adminToken}` }
        ) as Record<string, unknown>
        testShopSlug = shopRes?.slug as string ?? null
        console.log(`[E2E Setup] Geo-Koordinaten gesetzt für Shop ${shopId} (slug=${testShopSlug}).`)
      }
    }
  } catch (err) {
    console.warn('[E2E Setup] Geo-Koordinaten setzen fehlgeschlagen (nicht kritisch):', err)
  }

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

  // ── 5. Admin-Token für System-Admin-Tests holen ───────────────────────────
  let adminToken: string | null = null
  try {
    adminToken = await adminLogin()
  } catch (err) {
    console.warn('[E2E Setup] Admin-Token konnte nicht ermittelt werden (System-Admin-Tests werden geskippt):', err)
  }

  // ── 6. State + Credentials speichern ──────────────────────────────────────
  const state = { ...creds, ownerId, shopId: testShopId, shopSlug: testShopSlug, storageState, adminToken }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  console.log(`[E2E Setup] State gespeichert: ${STATE_FILE}`)
  console.log('[E2E Setup] Setup abgeschlossen.\n')
}
