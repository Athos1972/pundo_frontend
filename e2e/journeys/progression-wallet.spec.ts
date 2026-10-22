/**
 * F3900 K3: the mocked browser responses below are byte-for-byte bodies from
 * the 8500 recorder under e2e/fixtures/contracts/progression-wallet. The
 * recorder metadata preserves the real response, including its source commit.
 */
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { BACKEND_URL, BASE_URL } from '../env'
import { waitForPageHydrated } from './_helpers/hydration'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: K3 journey tests may only use 3500 and 8500.')
}

const FIXTURES = path.join(__dirname, '..', 'fixtures', 'contracts', 'progression-wallet', 'flag-an')
const RECORDED_COMMIT = '987a56e4baeaf3671bfe52fe337ee254f3d14e34'

interface Recording { status: number; body: unknown; headers: Record<string, string>; backend_commit: string; backend_worktree_dirty: boolean }

function recording(name: string): Recording {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8')) as Recording
}

async function fulfillRecorded(route: import('@playwright/test').Route, name: string) {
  const entry = recording(name)
  await route.fulfill({ status: entry.status, headers: entry.headers, contentType: 'application/json', body: JSON.stringify(entry.body) })
}

let token = ''

test.beforeAll(async () => {
  const email = `e2e-${Date.now()}-f3900-${randomUUID().slice(0, 8)}@pundo.com`
  const response = await fetch(`${BACKEND_URL}/api/v1/customer/auth/signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'F3900Wallet!99', display_name: 'F3900 Wallet' }),
  })
  expect(response.status, await response.text()).toBe(201)
  token = (response.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? ''
  expect(token).not.toBe('')
})

async function authenticate(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([{ name: 'customer_token', value: token, domain: new URL(BASE_URL).hostname, path: '/', httpOnly: true, sameSite: 'Lax' }])
}

test('recordings are clean 8500 responses and the browser mock preserves their status, body and Retry-After', async ({ page }) => {
  for (const name of ['homesick_preflight_free', 'homesick_preflight_paid', 'homesick_submit_free', 'homesick_submit_paid', 'homesick_wallet_insufficient', 'homesick_daily_attempt_cap', 'homesick_daily_total_cap', 'homesick_free_daily_limit', 'homesick_free_monthly_limit', 'product_mail_preflight_free', 'product_mail_preflight_paid', 'product_mail_activation_free', 'product_mail_activation_paid', 'product_mail_wallet_insufficient']) {
    const entry = recording(name)
    expect(entry.backend_commit).toBe(RECORDED_COMMIT)
    expect(entry.backend_worktree_dirty).toBe(false)
    expect(entry.status).toBeGreaterThanOrEqual(200)
  }
  await page.route('**/api/customer/customer/progression/preflight', route => fulfillRecorded(route, 'homesick_daily_attempt_cap'))
  await page.goto('/en')
  const response = await page.evaluate(async () => {
    const result = await fetch('/api/customer/customer/progression/preflight', { method: 'POST' })
    return { status: result.status, body: await result.json(), retryAfter: result.headers.get('retry-after') }
  })
  const entry = recording('homesick_daily_attempt_cap')
  expect(response.status).toBe(entry.status)
  expect(response.body).toEqual(entry.body)
  expect(response.retryAfter).toBe(entry.headers['retry-after'])
})

test('Homesick renders free, paid, insufficient-wallet and limit records; screenshots cover the light UI and RTL', async ({ page, context }, testInfo) => {
  await authenticate(context)
  let preflight = 'homesick_preflight_free'
  let submit = 'homesick_submit_free'
  await page.route('**/api/customer/customer/progression/preflight', route => fulfillRecorded(route, preflight))
  await page.route('**/api/customer/customer/similarity-search/submit', route => fulfillRecorded(route, submit))

  async function open(lang: 'en' | 'de' | 'ar') {
    await page.goto(`/${lang}`)
    await waitForPageHydrated(page)
    await page.getByRole('button', { name: /AI Search|AI-Suche|بحث AI/ }).click()
    const input = page.locator('textarea')
    await input.fill('Find a product from home')
    await page.getByRole('dialog').getByRole('button', { name: /^(Search|Suchen|بحث)$/ }).click()
  }

  await open('en')
  await expect(page.getByRole('heading', { name: 'Cost preview' })).toBeVisible()
  const light = testInfo.outputPath('homesick-free-light.png')
  await page.screenshot({ path: light, fullPage: true })
  await testInfo.attach('homesick-free-light', { path: light, contentType: 'image/png' })
  await page.getByRole('button', { name: 'Continue for free' }).click()
  await expect(page.getByText('Check your inbox! The answer is on its way.')).toBeVisible()

  preflight = 'homesick_preflight_paid'; submit = 'homesick_submit_paid'
  await page.keyboard.press('Escape')
  await open('en')
  await expect(page.getByText('This action costs 3 Carobs.')).toBeVisible()
  const paidLight = testInfo.outputPath('homesick-paid-light.png')
  await page.screenshot({ path: paidLight, fullPage: true })
  await testInfo.attach('homesick-paid-light', { path: paidLight, contentType: 'image/png' })

  preflight = 'homesick_daily_attempt_cap'
  await page.keyboard.press('Escape')
  await open('en')
  const englishLimit = page.locator('p.text-red-500')
  await expect(englishLimit).toContainText('October 22, 2026 at 00:00 UTC')
  await expect(englishLimit).not.toContainText('2026-10-22T00:00:00Z')
  await page.keyboard.press('Escape')
  await open('de')
  const germanLimit = page.locator('p.text-red-500')
  await expect(germanLimit).toContainText('22. Oktober 2026 um 00:00 UTC')
  await expect(germanLimit).not.toContainText('2026-10-22T00:00:00Z')
  await page.keyboard.press('Escape')
  await open('ar')
  const arabicLimit = page.locator('p.text-red-500')
  await expect(arabicLimit).toContainText('Homesick')
  await expect(arabicLimit).toContainText('22 أكتوبر 2026 في 00:00 UTC')
  await expect(arabicLimit).not.toContainText('2026-10-22T00:00:00Z')
  const rtl = testInfo.outputPath('homesick-limit-rtl.png')
  await page.screenshot({ path: rtl, fullPage: true })
  await testInfo.attach('homesick-limit-rtl', { path: rtl, contentType: 'image/png' })

  preflight = 'homesick_wallet_insufficient'
  await page.keyboard.press('Escape')
  await open('en')
  await expect(page.locator('p.text-red-500')).toContainText('need 3 Carobs')
})

test('Product-Mail keeps the select unchanged until the recorded paid activation succeeds, and surfaces recorded wallet denial', async ({ page, context }) => {
  await authenticate(context)
  const preflight = 'product_mail_preflight_paid'
  let patch = 'product_mail_activation_paid'
  await page.route('**/api/customer/customer/favorites?*', async route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [{ id: 620, product_id: 1, product_slug: 'contract-product', product_name: 'Contract product', brand: null, image_url: null, best_offer_price: null, best_offer_currency: 'EUR', best_offer_shop: null, best_offer_dist_km: null, alert_interval: 'nie' }], total: 1, page: 1, limit: 20 }) }))
  await page.route('**/api/customer/customer/auth/notification-settings', async route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ default_alert_interval: 'täglich' }) }))
  await page.route('**/api/customer/customer/progression/preflight', route => fulfillRecorded(route, preflight))
  await page.route('**/api/customer/customer/favorites/620', route => fulfillRecorded(route, patch))
  await page.goto('/account/favorites')
  await waitForPageHydrated(page)
  const select = page.getByTitle('Notifications')
  await select.selectOption('täglich')
  await expect(select).toHaveValue('nie')
  await expect(page.getByText('This action costs 2 Carobs.')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm and spend 2 Carobs' }).click()
  await expect(select).toHaveValue('täglich')

  patch = 'product_mail_wallet_insufficient'
  await page.reload()
  await waitForPageHydrated(page)
  const deniedSelect = page.getByTitle('Notifications')
  await deniedSelect.selectOption('täglich')
  await page.getByRole('button', { name: 'Confirm and spend 2 Carobs' }).click()
  await expect(deniedSelect).toHaveValue('nie')
  await expect(page.getByText('You need 2 Carobs but have 0 Carobs')).toBeVisible()
})
