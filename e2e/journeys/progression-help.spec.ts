import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { BASE_URL } from '../env'

const fixtures = path.join(__dirname, '..', 'fixtures', 'contracts', 'progression-help')

function helpFixture(brand: 'pundo' | 'naidivse') {
  return JSON.parse(fs.readFileSync(path.join(fixtures, `help_${brand}.json`), 'utf8')) as {
    status: number; headers: Record<string, string>; body: unknown; backend_worktree_dirty: boolean
  }
}

test('F3900 help fixtures are safe dirty 8500 recordings for both brands', async () => {
  for (const brand of ['pundo', 'naidivse'] as const) {
    const fixture = helpFixture(brand)
    expect(fixture.status).toBe(200)
    expect(fixture.backend_worktree_dirty).toBe(true)
    expect(JSON.stringify(fixture.body)).not.toContain('@')
    expect(fixture.body).toMatchObject({ brand })
  }
})

test('F3900 cost-preview help uses the recorded contract and captures light and RTL', async ({ page }, testInfo) => {
  await page.route('**/api/customer/customer/progression/help?*', async route => {
    const brand = route.request().url().includes('brand=naidivse') ? 'naidivse' : 'pundo'
    const fixture = helpFixture(brand)
    await route.fulfill({ status: fixture.status, headers: fixture.headers, contentType: 'application/json', body: JSON.stringify(fixture.body) })
  })
  await page.goto(`${BASE_URL}/en`)
  await expect(page.locator('body')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('progression-help-light.png'), fullPage: true })
  await page.goto(`${BASE_URL}/ar`)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.screenshot({ path: testInfo.outputPath('progression-help-rtl.png'), fullPage: true })
})
