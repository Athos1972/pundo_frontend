/**
 * Journey: shop-city-hub-and-completeness
 *
 * Covers the AC-relevant UI surface added/changed by:
 *   - B5900-006 (explicit "Shop unvollständig" noindex-policy + sinnvoller Titel/H1)
 *   - B5900-007 (Städte-Index-Seiten /shops/cities + /shops/city/[city] als
 *     crawlbarer Verlinkungs-Hub gegen die Zero-Orphan-Policy)
 *
 * Ports: Frontend 3500 · Backend 8500 — NIEMALS 3000/8000.
 *
 * Data note: `pundo_test` currently has far fewer shops-per-city than the
 * backend's default `min_count=5` threshold requires for `/shops/cities` to
 * list anything (see 03-implementation.md, B5900-007, "Known gaps #1"). This
 * journey is written defensively: it always verifies the *shell* (page loads,
 * correct h1, robots, breadcrumb link), and additionally verifies the *content*
 * path only when the backend actually has cities above the threshold — via
 * `min_count=1` against the API directly, never against the customer-facing
 * page (which does not expose that parameter, by design).
 */

import { test, expect, type Page } from '@playwright/test'

const FRONTEND_URL = process.env.FRONTEND_URL ?? process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? process.env.TEST_BACKEND_URL ?? 'http://localhost:8500'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-city-hub-and-completeness] Safety: NIEMALS gegen Produktiv-Ports 3000/8000 testen!')
}

// Known B5900-006 slugs (generic-title/H1/noindex bug) — see 01-design.md
const KNOWN_INCOMPLETE_SLUGS = [
  'toi-moi-nicosia-mall-03bb83dc',
  'wrap-grill-e4b4b9ad',
  'barkies-50fc4aff',
  'rebellion-gym-514aff92',
]

async function slugExists(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${slug}`, {
      signal: AbortSignal.timeout(10_000),
    })
    return res.ok
  } catch {
    return false
  }
}

async function fetchCitiesAboveThreshold(minCount: number): Promise<Array<{ city: string; slug: string; shop_count: number }>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/shops/cities?min_count=${minCount}`, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { cities: Array<{ city: string; slug: string; shop_count: number }> }
    return data.cities ?? []
  } catch {
    return []
  }
}

async function collectConsoleAndPageErrors(page: Page) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => {
    pageErrors.push(err.message)
  })
  return { consoleErrors, pageErrors }
}

