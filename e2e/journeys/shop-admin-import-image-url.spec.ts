import { test, expect } from '@playwright/test'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { psql } from './_helpers/test-data'
import { csv, openImport, uploadToPreview, applyToResult, previewRow, uniqName } from './_helpers/import-flow'
import { BACKEND_URL } from '../env'

/**
 * E2E smoke tests for the shop-admin import image_url feature.
 *
 * Tests that don't require a live backend with image URLs:
 *   - AC-1: FieldCatalog shows image_url row
 *   - AC-5: Upload without image_url → no banners
 *   - AC-11: Template download response contains image_url in header
 *
 * Full async-flow test (AC-3/AC-4) is skipped here as it requires a mock
 * HTTP server to serve/reject image downloads. See journey spec for details.
 * Mark: "requires live backend"
 */

// F8950 T16: eigener Spec-Shop statt des globalen Owners aus .test-state.json (= echter Prod-Kopie-Shop 7937
// "happy-pets-nicosia"). Der (derzeit uebersprungene) Async-Flow-Test laedt eine CSV in den Shop des Owners
// hoch; das darf nie in einen Shop der Prod-Kopie schreiben. Die Owner-Session kommt per Impersonation.
let importShop: WorkerShop
// F5920 (AK 16): zweiter Shop, dem die gemeinsamen Katalog-Artikel (mit/ohne Foto) gehoeren
let catalogShop: WorkerShop

test.beforeAll(async () => {
  test.setTimeout(120_000)
  importShop = await specShop('IMPORT-IMAGE-URL')
  catalogShop = await specShop('IMPORT-IMAGE-URL-CAT')
})

test.afterAll(async () => {
  await importShop?.destroy()
  await catalogShop?.destroy()
})

test.beforeEach(async ({ context }) => {
  await context.addCookies(importShop.storageState.cookies)
})

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Import image_url — UI smoke tests', () => {
  test('AC-1: FieldCatalog shows image_url row with Optional badge and example URL', async ({ page }) => {
    await page.goto('/shop-admin/import')

    // Wait for field catalog to appear
    await expect(page.locator('details')).toBeAttached()

    // image_url column name is visible
    const imageUrlCode = page.locator('code', { hasText: 'image_url' }).first()
    await expect(imageUrlCode).toBeVisible()

    // The row has "Optional" badge in the second cell (exact match, not description)
    const row = page.locator('tr').filter({ has: page.locator('code', { hasText: 'image_url' }) })
    await expect(row).toBeVisible()
    await expect(row.locator('td').nth(1)).toHaveText('Optional')

    // Example URL contains example.com
    const exampleCode = row.locator('code[dir="ltr"]').last()
    const exampleText = await exampleCode.textContent()
    expect(exampleText).toContain('example.com')
  })

  test('AC-11: Template download href points to /api/shop-admin/import/template', async ({ page }) => {
    await page.goto('/shop-admin/import')

    const downloadLink = page.locator('a[download]', { hasText: 'Download template' })
    await expect(downloadLink).toBeVisible()

    const href = await downloadLink.getAttribute('href')
    expect(href).toBe('/api/shop-admin/import/template')
  })

  // NOTE: Template xlsx content check (image_url in header) requires a backend call.
  // This test only verifies the link exists. Full template content is covered by T6
  // backend unit tests (TestTemplateImageUrl).

  test('AC-5: Page load shows no pending or error banners (static state)', async ({ page }) => {
    // AC-5 static check: on fresh page load there should be no blue/amber image-download banners.
    // The upload-interaction variant of AC-5 (image_download_pending=0 → no blue banner) is
    // covered by unit tests (ImportPanel.test.tsx). A live-backend upload E2E is in AC-3/AC-4.
    await page.goto('/shop-admin/import')

    // Page renders without image-download banners on initial load
    await expect(page.locator('.bg-blue-50')).not.toBeVisible()
    await expect(page.locator('.bg-amber-50')).not.toBeVisible()

    // File input accepts correct formats
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls,.csv')
  })
})

// ── Async-flow test (requires live backend + mock image server) ──────────────

