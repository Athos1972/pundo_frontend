/**
 * Journey: API-Matrix alle 44 Shop-Unterarten (F6710)
 *
 * Reine API-Tests (kein Browser) — parametrisiert über alle Provider-Types und Domains.
 * Jeder Test registriert einen @pundo.com-Account → auto-approved → Login → Item anlegen
 * → Shop-Abfrage → Cleanup.
 *
 * Domains:
 *   handwerker (12): bodenbelag, dachdecker, elektriker, fliesenleger, klimatechnik-ac,
 *                    klempner-sanitaer, maler-lackierer, maurer-bau, poolservice,
 *                    schlosser-schluessel, schreiner-tischler, umzug-transport
 *   dienstleister (12): buchhalter-steuer, fotograf, friseur, hundesalon, it-support,
 *                        kosmetik-beauty, massage, nachhilfe, nagelstudio, rechtsanwalt,
 *                        reinigung, umzugshelfer
 *   haendler (10): apotheke, baeckerei-konditorei, baumaterial, blumenladen,
 *                  elektronik-geraete, haushaltwaren, kleidung-mode, lebensmittel-supermarkt,
 *                  metzgerei, spielzeug-hobby
 *   gastro (10): asiatisch-sushi, baeckerei-cafe, bar-pub, cafe-kaffeehaus, fast-food,
 *                grill-bbq, pizzeria, restaurant-allgemein, strassenkueche, vegetarisch-vegan
 *
 * Ziel-Laufzeit: < 90 Sekunden (workers: 4, parallel describe-blocks)
 *
 * Ports: Backend 8500, DB: pundo_test — NEVER 8000
 */

import { test, expect } from '@playwright/test'
import { shopOwnerLogin, shopOwnerOnboardWithRetry } from './_helpers'
import { TestDataTracker, e2eEmail, e2eName } from './_helpers/test-data'
import fs from 'fs'
import path from 'path'

// ─── Port safety ──────────────────────────────────────────────────────────────

const BACKEND_URL =
  process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'

if (BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-type-api-matrix] Safety: NEVER run against prod port 8000!')
}

// ─── Domain matrix ────────────────────────────────────────────────────────────