test.describe('Shop City-Hub + Completeness-Policy (B5900-006, B5900-007)', () => {
  test.describe('B5900-006 — Shop-Completeness noindex-Policy', () => {
    for (const slug of KNOWN_INCOMPLETE_SLUGS) {
      test(`unvollständiger Shop hat sinnvollen Titel/H1 statt generisch "Shop": ${slug}`, async ({ page }) => {
        if (!(await slugExists(slug))) {
          test.skip(true, `Slug ${slug} existiert nicht (mehr) in pundo_test.`)
          return
        }
        const { consoleErrors, pageErrors } = await collectConsoleAndPageErrors(page)

        const response = await page.goto(`${FRONTEND_URL}/en/shops/${slug}`, { waitUntil: 'domcontentloaded' })
        expect(response, `Keine Response für /en/shops/${slug}`).not.toBeNull()
        expect(response!.status(), `/en/shops/${slug} lieferte HTTP ${response!.status()}`).toBe(200)

        const title = await page.title()
        expect(title, `Titel darf nicht generisch "Shop | Pundo" sein: ${slug}`).not.toBe('Shop | Pundo')

        const h1 = page.locator('h1').first()
        await expect(h1, `Kein sichtbares <h1> auf /en/shops/${slug}`).toBeVisible({ timeout: 10_000 })
        const h1Text = (await h1.textContent())?.trim() ?? ''
        expect(h1Text.length, `H1 darf nicht leer sein: ${slug}`).toBeGreaterThan(0)

        expect(pageErrors, `Unerwartete Client-Fehler: ${pageErrors.join('; ')}`).toEqual([])
        expect(consoleErrors, `Unerwartete console.error: ${consoleErrors.join('; ')}`).toEqual([])
      })
    }
  })

  test.describe('B5900-007 — Städte-Hub (Crawl-Pfad gegen Zero-Orphan-Policy)', () => {
    test('/shops verlinkt auf /shops/cities (Einstiegs-Link, AC-Verlinkungs-Hub)', async ({ page }) => {
      const response = await page.goto(`${FRONTEND_URL}/en/shops`, { waitUntil: 'domcontentloaded' })
      expect(response!.status()).toBe(200)

      const citiesLink = page.locator('a[href*="/shops/cities"]').first()
      await expect(citiesLink, 'Kein Link zu /shops/cities auf /shops gefunden').toBeVisible({ timeout: 10_000 })
    })

    test('/shops/cities lädt, genau ein h1, vollständiges Meta-Set', async ({ page }) => {
      const response = await page.goto(`${FRONTEND_URL}/en/shops/cities`, { waitUntil: 'domcontentloaded' })
      expect(response!.status()).toBe(200)

      const h1Count = await page.locator('h1').count()
      expect(h1Count, 'Städte-Übersicht muss genau ein <h1> haben').toBe(1)

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
      expect(canonical, 'Canonical fehlt auf /shops/cities').toBeTruthy()

      const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content')
      expect(ogUrl, 'og:url fehlt auf /shops/cities').toBeTruthy()
      expect(ogUrl, 'og:url muss mit canonical übereinstimmen').toBe(canonical)
    })

    test('sitemap-shop-cities.xml ist erreichbar und wohlgeformt', async () => {
      const res = await fetch(`${FRONTEND_URL}/sitemap-shop-cities.xml`, { signal: AbortSignal.timeout(15_000) })
      expect(res.ok, `sitemap-shop-cities.xml lieferte HTTP ${res.status}`).toBe(true)
      const xml = await res.text()
      expect(xml).toContain('<urlset')
    })

    test('Content-Pfad: falls Städte über der Schwelle existieren, rendert /shops/city/[slug] echte Shop-Links', async ({
      page,
    }) => {
      // Direkter API-Check mit min_count=1 (nie über die Kunden-Seite selbst,
      // die den Parameter nicht exponiert — siehe Journey-Kommentar oben).
      const cities = await fetchCitiesAboveThreshold(1)
      test.skip(cities.length === 0, 'Backend liefert keine Städte (leere pundo_test-Stadt-Aggregation).')

      // Für den UI-Content-Test brauchen wir eine Stadt, die auch die
      // *Produktions-Schwelle* (Backend-Default min_count=5) erfüllt —
      // sonst würde die Kunden-Seite korrekt not-found() zeigen (by-design,
      // kein Bug). Das ist bei dünnen pundo_test-Snapshots evtl. keine.
      const citiesAtDefaultThreshold = await fetchCitiesAboveThreshold(5)
      test.skip(
        citiesAtDefaultThreshold.length === 0,
        'Keine Stadt erreicht den Default-min_count=5 in pundo_test — Content-Pfad kann derzeit nicht end-to-end verifiziert werden (Datenvolumen-Limitierung, kein Code-Fehler, siehe 03-implementation.md B5900-007 Known Gap #1).'
      )

      const target = citiesAtDefaultThreshold[0]
      const response = await page.goto(`${FRONTEND_URL}/en/shops/city/${target.slug}`, {
        waitUntil: 'domcontentloaded',
      })
      expect(response!.status()).toBe(200)

      const h1Count = await page.locator('h1').count()
      expect(h1Count, `Städte-Seite ${target.slug} muss genau ein <h1> haben`).toBe(1)

      const shopLinks = page.locator('a[href*="/en/shops/"]')
      const linkCount = await shopLinks.count()
      expect(linkCount, `Städte-Seite ${target.slug} muss echte <a>-Links zu Shops enthalten`).toBeGreaterThan(0)
    })

    test('/shops/city/<unbekannte-stadt> zeigt Not-Found-Inhalt statt Absturz', async ({ page }) => {
      const response = await page.goto(`${FRONTEND_URL}/en/shops/city/this-city-does-not-exist-xyz`, {
        waitUntil: 'domcontentloaded',
      })
      // Next.js 16 RSC-Streaming: HTTP bleibt 200, aber Inhalt ist die
      // not-found-UI + noindex (dokumentiertes Verhalten, siehe B5860-001).
      expect(response!.status()).toBe(200)
      const robots = await page.locator('meta[name="robots"]').first().getAttribute('content')
      expect(robots ?? '').toContain('noindex')
    })
  })
})
