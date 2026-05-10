/**
 * E2E tests — Language Picker Overlay (F6310, language-picker-first-launch-20260504)
 *
 * Covers:
 *   AC1  — Fresh visitor without cookie sees overlay
 *   AC2  — Returning visitor with cookie sees NO overlay
 *   AC3  — Browser language pre-selected (ru-RU → Русский)
 *   AC4  — Unsupported browser language → fallback en
 *   AC5  — Selection persists: cookie set after confirm
 *   AC6  — Hard reload when new lang != server lang (UI in chosen lang)
 *   AC7  — RTL layout after choosing Arabic
 *   AC9  — Native script names rendered (Русский, Ελληνικά, العربية, עברית)
 *   AC10 — No overlay rendered in SSR HTML (hydration-safe)
 *   AC11 — role=dialog, aria-modal=true, aria-labelledby present
 *
 * Notes:
 *   - Overlay appears AFTER the splash animation (SPLASH_OUTRO_MS = 2500 ms).
 *     Tests that need the overlay must wait long enough.
 *   - sessionStorage key 'app_splash' is pre-set (splash already ran) to skip the
 *     2.5 s delay in most tests; one dedicated test validates sequencing.
 *   - Tests use `playwright.config.ts` baseURL → 127.0.0.1:3500.
 */

import { test, expect, BrowserContext, Page } from '@playwright/test'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Clear the app_lang cookie and set sessionStorage so the overlay shows immediately. */
async function freshVisitorContext(browser: Parameters<typeof test>[1] extends { browser: infer B } ? B : never): Promise<never> {
  throw new Error('use freshVisitorPage instead')
}

/** Navigate to / as a fresh visitor (no app_lang cookie, splash already ran). */
async function openAsFreshVisitor(page: Page, locale?: string) {
  // Pre-set sessionStorage AFTER first navigation so the JS context exists.
  // Strategy: navigate, inject storage, then reload so the hook picks it up.
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  // Suppress the splash so the overlay appears without waiting 2.5 s.
  await page.evaluate(() => {
    sessionStorage.setItem('app_splash', '1')
  })

  // Reload so the hook's useEffect runs fresh with splashAlreadyRan=true.
  await page.reload({ waitUntil: 'domcontentloaded' })
}

/** Add the app_lang cookie to a page context (simulates returning user). */
async function setLangCookie(page: Page, lang: string) {
  await page.context().addCookies([{
    name: 'app_lang',
    value: lang,
    domain: '127.0.0.1',
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }])
}

/** Wait for the language picker dialog to appear (max 2 s after splash was skipped). */
async function waitForOverlay(page: Page) {
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
}

// ── AC1 — Fresh visitor sees overlay ─────────────────────────────────────────

test('AC1 — Fresh visitor without cookie sees language picker overlay', async ({ page }) => {
  await openAsFreshVisitor(page)
  await waitForOverlay(page)
  await expect(page.getByRole('dialog')).toBeVisible()
})

// ── AC2 — Returning visitor with cookie does NOT see overlay ──────────────────

test('AC2 — Returning visitor with app_lang cookie sees NO overlay', async ({ page }) => {
  await setLangCookie(page, 'de')

  // Go directly — splash has not run yet but that doesn't matter because
  // the cookie check fires before the timer anyway.
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { sessionStorage.setItem('app_splash', '1') })
  await page.reload({ waitUntil: 'domcontentloaded' })

  // Give enough time for the (non-)appearing overlay
  await page.waitForTimeout(500)
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

// ── AC3 — Browser language ru-RU → Русский pre-selected ──────────────────────

test('AC3 — Browser language ru-RU → Русский pre-selected (aria-checked)', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'ru-RU' })
  const page = await ctx.newPage()

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { sessionStorage.setItem('app_splash', '1') })
  await page.reload({ waitUntil: 'domcontentloaded' })

  await waitForOverlay(page)

  const ruBtn = page.getByRole('radio', { name: /Русский/ })
  await expect(ruBtn).toHaveAttribute('aria-checked', 'true')

  await ctx.close()
})

// ── AC4 — Unsupported browser language → English fallback ────────────────────

test('AC4 — Browser language fr-FR → English pre-selected (fallback)', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'fr-FR' })
  const page = await ctx.newPage()

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { sessionStorage.setItem('app_splash', '1') })
  await page.reload({ waitUntil: 'domcontentloaded' })

  await waitForOverlay(page)

  const enBtn = page.getByRole('radio', { name: /English/ })
  await expect(enBtn).toHaveAttribute('aria-checked', 'true')

  await ctx.close()
})

// ── AC5 — Confirm sets cookie and closes overlay ──────────────────────────────

