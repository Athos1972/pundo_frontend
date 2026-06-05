/**
 * Journey: customer-shop-all-products-flow
 * Regression guard for B5900-004.
 *
 * Fixtures:
 * ┌─────────────────────────┬────────────────────────────────────────────┐
 * │ Fixture                 │ Zweck                                      │
 * ├─────────────────────────┼────────────────────────────────────────────┤
 * │ manjo-pet-087d8709      │ Realer Shop mit 1596 Produkten (pundo_test)│
 * │ shop_id=75              │ Numerische ID für API-Query                │
 * └─────────────────────────┴────────────────────────────────────────────┘
 *
 * Port-Konvention: Frontend 3500, Backend 8500 (pundo_test).
 */

import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3500'
const SHOP_SLUG = 'manjo-pet-087d8709'
const SHOP_ID = 75
const BACKEND_URL = 'http://localhost:8500'

// ─── Fixture pre-check ────────────────────────────────────────────────────────

test.beforeAll(async () => {
  const res = await fetch(`${BACKEND_URL}/api/v1/products?shop_id=${SHOP_ID}&limit=1`)
  if (!res.ok) {
    test.skip() // Backend nicht erreichbar — kein FAIL
    return
  }
  const data = await res.json() as { total?: number }
  if (!data.total || data.total < 1) {
    test.skip() // Fixture-Defekt: Shop hat keine Produkte — sync_prod_to_test.sh ausführen
  }
})

// ─── Report state ────────────────────────────────────────────────────────────

interface StepResult {
  step: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  note?: string
}
const steps: StepResult[] = []

