/** F3900 K4b round 2: public unsubscribe and actual account notification consent. */
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { BACKEND_URL, BASE_URL } from '../env'
import { waitForPageHydrated } from './_helpers/hydration'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: K4b round 2 may only use 3500/8500.')
}

let token = ''

test.beforeAll(async () => {
  const response = await fetch(`${BACKEND_URL}/api/v1/customer/auth/signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `e2e-k4b-r2-${randomUUID().slice(0, 8)}@pundo.com`,
      password: 'K4bRoundTwo!99', display_name: 'K4b Round Two',
    }),
  })
  expect(response.status, await response.text()).toBe(201)
  token = (response.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? ''
  expect(token).not.toBe('')
})

async function authenticate(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([{ name: 'customer_token', value: token, domain: new URL(BASE_URL).hostname, path: '/', httpOnly: true, sameSite: 'Lax' }])
}

function captureErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

test('K4b R2: Pundo notification centre opts in with its selected language and stays console-clean', async ({ page, context }, testInfo) => {
  await authenticate(context)
  const errors = captureErrors(page)
  await page.goto('/account')
  await waitForPageHydrated(page)
  const cookieConsent = page.getByRole('button', { name: 'Necessary only' })
  if (await cookieConsent.isVisible()) await cookieConsent.click()
  await page.getByRole('tab', { name: 'Progress' }).click()
  await expect(page.getByRole('button', { name: 'Updates' })).toBeVisible()
  await page.getByRole('button', { name: 'Updates' }).click()
  await expect(page.getByRole('dialog', { name: 'Updates' })).toBeVisible()
  const achievement = page.getByLabel('Achievements and contribution updates')
  const [preferenceResponse] = await Promise.all([
    page.waitForResponse(response => response.url().includes('/notification-preferences?brand=pundo') && response.request().method() === 'PUT'),
    achievement.click(),
  ])
  expect(preferenceResponse.status()).toBe(200)
  await expect(achievement).toBeChecked()
  await expect(page.getByText('Preference saved')).toBeVisible()
  await page.getByLabel('Email updates').first().selectOption('de')
  await expect(page.getByText('Preference saved')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('k4b-r2-pundo-light.png'), fullPage: true })
  expect(errors.filter(error => !error.includes('favicon'))).toEqual([])
})

test('K4b R2: Naidivse public unsubscribe is readable in RTL and confirms neutrally', async ({ page }, testInfo) => {
  const errors = captureErrors(page)
  await page.goto('/account/progression/unsubscribe?token=invalid-token&brand=naidivse&lang=ar')
  await expect(page.locator('main')).toHaveAttribute('dir', 'rtl')
  await page.getByRole('button', { name: 'إلغاء الاشتراك' }).click()
  await expect(page.getByTestId('progression-unsubscribe-done')).toContainText('Naidivse')
  await page.screenshot({ path: testInfo.outputPath('k4b-r2-naidivse-rtl.png'), fullPage: true })
  expect(errors.filter(error => !error.includes('favicon'))).toEqual([])
})
