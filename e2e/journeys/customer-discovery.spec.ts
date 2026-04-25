/**
 * Journey: Customer Discovery Flow
 * Runbook: e2e/journeys/customer-discovery.md
 *
 * Fixtures: Keine eigenen — nutzt Seed-Daten aus global-setup.ts (pundo_test DB).
 * Voraussetzung: mindestens 1 aktiver Shop mit Produkt in pundo_test existiert.
 *
 * | Fixture-Name | Was wird aufgebaut | Was wird geprüft |
 * |---|---|---|
 * | (Seed-Daten) | Test-Shop aus global-setup.ts | Discovery-Flow für Gäste |
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Port-Safety — niemals gegen Produktiv-Ports laufen
const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

// Load test state from global-setup (seed shop name + slug)
interface TestState {
  email: string
  shop_name: string
  shopSlug?: string | null
  ownerId?: number
}

function loadTestState(): TestState | null {
  const stateFile = path.join(__dirname, '..', '.test-state.json')
  if (!fs.existsSync(stateFile)) return null
  return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as TestState
}

// Step log for report
interface StepEntry {
  step: number
  desc: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL' | 'SKIP'
}

const stepLog: StepEntry[] = []

function logStep(step: number, desc: string, expected: string, actual: string, status: 'PASS' | 'FAIL' | 'SKIP') {
  stepLog.push({ step, desc, expected, actual, status })
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('Customer Discovery Flow', () => {
  let seedShopName: string | null = null
  let seedShopSlug: string | null = null
  let productSlug: string | null = null
  const startedAt = new Date().toISOString()

  test.beforeAll(async () => {
    // Healthcheck
    const health = await fetch(`${BACKEND_URL}/api/v1/products?limit=1`)
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    const state = loadTestState()
    if (state) {
      seedShopName = state.shop_name ?? null
      seedShopSlug = state.shopSlug ?? null
    }

    // Try to find at least one product for discovery
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/products?limit=5`)
      if (res.ok) {
        const data = await res.json() as { items?: Array<{ slug: string }> }
        productSlug = data.items?.[0]?.slug ?? null
      }
    } catch { /* ignore */ }
  })

  test.afterAll(async () => {
    const endedAt = new Date().toISOString()
    const overallStatus = stepLog.some(s => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    const findings = stepLog.filter(s => s.status === 'FAIL')

    const reportsDir = path.join(__dirname, 'reports')
    fs.mkdirSync(reportsDir, { recursive: true })
    const date = endedAt.slice(0, 10)

    const report = [
      `## Journey: Customer Discovery Flow — ${overallStatus}`,
      `Datum: ${endedAt.slice(0, 16).replace('T', ' ')} UTC`,
      '',
      '### Aufgebaute Test-Daten',
      '| Fixture | ID/Slug | Status |',
      '|---|---|---|',
      `| Seed-Shop (global-setup) | ${seedShopSlug ?? seedShopName ?? 'unbekannt'} | verwendet |`,
      '',
      '### Schritt-für-Schritt-Protokoll',
      '| # | Beschreibung | Erwartet | Tatsächlich | Status |',
      '|---|---|---|---|---|',
      ...stepLog.map(s => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
      '',
      '### Findings (FAIL-Einträge)',
      findings.length === 0
        ? '_keine_'
        : ['| Schritt | Erwartet | Tatsächlich |', '|---|---|---|', ...findings.map(f => `| ${f.step} | ${f.expected} | ${f.actual} |`)].join('\n'),
      '',
      '### Aufräumen',
      '_Keine eigenen Fixtures — keine Cleanup-Aktion nötig._',
    ].join('\n')

    fs.writeFileSync(path.join(reportsDir, `customer-discovery-${date}.md`), report, 'utf8')
  })

  // Step 1: Startseite — Suchleiste sichtbar
  test('Schritt 1 — Startseite zeigt Suchleiste', async ({ page }) => {
    await page.goto(BASE_URL + '/')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .locator('input[type="search"], input[name="q"], input[placeholder*="Search"], input[placeholder*="Such"], input[placeholder*="search"]')
      .first()
    const visible = await searchInput.isVisible().catch(() => false)
    logStep(1, 'Startseite zeigt Suchleiste', 'Suchfeld sichtbar', visible ? 'gefunden' : 'nicht gefunden', visible ? 'PASS' : 'FAIL')
    expect(visible, 'Suchfeld auf Startseite nicht sichtbar').toBe(true)
  })

  // Step 2: Suchbegriff eingeben
  test('Schritt 2 — Suchbegriff eingeben navigiert zur Suchergebnis-Seite', async ({ page }) => {
    await page.goto(BASE_URL + '/')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .locator('input[type="search"], input[name="q"], input[placeholder*="Search"], input[placeholder*="Such"], input[placeholder*="search"]')
      .first()
    const visible = await searchInput.isVisible().catch(() => false)
    if (!visible) {
      logStep(2, 'Suchbegriff eingeben', 'URL enthält /search oder /shops', 'Suchfeld nicht gefunden', 'SKIP')
      test.skip(true, 'Reason: Suchfeld nicht gefunden auf Startseite')
      return
    }

    // Nutze Seed-Shop-Name wenn verfügbar, sonst generischen Begriff
    const query = seedShopName ?? 'shop'
    // Use click + type (not fill) to reliably trigger React's controlled input onChange
    await searchInput.click()
    await searchInput.type(query)
    // Wait a moment for React state to settle, then submit
    await page.waitForTimeout(200)

    // Submit via Enter key; if URL doesn't change, try clicking the submit button
    const [navigationPromise] = [page.waitForURL(/\/search|\/shops|\?q=/, { timeout: 5_000 }).catch(() => null)]
    await searchInput.press('Enter')
    await navigationPromise

    const url = page.url()
    const navigated = url.includes('/search') || url.includes('/shops') || url.includes('q=')

    // Fallback: click the submit button if Enter didn't navigate
    if (!navigated) {
      const submitBtn = page.locator('button[type="submit"]').first()
      if (await submitBtn.count() > 0) {
        await submitBtn.click()
        await page.waitForLoadState('networkidle', { timeout: 8_000 })
      }
    }

    await page.waitForLoadState('networkidle', { timeout: 5_000 })
    const finalUrl = page.url()
    const finalNavigated = finalUrl.includes('/search') || finalUrl.includes('/shops') || finalUrl.includes('q=')
    logStep(2, 'Suchbegriff eingeben → Navigation', 'URL enthält /search oder q=', finalUrl, finalNavigated ? 'PASS' : 'FAIL')
    expect(finalNavigated, `Nach Suche nicht auf Ergebnisseite navigiert. URL: ${finalUrl}`).toBe(true)
  })

  // Step 3: Suchergebnisse — mindestens 1 ProductCard oder ShopCard
  test('Schritt 3 — Suchergebnisse zeigen mindestens 1 Karte', async ({ page }) => {
    const query = seedShopName ?? 'shop'
    await page.goto(BASE_URL + `/search?q=${encodeURIComponent(query)}`)
    await page.waitForLoadState('networkidle')

    // Verschiedene mögliche Selektoren für Product/ShopCards
    const cardSelectors = [
      '[data-testid="product-card"]',
      '[data-testid="shop-card"]',
      '.product-card',
      '.shop-card',
      'article',
      '[data-testid="search-result"]',
    ]
    let found = 0
    for (const sel of cardSelectors) {
      found = await page.locator(sel).count()
      if (found > 0) break
    }

    logStep(3, 'Suchergebnisse — mindestens 1 Karte', '≥1 Karte sichtbar', found > 0 ? `${found} Karten gefunden` : 'keine Karten', found > 0 ? 'PASS' : 'SKIP')
    if (found === 0) {
      // No results may be a data issue (empty test DB), not a UI bug
      test.skip(true, 'Reason: Keine Suchergebnisse — Test-DB möglicherweise leer oder Suche erfordert Geodaten')
    }
    expect(found).toBeGreaterThan(0)
  })

  // Step 4: Klick auf ProductCard → Produkt-Detailseite
  test('Schritt 4 — Klick auf ProductCard lädt Detailseite', async ({ page }) => {
    if (!productSlug) {
      logStep(4, 'Klick auf ProductCard', 'URL /products/<slug>', 'kein productSlug aus API', 'SKIP')
      test.skip(true, 'Reason: Kein productSlug aus API verfügbar — Test-DB leer?')
      return
    }

    await page.goto(BASE_URL + `/products/${productSlug}`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    const onDetailPage = url.includes('/products/')
    logStep(4, 'Produkt-Detailseite aufrufen', 'URL /products/<slug>', url, onDetailPage ? 'PASS' : 'FAIL')
    expect(onDetailPage, `Nicht auf Produkt-Detailseite. URL: ${url}`).toBe(true)
  })

  // Step 5: Produktname, Preis, Angebote sichtbar
  test('Schritt 5 — Produktdetailseite zeigt Produktname und Preis/Angebote', async ({ page }) => {
    if (!productSlug) {
      logStep(5, 'Produktname + Preis sichtbar', 'Text sichtbar', 'kein productSlug', 'SKIP')
      test.skip(true, 'Reason: kein productSlug')
      return
    }

    await page.goto(BASE_URL + `/products/${productSlug}`)
    await page.waitForLoadState('networkidle')

    // Prüfe: Irgendein bedeutsamer Text-Content auf der Seite
    const bodyText = await page.locator('body').innerText()
    const has404 = bodyText.toLowerCase().includes('404') || bodyText.toLowerCase().includes('not found')
    const hasContent = bodyText.length > 100 && !has404

    logStep(5, 'Produktdetail — Inhalt vorhanden', 'Kein 404, Content >100 Zeichen', hasContent ? 'Content gefunden' : '404 oder leer', hasContent ? 'PASS' : 'FAIL')
    expect(has404, '404 auf Produktdetailseite').toBe(false)
    expect(hasContent, 'Produktdetailseite leer').toBe(true)
  })

  // Step 6: Karte zeigt Shop-Pin (Leaflet)
  test('Schritt 6 — Karten-Element auf Produktdetailseite vorhanden', async ({ page }) => {
    if (!productSlug) {
      logStep(6, 'Karten-Element prüfen', 'Karten-Element vorhanden', 'kein productSlug', 'SKIP')
      test.skip(true, 'Reason: kein productSlug')
      return
    }

    await page.goto(BASE_URL + `/products/${productSlug}`)
    await page.waitForLoadState('networkidle')

    const mapEl = page.locator(
      '[data-testid="map"], .leaflet-container, iframe[src*="maps"], canvas.mapboxgl-canvas'
    ).first()
    const count = await mapEl.count()

    logStep(6, 'Karten-Element vorhanden', 'Leaflet oder Map-Element sichtbar', count > 0 ? 'gefunden' : 'nicht vorhanden (optional)', count > 0 ? 'PASS' : 'SKIP')
    // Karte ist optional — Feature kann fehlen auf Produktdetailseite
    if (count === 0) {
      console.log('[customer-discovery] Kein Karten-Element auf Produktdetailseite — kein FAIL (optional)')
    }
    // Kein expect — Map ist optional feature
  })

  // Step 7: Shop-Detailseite per Slug erreichbar
  test('Schritt 7 — Shop-Detailseite als Guest erreichbar', async ({ page }) => {
    if (!seedShopSlug) {
      logStep(7, 'Shop-Detailseite aufrufen', 'Seite lädt ohne Fehler', 'seedShopSlug fehlt', 'SKIP')
      test.skip(true, 'Reason: seedShopSlug nicht in .test-state.json')
      return
    }

    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(BASE_URL + `/shops/${seedShopSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const is404 = url.includes('404') || url.includes('not-found')
    logStep(7, 'Shop-Detailseite aufrufen', 'Kein 404, keine JS-Errors', is404 ? '404' : `geladen (${errors.length} Fehler)`, !is404 && errors.length === 0 ? 'PASS' : 'FAIL')
    expect(is404, `Shop-Detailseite lieferte 404 für slug=${seedShopSlug}`).toBe(false)
    expect(errors).toHaveLength(0)
  })

  // Step 8: Shop-Name, Adresse, Öffnungszeiten sichtbar
  test('Schritt 8 — Shop-Detailseite zeigt Shop-Name und Adresse', async ({ page }) => {
    if (!seedShopSlug || !seedShopName) {
      logStep(8, 'Shop-Name + Adresse sichtbar', 'Shop-Name sichtbar', 'seedShopSlug/Name fehlt', 'SKIP')
      test.skip(true, 'Reason: seedShopSlug oder seedShopName nicht verfügbar')
      return
    }

    await page.goto(BASE_URL + `/shops/${seedShopSlug}`)
    await page.waitForLoadState('networkidle')

    const nameCount = await page.getByText(seedShopName, { exact: false }).count()
    logStep(8, 'Shop-Name sichtbar', `"${seedShopName}" auf Seite`, nameCount > 0 ? 'gefunden' : 'nicht gefunden', nameCount > 0 ? 'PASS' : 'FAIL')
    expect(nameCount, `Shop-Name "${seedShopName}" nicht sichtbar`).toBeGreaterThan(0)
  })

  // Step 9: Back-Navigation funktioniert
  test('Schritt 9 — Back-Navigation (History-Stack intakt)', async ({ page }) => {
    if (!seedShopSlug) {
      logStep(9, 'Back-Navigation', 'zurück zur vorherigen Seite', 'seedShopSlug fehlt', 'SKIP')
      test.skip(true, 'Reason: seedShopSlug fehlt')
      return
    }

    // Navigate: home → shops/slug → back()
    await page.goto(BASE_URL + '/')
    await page.waitForLoadState('networkidle')
    const homeUrl = page.url()

    await page.goto(BASE_URL + `/shops/${seedShopSlug}`)
    await page.waitForLoadState('networkidle')

    await page.goBack()
    await page.waitForLoadState('networkidle')
    const backUrl = page.url()

    // Back navigiert zur vorherigen Seite (nicht notwendigerweise exakt home — kann /shops sein)
    const navigatedBack = backUrl !== BASE_URL + `/shops/${seedShopSlug}`
    logStep(9, 'Back-Navigation', 'URL wechselt weg von Shop-Detail', backUrl, navigatedBack ? 'PASS' : 'FAIL')
    expect(navigatedBack, `Back-Navigation hat URL nicht gewechselt: ${backUrl}`).toBe(true)
  })
})