test.describe('Import image_url — Full async flow', () => {

  test.skip('AC-3 + AC-4: Upload with image_url → pending banner → error banner after poll (requires live backend)', async ({ page }) => {
    /**
     * This test requires:
     * 1. Backend at port 8500 running with the image_url feature deployed
     * 2. A mock HTTP server (e.g. port 9999) that:
     *    - GET /ok.jpg → returns 200 + valid JPEG
     *    - GET /missing.jpg → returns 404
     *
     * Skipped until a test helper (e.g. e2e/helpers/mock-image-server.ts) is available.
     *
     * See specs/2026-04-24-shop-admin-import-image-url/02-architecture.md §6 for full spec.
     */
    await page.goto('/shop-admin/import')

    const csvContent = [
      'name,available,image_url',
      'Product OK,true,http://localhost:9999/ok.jpg',
      'Product Missing,true,http://localhost:9999/missing.jpg',
    ].join('\n')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-with-images.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent, 'utf-8'),
    })

    // Expect pending banner
    await expect(page.locator('.bg-blue-50')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.bg-blue-50')).toContainText('product images are being downloaded')

    // Wait for poll + backend processing (up to 15 s)
    await expect(page.locator('.bg-amber-50')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.bg-amber-50')).toContainText('product images could not be loaded')

    // Open details
    await page.locator('details').last().click()
    await expect(page.locator('li').filter({ hasText: 'http 404' })).toBeVisible()
  })
})

// ── F5920: Vorschau-Schritt + Foto-Schutz bei gemeinsamen Katalog-Artikeln (AK 16) ───────────────────────
// Bild-URL: oeffentliche Google-Logo-PNG (wie shop-admin-import-all-or-nothing); nicht erreichbar -> Test schlaegt fehl.

const IMG = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png'

async function photoCountOf(itemId: number): Promise<number> {
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/items/${itemId}`, { headers: { Authorization: `Bearer ${catalogShop.ownerToken}` } })
  return ((await r.json()) as { photos: unknown[] }).photos.length
}

async function sharedItem(label: string, withPhoto: boolean): Promise<{ id: number; ean: string; name: string }> {
  const ean = '42' + String(Math.floor(Math.random() * 1e11)).padStart(11, '0')
  const name = uniqName(label)
  const cat = Number(psql('select category_id from items where category_id is not null order by random() limit 1'))
  const it = await catalogShop.api<{ id: number; slug: string }>('POST', '/items', { name, name_lang: 'en', category_id: cat, confirmed: true, ean })
  expect(it.status).toBe(201)
  catalogShop.tracker.item(it.json.id, it.json.slug)
  expect((await catalogShop.api('POST', '/shop-listings', { item_id: it.json.id })).status).toBe(201)
  if (withPhoto) await catalogShop.uploadPhoto(it.json.id, 21)
  return { id: it.json.id, ean, name }
}

test.describe('F5920 — Foto-Schutz am gemeinsamen Katalog-Artikel (AK 16) und Vorschau-Schritt', () => {
  test.describe.configure({ mode: 'serial' })

  test('AK16: EAN eines gemeinsamen Artikels MIT Foto + image_url -> kein zusaetzliches Foto, Hinweis in Vorschau und Ergebnis', async ({ page }) => {
    test.setTimeout(120_000)
    const shared = await sharedItem('shared-with-photo', true)
    expect(await photoCountOf(shared.id)).toBe(1)
    await openImport(page, 'en')
    await uploadToPreview(page, 'photo.csv', csv(['name', 'ean', 'image_url'], [[uniqName('own-spelling'), shared.ean, IMG]]))
    // Vorschau-Schritt: Hinweis steht schon vor dem Uebernehmen da, nichts wurde geschrieben
    await expect(previewRow(page, 2)).toContainText('The photo was not added: this catalogue article already has one.')
    await expect(previewRow(page, 2)).toContainText('Recognised by EAN')
    expect(psql(`select count(*) from shop_listings where shop_id=${importShop.id}`)).toBe('0')
    await applyToResult(page)
    await expect(page.getByTestId('import-result')).toContainText('The photo was not added: this catalogue article already has one.')
    await expect(page.getByTestId('import-result')).not.toContainText('product images are being downloaded')
    await page.waitForTimeout(12_000)
    expect(await photoCountOf(shared.id), 'gemeinsamer Artikel darf kein 2. Foto bekommen').toBe(1)
    expect(psql(`select count(*) from item_photos where item_id=${shared.id}`)).toBe('1')
    // der Name des fremden Artikels bleibt unveraendert
    expect(psql(`select names->>'en' from items where id=${shared.id}`)).toBe(shared.name)
  })

  test('AK16b: gemeinsamer Artikel OHNE Foto + image_url -> Foto wird angehaengt (nur wenn noch keins)', async ({ page }) => {
    test.setTimeout(150_000)
    const shared = await sharedItem('shared-no-photo', false)
    expect(await photoCountOf(shared.id)).toBe(0)
    await openImport(page, 'en')
    await uploadToPreview(page, 'photo2.csv', csv(['name', 'ean', 'image_url'], [[uniqName('own-spelling2'), shared.ean, IMG]]))
    await expect(previewRow(page, 2)).not.toContainText('The photo was not added')
    await applyToResult(page)
    await expect(page.getByTestId('import-result')).toContainText('product images are being downloaded')
    await expect.poll(() => photoCountOf(shared.id), { timeout: 60_000, intervals: [2000] }).toBe(1)
  })
})