function logStep(step: string, expected: string, actual: string, status: 'PASS' | 'FAIL' | 'SKIP', note?: string) {
  steps.push({ step, expected, actual, status, note })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('customer-shop-all-products-flow (B5900-004)', () => {

  test('A — Shop-Detail-Seite lädt korrekt', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/en/shops/${SHOP_SLUG}`)
    const status = res?.status() ?? 0

    if (status === 200) {
      logStep('A1 HTTP-Status', '200', String(status), 'PASS')
    } else {
      logStep('A1 HTTP-Status', '200', String(status), 'FAIL', 'Shop-Seite nicht erreichbar')
    }
    expect(status).toBe(200)

    // H1 enthält Shop-Name
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
    const h1Text = await h1.textContent()
    const h1HasName = (h1Text ?? '').length > 0
    logStep('A2 H1 Shop-Name', 'Nicht leer', h1Text ?? '', h1HasName ? 'PASS' : 'FAIL')
    expect(h1HasName).toBe(true)

    // Keine JS-Konsolenfehler sammeln
    const jsErrors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') jsErrors.push(msg.text()) })
    await page.waitForLoadState('networkidle')
    const criticalErrors = jsErrors.filter(e => !e.includes('favicon') && !e.includes('ERR_ABORTED'))
    logStep('A3 Keine JS-Errors', '0 kritische Errors', String(criticalErrors.length), criticalErrors.length === 0 ? 'PASS' : 'FAIL', criticalErrors.join(' | ') || undefined)
  })

  test('B — Top-Products-Sektion + Alle-Link', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/shops/${SHOP_SLUG}`)
    await page.waitForLoadState('networkidle')

    // Mindestens 1 ProductCard in der Seite
    // Backend liefert top 12 Produkte via searchProducts({shop_id, limit:12})
    const productLinks = page.locator('a[href^="/en/products/"]')
    const productCount = await productLinks.count()
    logStep('B1 Top-Products sichtbar', '≥1 Produkt-Link', String(productCount), productCount >= 1 ? 'PASS' : 'FAIL')
    expect(productCount).toBeGreaterThanOrEqual(1)

    // "Alle"-Link existiert mit korrektem href
    const alleLink = page.locator(`a[href*="search?shop_id=${SHOP_ID}"]`)
    await expect(alleLink).toBeVisible()
    const alleHref = await alleLink.getAttribute('href')
    logStep('B2 Alle-Link href', `/en/search?shop_id=${SHOP_ID}`, alleHref ?? '', alleHref?.includes(`shop_id=${SHOP_ID}`) ? 'PASS' : 'FAIL')
    expect(alleHref).toContain(`shop_id=${SHOP_ID}`)

    // B5900-004: Link-Text darf NICHT hartcodiert Deutsch "Alle" sein wenn Sprache EN
    const alleText = (await alleLink.textContent())?.trim() ?? ''
    const isNotHardcodedDe = alleText !== 'Alle →' && alleText !== 'Alle'
    logStep('B3 Link-Text I18n (EN)', 'Text ≠ "Alle"', alleText, isNotHardcodedDe ? 'PASS' : 'FAIL', isNotHardcodedDe ? undefined : 'Hartcodierter DE-Text in EN-Seite')
    expect(isNotHardcodedDe, `"Alle →" ist hartcodiert Deutsch — I18n-Fix fehlt. Aktuell: "${alleText}"`).toBe(true)

    // EN-Seite: Text sollte "All" enthalten
    const isEnText = alleText.toLowerCase().startsWith('all')
    logStep('B4 Link-Text EN = "All →"', '"All →"', alleText, isEnText ? 'PASS' : 'FAIL')
    expect(isEnText, `Erwartet "All →", erhalten "${alleText}"`).toBe(true)
  })

  test('B5 — Alle-Link übersetzt auf DE-Seite', async ({ page }) => {
    await page.goto(`${BASE_URL}/de/shops/${SHOP_SLUG}`)
    await page.waitForLoadState('networkidle')

    const alleLink = page.locator(`a[href*="search?shop_id=${SHOP_ID}"]`)
    await expect(alleLink).toBeVisible()
    const alleText = (await alleLink.textContent())?.trim() ?? ''
    // Auf DE-Seite ist "Alle →" die korrekte Übersetzung
    const isDeText = alleText.startsWith('Alle')
    logStep('B5 Link-Text DE = "Alle →"', '"Alle →"', alleText, isDeText ? 'PASS' : 'FAIL')
    expect(isDeText, `Erwartet "Alle →" auf DE, erhalten "${alleText}"`).toBe(true)
  })

  test('C1 — Klick auf Alle-Link zeigt Produkte (Kern-Regression B5900-004)', async ({ page }) => {
    // Desktop-Viewport: vermeidet SearchMapBottomSheet-Überlagerung auf Mobile,
    // sodass Produktkarten im sichtbaren 55%-Panel des Desktop-Layouts erscheinen.
    await page.setViewportSize({ width: 1280, height: 900 })

    // Intercepte API-Calls um zu prüfen ob searchProducts mit shop_id aufgerufen wird
    const apiCalls: string[] = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('/api/v1/')) apiCalls.push(url)
    })

    await page.goto(`${BASE_URL}/en/shops/${SHOP_SLUG}`)
    await page.waitForLoadState('networkidle')

    // Klick auf "All →" Link
    const alleLink = page.locator(`a[href*="search?shop_id=${SHOP_ID}"]`)
    await alleLink.click()

    // URL muss auf /search?shop_id=75 zeigen
    await page.waitForURL(`**search?shop_id=${SHOP_ID}**`)
    const currentUrl = page.url()
    logStep('C1a Navigation', `/en/search?shop_id=${SHOP_ID}`, currentUrl, currentUrl.includes(`shop_id=${SHOP_ID}`) ? 'PASS' : 'FAIL')
    expect(currentUrl).toContain(`shop_id=${SHOP_ID}`)

    // Warte auf API-Response (Produkte laden)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500) // SearchContent braucht kurz für shop_id-Mode

    // HAUPT-ASSERTION (war vor Fix immer leer):
    // Mindestens 1 Produkt-Link muss sichtbar sein.
    // :visible filtert den mobilen Panel (md:hidden, display:none bei 1280px) aus —
    // sonst trifft der Selektor die DOM-ersten Links im hidden mobile sheet.
    const productLinks = page.locator('a[href^="/en/products/"]:visible')
    await expect(productLinks.first()).toBeVisible({ timeout: 10000 })
    const count = await productLinks.count()
    logStep('C1b Produkte sichtbar', '≥1 Produkt-Link', String(count), count >= 1 ? 'PASS' : 'FAIL', count === 0 ? 'B5900-004 REGRESSION: SearchContent ignoriert shop_id' : undefined)
    expect(count, 'REGRESSION B5900-004: Keine Produkte bei ?shop_id=75').toBeGreaterThanOrEqual(1)

    // API-Calls: /api/v1/products?shop_id=75 muss aufgerufen worden sein
    const shopIdCall = apiCalls.find(u => u.includes('products') && u.includes(`shop_id=${SHOP_ID}`))
    logStep('C1c API shop_id-Request', `/api/v1/products?shop_id=${SHOP_ID}`, shopIdCall ?? 'nicht gefunden', shopIdCall ? 'PASS' : 'FAIL')
    expect(shopIdCall, 'searchProducts mit shop_id wurde nicht aufgerufen').toBeTruthy()
  })

  test('C2 — searchAll wird NICHT aufgerufen im shop_id-Modus', async ({ page }) => {
    const searchAllCalls: string[] = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('/api/v1/search')) searchAllCalls.push(url)
    })

    await page.goto(`${BASE_URL}/en/search?shop_id=${SHOP_ID}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const noSearchAll = searchAllCalls.length === 0
    logStep('C2 searchAll nicht aufgerufen', '0 /search Calls', String(searchAllCalls.length), noSearchAll ? 'PASS' : 'FAIL', noSearchAll ? undefined : `searchAll-Calls: ${searchAllCalls.join(', ')}`)
    expect(searchAllCalls).toHaveLength(0)
  })

  test('D — Keine Regression: category_id-Modus weiterhin funktional', async ({ page }) => {
    // Sicherstellen dass der Guard-Fix den category-Modus nicht gebrochen hat
    const productCalls: string[] = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('/api/v1/products') && url.includes('category_id')) productCalls.push(url)
    })

    // Kategorie 1 existiert (Hunde)
    await page.goto(`${BASE_URL}/en/search?category_id=1`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const categoryCall = productCalls.find(u => u.includes('category_id=1'))
    logStep('D1 category_id-Modus', '/api/v1/products?category_id=1 aufgerufen', categoryCall ?? 'nicht gefunden', categoryCall ? 'PASS' : 'FAIL')
    expect(categoryCall, 'searchProducts mit category_id wurde nicht aufgerufen — Guard-Fix hat Regression').toBeTruthy()
  })

})

// ─── Report schreiben ────────────────────────────────────────────────────────

test.afterAll(async () => {
  const today = new Date().toISOString().slice(0, 10)
  const reportDir = path.join(process.cwd(), 'e2e/journeys/reports')
  const reportFile = path.join(reportDir, `customer-shop-all-products-flow-${today}.md`)

  const pass = steps.filter(s => s.status === 'PASS').length
  const fail = steps.filter(s => s.status === 'FAIL').length
  const verdict = fail === 0 ? 'PASS' : 'FAIL'

  const rows = steps.map(s =>
    `| ${s.step} | ${s.expected} | ${s.actual} | **${s.status}** |${s.note ? ` ${s.note}` : ''}`
  ).join('\n')

  const content = `# Journey Report: customer-shop-all-products-flow
**Datum:** ${today}
**Verdict:** ${verdict} (${pass}/${steps.length} Steps)
**Bug:** B5900-004 — shop_id-Modus in SearchContent

## Fixtures
| Fixture | Wert |
|---|---|
| Shop-Slug | manjo-pet-087d8709 |
| Shop-ID | ${SHOP_ID} |
| Produkte im Backend | 1596 (pundo_test) |

## Schritt-Protokoll
| Schritt | Erwartet | Tatsächlich | Status |
|---|---|---|---|
${rows}

## Findings
${fail === 0 ? '— Keine Findings. B5900-004 erfolgreich regressionsfrei.' : steps.filter(s => s.status === 'FAIL').map(s => `- **${s.step}:** ${s.note ?? s.actual}`).join('\n')}

## Cleanup
Kein Cleanup nötig — Journey nutzt nur bestehende pundo_test-Daten (read-only).
`

  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(reportFile, content)
})
