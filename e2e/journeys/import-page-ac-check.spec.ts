import { test, expect } from '@playwright/test'

const storageState = {
  cookies: [
    {
      name: 'shop_owner_token',
      value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwic2hvcF9pZCI6MjIxNCwic3RhdHVzIjoiYXBwcm92ZWQiLCJleHAiOjE3Nzc2MjA1MjB9.FhwhkA1dkt2n5vWxZUwMEzgEj-sWxy9ddDjDSMkfWSQ',
      domain: '127.0.0.1',
      path: '/',
      expires: 1777620520,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax' as const,
    },
  ],
  origins: [],
}

test.describe('Import Page — Feature AC Verification', () => {
  test.use({ storageState })

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