const MATRIX: Record<string, string[]> = {
  handwerker: [
    'bodenbelag', 'dachdecker', 'elektriker', 'fliesenleger', 'klimatechnik-ac',
    'klempner-sanitaer', 'maler-lackierer', 'maurer-bau', 'poolservice',
    'schlosser-schluessel', 'schreiner-tischler', 'umzug-transport',
  ],
  dienstleister: [
    'buchhalter-steuer', 'fotograf', 'friseur', 'hundesalon', 'it-support',
    'kosmetik-beauty', 'massage', 'nachhilfe', 'nagelstudio', 'rechtsanwalt',
    'reinigung', 'umzugshelfer',
  ],
  haendler: [
    'apotheke', 'baeckerei-konditorei', 'baumaterial', 'blumenladen',
    'elektronik-geraete', 'haushaltwaren', 'kleidung-mode', 'lebensmittel-supermarkt',
    'metzgerei', 'spielzeug-hobby',
  ],
  gastro: [
    'asiatisch-sushi', 'baeckerei-cafe', 'bar-pub', 'cafe-kaffeehaus', 'fast-food',
    'grill-bbq', 'pizzeria', 'restaurant-allgemein', 'strassenkueche', 'vegetarisch-vegan',
  ],
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const PASSWORD = 'E2eTestPassword!99'

async function onboardShopOwner(
  email: string,
  providerType: string,
  domainSlug: string,
): Promise<{ ownerId: number; shopId: number; token: string }> {
  const data = await shopOwnerOnboardWithRetry({
    email,
    provider_type: providerType,
    domain_slugs: [domainSlug],
    shop_name: e2eName('MATRIX', `${providerType} ${domainSlug}`), // Marker am Anfang (B8950-012)
    location: { lat: 34.917, lng: 33.636 },
    contact: { phone: '+35799000001' },
    credentials: { type: 'email', email, password: PASSWORD, name: email.split('@')[0] },
    lang: 'en',
  })
  if (data.status !== 'approved') {
    throw new Error(
      `Onboarding ${email}: expected status=approved but got "${data.status}". Is Auto-Approve deployed?`
    )
  }

  // Login (retries on 429)
  const token = await shopOwnerLogin(email, PASSWORD)

  // Resolve IDs via /me
  const meRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/me`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!meRes.ok) throw new Error(`GET /me ${email}: HTTP ${meRes.status}`)
  const me = await meRes.json()
  return { ownerId: me.id as number, shopId: me.shop_id as number, token }
}

let cachedCategoryId: number | null | undefined = undefined
async function getFirstCategoryId(): Promise<number | null> {
  if (cachedCategoryId !== undefined) return cachedCategoryId
  const res = await fetch(`${BACKEND_URL}/api/v1/categories`, {
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) { cachedCategoryId = null; return null }
  const data = await res.json()
  const cats = Array.isArray(data) ? data : data.items ?? data.categories ?? data.results ?? []
  cachedCategoryId = (cats[0]?.id as number) ?? null
  return cachedCategoryId
}

async function createItem(
  token: string,
  categoryId: number | null,
  domain: string,
  uuid: string,
): Promise<number | null> {
  if (categoryId === null) return null  // No categories in test DB (studio mode) — skip item creation
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name_de: e2eName('MATRIX', `Item ${domain} ${uuid}`),
      category_id: categoryId,
      confirmed: true,
    }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`POST /items (${domain}): HTTP ${res.status} — ${text}`)
  }
  const item = await res.json()
  return item.id as number
}

// ─── Matrix runner ────────────────────────────────────────────────────────────

// Run API-only tests (no page fixture needed)
test.use({ storageState: undefined as unknown as Parameters<typeof test.use>[0]['storageState'] })

const findings: string[] = []
const failedDomains: string[] = []

function matrixDescribe(providerType: string, domains: string[]) {
  test.describe(`${providerType} — ${domains.length} Unterarten`, () => {
    // Onboarding/login are rate-limited (no internal-key bypass, B6220-001): retries may take minutes.
    test.setTimeout(600_000)
    for (const domain of domains) {
      test(`${providerType}/${domain} — Onboarding → Login → Item → Shop-Check`, async () => {
        const uuid = Math.random().toString(16).slice(2, 8)
        const email = e2eEmail(`MATRIX-${domain}`, 'pundo.com')
        const tracker = new TestDataTracker()

        try {
          // Step 1–3: Onboard + Login
          const { ownerId: id, shopId, token } = await onboardShopOwner(email, providerType, domain)
          tracker.owner(id)
          tracker.shop(shopId)

          // Step 4: Create minimal item (skip if no categories in test DB — studio mode)
          const categoryId = await getFirstCategoryId()
          const itemId = await createItem(token, categoryId, domain, uuid)
          if (itemId !== null) tracker.item(itemId)
          if (itemId === null) {
            findings.push(`WARN: ${providerType}/${domain} — item creation skipped (no categories in test DB)`)
          }

          // Step 5: GET /shops/<shop_id> → assert shop exists
          // Note: provider_type is stored in DB but not exposed via public API response
          const shopRes = await fetch(`${BACKEND_URL}/api/v1/shops/${shopId}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(15_000),
          })
          expect(shopRes.status).toBe(200)
          const shop = await shopRes.json()
          expect(shop.id).toBe(shopId)

          findings.push(`PASS: ${providerType}/${domain}`)
        } catch (err) {
          failedDomains.push(`${providerType}/${domain}: ${err}`)
          throw err
        } finally {
          // Step 6: Cleanup (B8950-012): Admin-Shop-Delete kaskadiert Owner, Listings und exklusive Items
          await tracker.cleanup()
        }
      })
    }
  })
}

matrixDescribe('handwerker', MATRIX.handwerker)
matrixDescribe('dienstleister', MATRIX.dienstleister)
matrixDescribe('haendler', MATRIX.haendler)
matrixDescribe('gastro', MATRIX.gastro)

// Write report after all matrix tests
test.afterAll(async () => {
  const reportDir = path.join(__dirname, 'reports')
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })
  const date = new Date().toISOString().slice(0, 10)
  const passed = findings.length
  const failed = failedDomains.length
  const total = passed + failed
  const report = [
    `# Journey Report: shop-type-api-matrix (${date})`,
    '',
    `**Total:** ${total} | **Pass:** ${passed} | **Fail:** ${failed}`,
    '',
    '## Results',
    ...findings.map(f => `- ✓ ${f}`),
    ...(failedDomains.length > 0 ? ['', '## Failures', ...failedDomains.map(f => `- ✗ ${f}`)] : []),
  ].join('\n')
  fs.writeFileSync(path.join(reportDir, `shop-type-api-matrix-${date}.md`), report)
})
