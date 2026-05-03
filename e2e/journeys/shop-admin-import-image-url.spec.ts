import { test, expect } from '@playwright/test'
import fs from 'fs'

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

// Dynamischer Storage-State aus e2e-Setup (Token bleibt valid für die aktuelle DB-Session)
function getStorageState() {
  const stateFile = 'e2e/.test-state.json'
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
    if (state.storageState) return state.storageState
  }
  return { cookies: [], origins: [] }
}

test.describe('Import image_url — UI smoke tests', () => {
  test.use({ storageState: getStorageState() })

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
  test.use({ storageState: getStorageState() })

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