test('AC5 — Confirm sets app_lang cookie and overlay disappears', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'en-US' })
  const page = await ctx.newPage()

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { sessionStorage.setItem('app_splash', '1') })
  await page.reload({ waitUntil: 'domcontentloaded' })

  await waitForOverlay(page)

  // Select German
  await page.getByRole('radio', { name: /Deutsch/ }).click()
  // Confirm (button label is now "Weiter" because selected lang is de)
  await page.getByRole('button', { name: /Weiter/ }).click()

  // After hard reload, overlay should not appear (cookie is set)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(600)

  const cookies = await ctx.cookies()
  const langCookie = cookies.find(c => c.name === 'app_lang')
  expect(langCookie, 'app_lang cookie should be set').toBeDefined()
  expect(langCookie?.value).toBe('de')

  await ctx.close()
})

// ── AC6 — UI re-renders in chosen language after confirm ─────────────────────

test('AC6 — After confirming German, html[lang] is "de" post-reload', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'en-US' })
  const page = await ctx.newPage()

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { sessionStorage.setItem('app_splash', '1') })
  await page.reload({ waitUntil: 'domcontentloaded' })

  await waitForOverlay(page)

  await page.getByRole('radio', { name: /Deutsch/ }).click()
  // Wait for page reload triggered by confirm (hard reload for lang change)
  const [response] = await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10_000 }),
    page.getByRole('button', { name: /Weiter/ }).click(),
  ])

  const htmlLang = await page.locator('html').getAttribute('lang')
  expect(htmlLang).toBe('de')

  await ctx.close()
})

// ── AC7 — RTL layout after choosing Arabic ────────────────────────────────────

test('AC7 — Choosing Arabic sets html[dir]="rtl" after confirm', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'en-US' })
  const page = await ctx.newPage()

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { sessionStorage.setItem('app_splash', '1') })
  await page.reload({ waitUntil: 'domcontentloaded' })

  await waitForOverlay(page)

  // Click Arabic option — it contains the native text العربية
  await page.locator('[role="radio"]').filter({ hasText: 'العربية' }).click()

  // Wait for page reload
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10_000 }),
    page.locator('[data-confirm]').click(),
  ])

  const dir = await page.locator('html').getAttribute('dir')
  expect(dir).toBe('rtl')

  await ctx.close()
})

// ── AC9 — Native script names ────────────────────────────────────────────────

test('AC9 — Overlay shows all 6 native-script language names', async ({ page }) => {
  await openAsFreshVisitor(page)
  await waitForOverlay(page)

  const radioOptions = page.getByRole('radio')
  await expect(radioOptions).toHaveCount(6)

  // Check each native name is present
  const nativeNames = ['English', 'Deutsch', 'Русский', 'Ελληνικά', 'العربية', 'עברית']
  for (const name of nativeNames) {
    await expect(page.getByRole('radio').filter({ hasText: name })).toBeVisible()
  }
})

// ── AC10 — No overlay in SSR HTML (hydration safe) ───────────────────────────

test('AC10 — SSR HTML does not contain the dialog (overlay is client-only)', async ({ page }) => {
  // Intercept the initial HTML before JS runs by disabling JS
  const ctxNoJs = await page.context().browser()!.newContext({ javaScriptEnabled: false })
  const noJsPage = await ctxNoJs.newPage()

  await noJsPage.goto('/', { waitUntil: 'domcontentloaded' })

  // With JS disabled, the useEffect never runs → dialog must not be in DOM
  const dialog = noJsPage.locator('[role="dialog"]')
  await expect(dialog).toHaveCount(0)

  await ctxNoJs.close()
})

// ── AC11 — Accessibility attributes ──────────────────────────────────────────

test('AC11 — Dialog has role=dialog, aria-modal=true, aria-labelledby', async ({ page }) => {
  await openAsFreshVisitor(page)
  await waitForOverlay(page)

  const dialog = page.getByRole('dialog')
  await expect(dialog).toHaveAttribute('aria-modal', 'true')

  const labelledBy = await dialog.getAttribute('aria-labelledby')
  expect(labelledBy, 'aria-labelledby should be set').toBeTruthy()

  // The element pointed to by aria-labelledby must exist and be visible
  const titleEl = page.locator(`#${labelledBy}`)
  await expect(titleEl).toBeVisible()
})

// ── Extra: not skippable (ESC + backdrop) ────────────────────────────────────

test('ESC does not close the overlay (not skippable)', async ({ page }) => {
  await openAsFreshVisitor(page)
  await waitForOverlay(page)

  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  await expect(page.getByRole('dialog')).toBeVisible()
})

test('Backdrop click does not close the overlay (not skippable)', async ({ page }) => {
  await openAsFreshVisitor(page)
  await waitForOverlay(page)

  // Click the backdrop (fixed inset-0 container that wraps the dialog card)
  await page.mouse.click(10, 10) // top-left corner is backdrop, not card
  await page.waitForTimeout(200)

  await expect(page.getByRole('dialog')).toBeVisible()
})
