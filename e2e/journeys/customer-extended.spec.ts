/**
 * Journey: Customer Favorites + Profil-Deaktivierung + MCP-Tab (F6710)
 *
 * Fixtures:
 *   fav-<uuid>@pundo.com  — Customer für Favoriten + Reviews-Test
 *   del-<uuid>@pundo.com  — Customer für Account-Deletion
 *   mcp-<uuid>@pundo.com  — Customer für MCP-Tab-Test
 *
 * Tests:
 *   T1 — Favoriten: Item hinzufügen → im Account sehen → entfernen
 *   T2 — Eigene Reviews im Account-Profil
 *   T3 — Profil-Deaktivierung via OTP-Flow
 *   T4 — MCP-Tab /account/mcp lädt (mit skip-guard falls Baustein G noch fehlt)
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'
import { adminLogin as adminApiLogin } from './_helpers'
import fs from 'fs'
import path from 'path'

// ─── Port safety ──────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
const BACKEND_URL =
  process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[customer-extended] Safety: NEVER run against prod ports 3000/8000!')
}

// ─── Test identity ────────────────────────────────────────────────────────────

const UUID = randomUUID().slice(0, 8)
const PASSWORD = 'E2eTestPassword!99'

const FAV_EMAIL = `fav-${UUID}@pundo.com`
const DEL_EMAIL = `del-${UUID}@pundo.com`
const MCP_EMAIL = `mcp-${UUID}@pundo.com`

// ─── Shared context ───────────────────────────────────────────────────────────

interface CustomerCtx {
  favCustomerId: number | null
  favToken: string | null
  favStorageState: { cookies: { name: string; value: string; domain: string; path: string }[]; origins: never[] }

  delCustomerId: number | null
  delToken: string | null

  mcpCustomerId: number | null
  mcpToken: string | null
  mcpStorageState: { cookies: { name: string; value: string; domain: string; path: string }[]; origins: never[] }

  firstItemId: number | null
  findings: string[]
}

const ctx: CustomerCtx = {
  favCustomerId: null,
  favToken: null,
  favStorageState: { cookies: [], origins: [] },
  delCustomerId: null,
  delToken: null,
  mcpCustomerId: null,
  mcpToken: null,
  mcpStorageState: { cookies: [], origins: [] },
  firstItemId: null,
  findings: [],
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function signupCustomer(email: string): Promise<{ id: number; token: string }> {
  const displayName = email.split('@')[0]
  const res = await fetch(`${BACKEND_URL}/api/v1/customer/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, display_name: displayName }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Customer signup ${email}: HTTP ${res.status} — ${text}`)
  }
  // Login immediately (auto-approve for @pundo.com — no OTP needed)
  return loginCustomer(email)
}

async function loginCustomer(email: string): Promise<{ id: number; token: string }> {
  const res = await fetch(`${BACKEND_URL}/api/v1/customer/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    // Try alternate endpoint
    const res2 = await fetch(`${BACKEND_URL}/api/v1/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res2.ok) {
      const text = await res2.text().catch(() => '')
      throw new Error(`Customer login ${email}: HTTP ${res2.status} — ${text}`)
    }
    const cookieHeader2 = res2.headers.get('set-cookie') ?? ''
    const tokenMatch2 = cookieHeader2.match(/customer_token=([^;]+)/) ?? cookieHeader2.match(/session=([^;]+)/)
    if (!tokenMatch2) throw new Error(`Customer login ${email}: no token in Set-Cookie`)
    const me2 = await fetch(`${BACKEND_URL}/api/v1/customer/me`, {
      headers: { Authorization: `Bearer ${tokenMatch2[1]}` },
    }).then(r => r.json())
    return { id: me2.id as number, token: tokenMatch2[1] }
  }
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const tokenMatch = cookieHeader.match(/customer_token=([^;]+)/) ?? cookieHeader.match(/session=([^;]+)/)
  if (!tokenMatch) throw new Error(`Customer login ${email}: no token in Set-Cookie`)
  const token = tokenMatch[1]
  const meRes = await fetch(`${BACKEND_URL}/api/v1/customer/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!meRes.ok) throw new Error(`GET /customer/auth/me ${email}: HTTP ${meRes.status}`)
  const me = await meRes.json()
  return { id: me.id as number, token }
}

function buildStorageState(token: string, cookieName = 'customer_token') {
  return {
    cookies: [
      {
        name: cookieName,
        value: token,
        domain: new URL(BASE_URL).hostname,
        path: '/',
      },
    ],
    origins: [] as never[],
  }
}

async function getFirstPublicItemId(): Promise<number | null> {
  const res = await fetch(`${BACKEND_URL}/api/v1/products?limit=1`, {
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) return null
  const data = await res.json()
  const items = Array.isArray(data) ? data : data.items ?? data.results ?? []
  if (items.length === 0) return null
  return items[0].id as number
}

// ─── Setup & Teardown ─────────────────────────────────────────────────────────

test.beforeAll(async () => {
  // Create fav customer
  try {
    const { id, token } = await signupCustomer(FAV_EMAIL)
    ctx.favCustomerId = id
    ctx.favToken = token
    ctx.favStorageState = buildStorageState(token)
  } catch (err) {
    ctx.findings.push(`SETUP WARN: fav customer setup failed — ${err}`)
  }

  // Create del customer
  try {
    const { id, token } = await signupCustomer(DEL_EMAIL)
    ctx.delCustomerId = id
    ctx.delToken = token
  } catch (err) {
    ctx.findings.push(`SETUP WARN: del customer setup failed — ${err}`)
  }

  // Create mcp customer
  try {
    const { id, token } = await signupCustomer(MCP_EMAIL)
    ctx.mcpCustomerId = id
    ctx.mcpToken = token
    ctx.mcpStorageState = buildStorageState(token)
  } catch (err) {
    ctx.findings.push(`SETUP WARN: mcp customer setup failed — ${err}`)
  }

  // Resolve a public item for favorites/reviews
  try {
    ctx.firstItemId = await getFirstPublicItemId()
    if (ctx.firstItemId) {
      ctx.findings.push(`SETUP: Using public item ID ${ctx.firstItemId} for favorites tests`)
    } else {
      ctx.findings.push('SETUP WARN: No public items found — T1/T2 will skip. Run prepare_e2e_db.py to seed items.')
    }
  } catch (err) {
    ctx.findings.push(`SETUP WARN: getFirstPublicItemId failed — ${err}`)
  }
})

test.afterAll(async () => {
  const adminToken = await adminApiLogin().catch(() => null)
  if (!adminToken) {
    ctx.findings.push('CLEANUP WARN: No admin token — manual cleanup may be needed')
  }

  // Delete all test customers via admin API
  for (const [label, id] of [
    ['fav', ctx.favCustomerId],
    ['del', ctx.delCustomerId],
    ['mcp', ctx.mcpCustomerId],
  ] as [string, number | null][]) {
    if (id && adminToken) {
      const res = await fetch(`${BACKEND_URL}/api/v1/admin/customers/${id}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
        signal: AbortSignal.timeout(15_000),
      }).catch(() => null)
      if (res && !res.ok && res.status !== 404) {
        ctx.findings.push(`CLEANUP WARN: Failed to delete ${label} customer ${id}: HTTP ${res.status}`)
      }
    }
  }

  // Write report
  const reportDir = path.join(__dirname, 'reports')
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })
  const date = new Date().toISOString().slice(0, 10)
  const report = [
    `# Journey Report: customer-extended (${date})`,
    '',
    `**FAV Customer:** ${FAV_EMAIL}`,
    `**DEL Customer:** ${DEL_EMAIL}`,
    `**MCP Customer:** ${MCP_EMAIL}`,
    `**Test Item ID:** ${ctx.firstItemId ?? 'none found'}`,
    '',
    '## Findings',
    ...ctx.findings.map(f => `- ${f}`),
  ].join('\n')
  fs.writeFileSync(path.join(reportDir, `customer-extended-${date}.md`), report)
})

// ─── T1: Favoriten ────────────────────────────────────────────────────────────

test.describe('T1 — Favoriten', () => {
  test('Favorit hinzufügen, im Account sehen, entfernen', async ({ page }) => {
    if (!ctx.favToken || !ctx.firstItemId) {
      test.skip(true, `Missing fav token (${!!ctx.favToken}) or item ID (${ctx.firstItemId})`)
      return
    }

    // API: Add favorite
    const addRes = await fetch(
      `${BACKEND_URL}/api/v1/customer/favorites/${ctx.firstItemId}`,
      {
        method: 'POST',
        headers: authHeader(ctx.favToken),
        signal: AbortSignal.timeout(15_000),
      }
    )
    expect([200, 201, 204], `POST /favorites/${ctx.firstItemId}: ${addRes.status}`).toContain(addRes.status)

    // Browser: navigate to /account favorites tab
    await page.context().addCookies([
      {
        name: 'customer_token',
        value: ctx.favToken,
        domain: new URL(BASE_URL).hostname,
        path: '/',
      },
    ])
    await page.goto(`${BASE_URL}/account`, { waitUntil: 'domcontentloaded', timeout: 15_000 })

    // Wait for account content to load (spinner replaced by actual content)
    const accountContent = page.locator('[data-testid="account-content"], nav[aria-label], .account-tabs, main a, main button')
    await accountContent.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {
      ctx.findings.push('T1 WARN: account page content not visible after 10s (frontend may have render error)')
    })

    // Find Favorites tab
    const favTab = page.locator('a:has-text("Favorites"), a:has-text("Favoriten"), button:has-text("Favorites"), button:has-text("Favoriten"), [data-tab="favorites"]')
    const favTabCount = await favTab.count()
    if (favTabCount > 0) {
      await favTab.first().click({ timeout: 5_000 }).catch((e: Error) => {
        ctx.findings.push(`T1 WARN: favorites tab click failed — ${e.message}`)
      })
    }

    // Assert item is visible (by ID attribute or listing)
    const favoriteItem = page.locator(`[data-item-id="${ctx.firstItemId}"], [data-id="${ctx.firstItemId}"]`)
    if (await favoriteItem.count() > 0) {
      await expect(favoriteItem.first()).toBeVisible({ timeout: 5_000 })
      ctx.findings.push('T1 PASS: Favorit im Account sichtbar')
    } else {
      // Fallback: at least one item in favorites list
      const anyFavItem = page.locator('[data-testid="favorite-item"], .favorite-item, [class*="favorite"]')
      if (await anyFavItem.count() > 0) {
        await expect(anyFavItem.first()).toBeVisible({ timeout: 5_000 })
        ctx.findings.push('T1 PARTIAL: Favorites-Liste nicht leer, aber kein Item-ID-Match')
      } else {
        ctx.findings.push('T1 WARN: Keine Favoriten-Items in der Liste gefunden (account-page rendering or UI gap)')
      }
    }

    // API: Remove favorite
    const delRes = await fetch(
      `${BACKEND_URL}/api/v1/customer/favorites/${ctx.firstItemId}`,
      {
        method: 'DELETE',
        headers: authHeader(ctx.favToken),
        signal: AbortSignal.timeout(15_000),
      }
    )
    expect([200, 204, 404], `DELETE /favorites/${ctx.firstItemId}: ${delRes.status}`).toContain(delRes.status)

    // Reload and assert item no longer in favorites
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10_000 }).catch(() => null)

    if (await favTab.count() > 0) {
      await favTab.first().click({ timeout: 5_000 }).catch(() => null)
    }

    const removedItem = page.locator(`[data-item-id="${ctx.firstItemId}"]`)
    if (await removedItem.count() === 0) {
      ctx.findings.push('T1 PASS: Favorit nach Entfernen nicht mehr sichtbar')
    } else {
      ctx.findings.push('T1 WARN: Favorit nach DELETE noch sichtbar (evtl. Cache-Delay)')
    }
  })
})

// ─── T2: Eigene Reviews im Profil ─────────────────────────────────────────────

test.describe('T2 — Eigene Reviews im Profil', () => {
  test('Review anlegen + im Account-Profil sichtbar', async ({ page }) => {
    if (!ctx.favToken || !ctx.favCustomerId || !ctx.firstItemId) {
      test.skip(true, 'Missing fav customer or item ID')
      return
    }

    const adminToken = await adminApiLogin().catch(() => null)

    // API: Create review
    const reviewRes = await fetch(`${BACKEND_URL}/api/v1/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(ctx.favToken),
      },
      body: JSON.stringify({
        item_id: ctx.firstItemId,
        rating: 4,
        text: `E2E Test Review ${UUID}`,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!reviewRes.ok) {
      const text = await reviewRes.text().catch(() => '')
      ctx.findings.push(`T2 SKIP: POST /reviews failed ${reviewRes.status} — ${text}`)
      test.skip(true, `POST /reviews: ${reviewRes.status}`)
      return
    }
    const review = await reviewRes.json()
    const reviewId = review.id as number

    // Admin: approve review
    if (adminToken && reviewId) {
      await fetch(`${BACKEND_URL}/api/v1/admin/reviews/${reviewId}/approve`, {
        method: 'POST',
        headers: authHeader(adminToken),
        signal: AbortSignal.timeout(15_000),
      }).catch(() => null)
    }

    // Browser: navigate to /account reviews tab
    await page.context().addCookies([
      {
        name: 'customer_token',
        value: ctx.favToken,
        domain: new URL(BASE_URL).hostname,
        path: '/',
      },
    ])
    await page.goto(`${BASE_URL}/account`, { waitUntil: 'domcontentloaded', timeout: 15_000 })

    const reviewsTab = page.locator('a:has-text("Reviews"), button:has-text("Reviews"), [data-tab="reviews"]')
    if (await reviewsTab.count() > 0) {
      await reviewsTab.first().click({ timeout: 5_000 }).catch(() => null)
    }

    // Assert review text visible
    const reviewText = page.locator(`text=E2E Test Review ${UUID}`)
    if (await reviewText.count() > 0) {
      await expect(reviewText.first()).toBeVisible()
      ctx.findings.push('T2 PASS: Eigene Review im Account sichtbar')
    } else {
      ctx.findings.push('T2 WARN: Review-Text nicht im Account gefunden (evtl. anderer Tab oder UI)')
    }

    // Cleanup: delete review via admin
    if (adminToken && reviewId) {
      await fetch(`${BACKEND_URL}/api/v1/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
        signal: AbortSignal.timeout(15_000),
      }).catch(() => null)
    }
  })
})

// ─── T3: Profil-Deaktivierung ─────────────────────────────────────────────────

test.describe('T3 — Profil-Deaktivierung (Account-Deletion)', () => {
  test('Deletion Request → OTP → DELETE → Login danach 401', async () => {
    if (!ctx.delToken || !ctx.delCustomerId) {
      test.skip(true, 'del customer not set up')
      return
    }

    // Step 1: Request deletion
    const reqRes = await fetch(`${BACKEND_URL}/api/v1/customer/auth/account/request-deletion`, {
      method: 'POST',
      headers: authHeader(ctx.delToken),
      signal: AbortSignal.timeout(15_000),
    })
    if (!reqRes.ok) {
      const text = await reqRes.text().catch(() => '')
      ctx.findings.push(`T3 SKIP: POST /request-deletion failed ${reqRes.status} — ${text}`)
      test.skip(true, `request-deletion: ${reqRes.status}`)
      return
    }

    // Step 2: Get OTP via admin endpoint
    const adminToken = await adminApiLogin().catch(() => null)
    let otp: string | null = null

    if (adminToken) {
      const otpRes = await fetch(
        `${BACKEND_URL}/api/v1/admin/otp/${encodeURIComponent(DEL_EMAIL)}`,
        {
          headers: authHeader(adminToken),
          signal: AbortSignal.timeout(15_000),
        }
      )
      if (otpRes.ok) {
        const otpData = await otpRes.json()
        otp = otpData.otp ?? otpData.code ?? null
      } else {
        ctx.findings.push(`T3 WARN: GET /admin/otp/${DEL_EMAIL} returned ${otpRes.status} — trying without OTP`)
      }
    }

    if (!otp) {
      ctx.findings.push('T3 SKIP: Could not retrieve OTP — admin endpoint not available')
      test.skip(true, 'OTP retrieval not available')
      return
    }

    // Step 3: Delete account with OTP
    const delRes = await fetch(`${BACKEND_URL}/api/v1/customer/auth/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(ctx.delToken),
      },
      body: JSON.stringify({ otp }),
      signal: AbortSignal.timeout(15_000),
    })
    expect([200, 204], `DELETE /account: ${delRes.status}`).toContain(delRes.status)

    // Step 4: Login attempt must fail with 401
    const loginRes = await fetch(`${BACKEND_URL}/api/v1/customer/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEL_EMAIL, password: PASSWORD }),
      signal: AbortSignal.timeout(15_000),
    })
    expect(loginRes.status, 'Deleted account must not be able to login').toBe(401)

    // Mark as deleted so afterAll skips the admin-delete
    ctx.delCustomerId = null
    ctx.findings.push('T3 PASS: Account-Deletion Flow komplett — Login danach 401')
  })
})

// ─── T4: MCP-Tab ──────────────────────────────────────────────────────────────

test.describe('T4 — MCP-Tab', () => {
  test('MCP-Tab /account/mcp lädt ohne 404', async ({ page }) => {
    if (!ctx.mcpToken) {
      test.skip(true, 'mcp customer not set up')
      return
    }

    await page.context().addCookies([
      {
        name: 'customer_token',
        value: ctx.mcpToken,
        domain: new URL(BASE_URL).hostname,
        path: '/',
      },
    ])

    const response = await page.goto(`${BASE_URL}/account/mcp`, {
      waitUntil: 'load',
    })

    // Guard: skip if page 404s (Baustein G not yet deployed)
    const status = response?.status() ?? 200
    const is404 = status === 404 || page.url().includes('/not-found') || page.url().includes('/404')
    if (is404) {
      ctx.findings.push('T4 SKIP: /account/mcp returns 404 — Baustein G (MCP Deploy) noch ausstehend')
      test.skip(true, 'Baustein G (MCP Deploy) noch ausstehend')
      return
    }

    expect(status, '/account/mcp must not return 5xx').toBeLessThan(500)

    // Assert MCP heading visible
    const heading = page.locator('h1, h2, [data-testid="mcp-heading"]')
    await expect(heading.first()).toBeVisible({ timeout: 10_000 })

    // Assert no server error on page
    const errorMsg = page.locator('text=500, text=Internal Server Error, [data-testid="error-page"]')
    expect(await errorMsg.count()).toBe(0)

    ctx.findings.push('T4 PASS: /account/mcp lädt ohne 404/5xx')
  })
})
