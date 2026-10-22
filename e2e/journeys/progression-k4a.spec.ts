import { randomUUID } from 'crypto'
import { test, expect, chromium } from '@playwright/test'
import { BACKEND_URL, BASE_URL } from '../env'
import { waitForPageHydrated } from './_helpers/hydration'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: K4a progression journey may only use 3500/8500.')
}

let token = ''

function screenshotPath(testInfo: import('@playwright/test').TestInfo, name: string): string {
  return process.env.K4A_SCREENSHOT_DIR ? `${process.env.K4A_SCREENSHOT_DIR}/${name}` : testInfo.outputPath(name)
}

test.beforeAll(async () => {
  const response = await fetch(`${BACKEND_URL}/api/v1/customer/auth/signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `e2e-k4a-${randomUUID().slice(0, 8)}@pundo.com`, password: 'K4aProgression!99', display_name: 'K4a Progression',
    }),
  })
  expect(response.status, await response.text()).toBe(201)
  token = (response.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? ''
  expect(token).not.toBe('')
})

async function authenticate(context: import('@playwright/test').BrowserContext, origin = BASE_URL) {
  await context.addCookies([{ name: 'customer_token', value: token, domain: new URL(origin).hostname, path: '/', httpOnly: true, sameSite: 'Lax' }])
}

async function openNaidivseAccount(lang: 'ru' | 'he') {
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP naidivse.com 127.0.0.1'] })
  const naidivseUrl = BASE_URL.replace('127.0.0.1', 'naidivse.com')
  const context = await browser.newContext({ baseURL: naidivseUrl })
  // Chromium upgrades naidivse.com subresources to HTTPS from its HSTS cache, while the
  // local E2E server deliberately speaks HTTP. Keep the document on naidivse.com (so brand
  // resolution and domain cookies are exercised), but load its static bundle from loopback.
  await context.route('https://naidivse.com:3500/**', async route => {
    if (route.request().isNavigationRequest()) {
      await route.continue()
      return
    }
    const response = await route.fetch({
      url: route.request().url().replace('https://naidivse.com:3500', 'http://127.0.0.1:3500'),
      headers: {
        ...route.request().headers(),
        host: 'naidivse.com:3500',
        cookie: `customer_token=${token}; app_lang=${lang}`,
      },
    })
    await route.fulfill({ response })
  })
  await authenticate(context, naidivseUrl)
  await context.addCookies([
    { name: 'app_lang', value: lang, domain: 'naidivse.com', path: '/' },
    { name: 'app_cookie_consent', value: encodeURIComponent(JSON.stringify({ v: 1, necessary: true, statistics: true, marketing: false })), domain: 'naidivse.com', path: '/' },
  ])
  const page = await context.newPage()
  const loadErrors: string[] = []
  page.on('console', message => { if (message.type() === 'error') loadErrors.push(message.text()) })
  page.on('pageerror', error => loadErrors.push(error.message))
  // Next prefetches (_rsc) are aborted when the page navigates or closes; that is not an app error
  page.on('requestfailed', request => { if (!request.url().includes('_rsc=')) loadErrors.push(`${request.url()} ${request.failure()?.errorText ?? 'request failed'}`) })
  await page.goto('/account')
  // A separately launched Chromium exposes no __reactProps$ markers on this hostname;
  // wait for its client bundle before clicking the account tab instead of using that fixture-only marker.
  await page.waitForTimeout(1_000)
  return { browser, context, page, loadErrors }
}

test('K4a account uses the live 8500 projection and stays console-clean in Pundo light mode', async ({ page, context }, testInfo) => {
  await authenticate(context)
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/account')
  await waitForPageHydrated(page)
  const consent = page.getByRole('button', { name: 'Only necessary' })
  if (await consent.isVisible()) await consent.click()
  await page.getByRole('tab', { name: 'Progress' }).click()
  await expect(page.getByTestId('pundo-progress-ring')).toBeVisible()
  await expect(page.getByText('Carobs').first()).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('k4a-pundo-light.png'), fullPage: true })
  expect(errors.filter(error => !error.includes('favicon'))).toEqual([])
})

test('K4a Naidivse skin renders Russian brand terms', async ({}, testInfo) => {
  const { browser, context, page, loadErrors } = await openNaidivseAccount('ru')
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  try {
    await page.getByRole('tab', { name: 'Прогресс' }).click()
    await expect(page.getByRole('tab', { name: 'Прогресс' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('naidivse-progress-bar')).toBeVisible()
    await expect(page.getByText('Чутьё')).toBeVisible()
    await expect(page.getByText('Монеты').first()).toBeVisible()
    const screenshot = screenshotPath(testInfo, 'naidivse-ru-fortschritt-runde3.png')
    await page.screenshot({ path: screenshot, fullPage: true })
    await testInfo.attach('k4a-naidivse-ru', { path: screenshot, contentType: 'image/png' })
    expect([...loadErrors, ...errors].filter(error => !error.includes('favicon'))).toEqual([])
  } finally {
    await context.close()
    await browser.close()
  }
})

test('K4a Naidivse skin renders a strong bar and Hebrew brand terms in RTL', async ({}, testInfo) => {
  const { browser, context, page, loadErrors } = await openNaidivseAccount('he')
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  try {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.getByRole('tab', { name: 'התקדמות' }).click()
    await expect(page.getByRole('tab', { name: 'התקדמות' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('naidivse-progress-bar')).toBeVisible()
    await expect(page.getByText('אינסטינקט')).toBeVisible()
    await expect(page.getByText('מטבעות').first()).toBeVisible()
    const screenshot = screenshotPath(testInfo, 'naidivse-he-fortschritt-runde3.png')
    await page.screenshot({ path: screenshot, fullPage: true })
    await testInfo.attach('k4a-naidivse-he-rtl', { path: screenshot, contentType: 'image/png' })
    expect([...loadErrors, ...errors].filter(error => !error.includes('favicon'))).toEqual([])
  } finally {
    await context.close()
    await browser.close()
  }
})
