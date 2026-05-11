import { test, expect } from '@playwright/test'
import type { BrowserContextOptions } from '@playwright/test'
import fs from 'fs'
import path from 'path'

type StorageState = NonNullable<BrowserContextOptions['storageState']>

// Load fresh shop_owner_token from global-setup state (avoids expired hardcoded JWTs)
function loadStorageState(): StorageState {
  const stateFile = path.join(__dirname, '..', '.test-state.json')
  if (!fs.existsSync(stateFile)) return { cookies: [], origins: [] }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) as { storageState?: StorageState }
  return state.storageState ?? { cookies: [], origins: [] }
}

test.describe('Import Page — Feature AC Verification', () => {
  test.use({ storageState: loadStorageState() })

  test('AC-4: file input has accept=".xlsx,.xls,.csv"', async ({ page }) => {
    await page.goto('/shop-admin/import')
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
    const accept = await fileInput.getAttribute('accept')
    expect(accept).toBe('.xlsx,.xls,.csv')
  })

  test('AC-6: FieldCatalog section is visible and open by default', async ({ page }) => {
    await page.goto('/shop-admin/import')
    // details element open
    const details = page.locator('details')
    await expect(details).toBeAttached()
    const isOpen = await details.evaluate((el: HTMLDetailsElement) => el.open)
    expect(isOpen).toBe(true)
    // Field names visible
    await expect(page.getByText('Field reference')).toBeVisible()
    await expect(page.locator('code', { hasText: 'name' }).first()).toBeVisible()
    await expect(page.locator('code', { hasText: 'category' }).first()).toBeVisible()
    await expect(page.locator('code', { hasText: 'available' }).first()).toBeVisible()
  })

  test('AC-8: template download button visible with correct href and download attribute', async ({ page }) => {
    await page.goto('/shop-admin/import')
    // Find the <a> element with download template text
    const downloadLink = page.locator('a[download]', { hasText: 'Download template' })
    await expect(downloadLink).toBeVisible()
    const href = await downloadLink.getAttribute('href')
    const hasDownload = await downloadLink.evaluate((el) => el.hasAttribute('download'))
    expect(href).toBe('/api/shop-admin/import/template')
    expect(hasDownload).toBe(true)
  })

  test('AC-7: Arabic RTL — code elements have dir=ltr', async ({ page }) => {
    // Set language to Arabic via cookie
    await page.context().addCookies([{ name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
    await page.goto('/shop-admin/import')
    // All code elements should have dir="ltr"
    const codeElements = page.locator('code')
    const count = await codeElements.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const dir = await codeElements.nth(i).getAttribute('dir')
      expect(dir).toBe('ltr')
    }
  })

  test('AC-7: Arabic RTL — FieldCatalog title in Arabic', async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
    await page.goto('/shop-admin/import')
    await expect(page.getByText('دليل الحقول')).toBeVisible()
  })

  test('AC-6/AC-7: Hebrew FieldCatalog title', async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'he', domain: '127.0.0.1', path: '/' }])
    await page.goto('/shop-admin/import')
    await expect(page.getByText('מדריך שדות')).toBeVisible()
  })
})
