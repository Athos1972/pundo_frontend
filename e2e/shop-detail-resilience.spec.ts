/**
 * B5900-005 — Resilienz-Test: Shop-Detailseite darf bei unvollständigen
 * Produktionsdaten nicht mit 5xx crashen (AC-4/AC-5).
 *
 * Ursprünglich betroffene Slugs (aus 01-design.md):
 *   - artemis-718512059
 *   - tailors-house-2f8fe1ed
 *   - carbatteries-cyprus-0339f051
 *   - the-best-thai-massage-76e5193b
 *
 * `pundo_test` enthält Prod-Daten (via sync_prod_to_test.sh) — KEIN DB-Reset,
 * keine Testdaten anlegen (Memory-Regel). Falls die 4 Slugs nach dem letzten
 * Sync fehlen, wird defensiv geloggt/übersprungen statt hart zu failen — die
 * eigentliche Aussagekraft liefert der zusätzliche Stichproben-Test unten,
 * der eine Zufallsauswahl echter Shop-Slugs aus der Sitemap zieht.
 *
 * Ports: Frontend 3500 · Backend 8500 — NIEMALS 3000/8000.
 */

import { test, expect, type Page } from '@playwright/test'

const FRONTEND_URL = process.env.FRONTEND_URL ?? process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? process.env.TEST_BACKEND_URL ?? 'http://localhost:8500'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-detail-resilience] Safety: NIEMALS gegen Produktiv-Ports 3000/8000 testen!')
}

const KNOWN_AFFECTED_SLUGS = [
  'artemis-718512059',
  'tailors-house-2f8fe1ed',
  'carbatteries-cyprus-0339f051',
  'the-best-thai-massage-76e5193b',
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

/** Zieht eine Stichprobe von Shop-Slugs aus der Sitemap (Fallback laut AC-4, falls die 4 bekannten Slugs fehlen). */
async function sampleSlugsFromSitemap(limit: number): Promise<string[]> {
  try {
    const res = await fetch(`${FRONTEND_URL}/sitemap-shops.xml`, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return []
    const xml = await res.text()
    const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    const slugs = matches
      .map((url) => url.match(/\/shops\/([^/<]+)$/)?.[1])
      .filter((s): s is string => Boolean(s))
    // Deterministische, aber gestreute Stichprobe statt reinem Zufall (Reproduzierbarkeit im CI-Log)
    const step = Math.max(1, Math.floor(slugs.length / limit))
    const sample: string[] = []
    for (let i = 0; i < slugs.length && sample.length < limit; i += step) {
      sample.push(slugs[i])
    }
    return sample
  } catch {
    return []
  }
}

async function expectShopPageHealthy(page: Page, slug: string) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => {
    pageErrors.push(err.message)
  })

  const response = await page.goto(`${FRONTEND_URL}/en/shops/${slug}`, { waitUntil: 'domcontentloaded' })

  expect(response, `Keine Response für /en/shops/${slug}`).not.toBeNull()
  expect(
    response!.status(),
    `/en/shops/${slug} lieferte HTTP ${response!.status()} (erwartet: 200)`
  ).toBe(200)

  const h1 = page.locator('h1').first()
  await expect(h1, `Kein sichtbares <h1> auf /en/shops/${slug}`).toBeVisible({ timeout: 10_000 })

  expect(pageErrors, `Unerwartete Client-Fehler auf /en/shops/${slug}: ${pageErrors.join('; ')}`).toEqual([])
  expect(
    consoleErrors,
    `Unerwartete console.error-Ausgaben auf /en/shops/${slug}: ${consoleErrors.join('; ')}`
  ).toEqual([])
}

test.describe('Shop-Detail Resilienz (B5900-005)', () => {
  for (const slug of KNOWN_AFFECTED_SLUGS) {
    test(`ehemals betroffener Slug lädt ohne 5xx: ${slug}`, async ({ page }) => {
      if (!(await slugExists(slug))) {
        test.skip(true, `Slug ${slug} existiert nicht (mehr) in pundo_test — nach Sync ggf. entfernt/umbenannt.`)
        return
      }
      await expectShopPageHealthy(page, slug)
    })
  }

  test('Stichprobe echter Shop-Slugs aus der Sitemap lädt ohne 5xx', async ({ page }) => {
    const sample = await sampleSlugsFromSitemap(8)
    test.skip(sample.length === 0, 'Sitemap lieferte keine Shop-Slugs (Backend/Sitemap evtl. nicht erreichbar).')
    for (const slug of sample) {
      await expectShopPageHealthy(page, slug)
    }
  })
})
