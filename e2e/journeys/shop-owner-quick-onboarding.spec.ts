/**
 * Journey: Shop-Owner Schnell-Onboarding Wizard (F5910)
 *
 * Tests draft persistence, discard flow, conditional specialties, email conflict,
 * progress bar and i18n for the 6-step onboarding wizard.
 *
 * Backend must be running at 8500 with pundo_test seeded (onboarding domains).
 * Frontend must be running at 3500.
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'

// ─── Port safety ──────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
const BACKEND_URL =
  process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error(
    '[shop-owner-quick-onboarding] Safety: NEVER run against prod ports 3000/8000!'
  )
}

// ─── Test identity ────────────────────────────────────────────────────────────

const UUID = randomUUID().slice(0, 8)
const PREFIX = `e2e-quick-ob-${UUID}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DRAFT_KEY = 'pundo.onboarding.draft.v1'

/** Build a valid draft object and write it to localStorage via page.addInitScript. */
async function injectDraft(
  page: import('@playwright/test').Page,
  providerType = 'dienstleister'
) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
  const draft = {
    version: 1,
    expiresAt,
    providerType,
    domainSlugs: [],
    specialtySlugs: [],
    location: null,
    contact: {},
  }
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value)
    },
    { key: DRAFT_KEY, value: JSON.stringify(draft) }
  )
}

/** Register a shop-owner via the legacy /register endpoint (for conflict testing). */
async function registerOwnerViaApi(email: string, password: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider_type: 'handwerker',
      domain_slugs: ['elektriker'],
      specialty_slugs: [],
      location: {
        lat: 34.917,
        lng: 33.636,
        address: 'Conflict Test Street, Larnaca',
        is_b2c_storefront: false,
      },
      contact: { phone: '+35799000099' },
      shop_name: `${PREFIX}-conflict-shop`,
      credentials: { type: 'email', email, password, name: `${PREFIX} Conflict` },
      lang: 'en',
    }),
  })
  if (!res.ok && res.status !== 409) {
    throw new Error(`Pre-registration failed: ${res.status} ${await res.text()}`)
  }
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe('F5910 Schnell-Onboarding Wizard', () => {

  // ── T1: GET /domains → Wizard lädt mit Domains ─────────────────────────────

  test('T1 — GET /onboarding/domains → Wizard lädt mit Domains-Chips', async ({ page }) => {
    // Navigate fresh (no draft in storage)
    await page.goto(BASE_URL + '/shop-admin/onboarding')

    // Step 1 must render the provider-type tiles (language-agnostic: aria-pressed)
    const tiles = page.locator('button[aria-pressed]')
    await expect(tiles.first(), 'T1: at least one provider-type tile must be visible').toBeVisible({
      timeout: 15_000,
    })
    expect(await tiles.count(), 'T1: must have exactly 4 provider-type tiles').toBe(4)

    // Click "Handwerker" tile (aria-pressed changes to "true")
    const handwerkerTile = page.locator('button[aria-pressed]', {
      hasText: /handwerker|tradesperson/i,
    })
    await handwerkerTile.click()
    await expect(handwerkerTile).toHaveAttribute('aria-pressed', 'true')

    // Click Next — step 2 (Domains) loads
    const nextBtn = page.locator('button:not([disabled])', { hasText: /next|weiter/i }).first()
    // Use the last "next" button (the large one at the bottom)
    await page.locator('button', { hasText: /next|weiter/i }).last().click()

    // Domain chips must render — wait for elektriker chip (seeded in Step 3)
    const elektrikerChip = page.locator('button, [role="button"]', {
      hasText: /electrician|elektriker/i,
    })
    await expect(elektrikerChip.first(), 'T1: Elektriker chip must appear after backend load').toBeVisible({
      timeout: 10_000,
    })
  })

  // ── T2: Draft persistence (localStorage → resume banner) ───────────────────

  test('T2 — Draft persistence: Banner erscheint nach Reload', async ({ page }) => {
    // Inject draft before page loads
    await injectDraft(page, 'dienstleister')

    await page.goto(BASE_URL + '/shop-admin/onboarding')
    await page.waitForLoadState('networkidle')

    // Draft banner must be visible
    const banner = page.locator('div').filter({ hasText: /continue|weitermachen|fortsetzen/i }).first()
    await expect(banner, 'T2: draft resume banner must be visible').toBeVisible({ timeout: 10_000 })

    // Both Resume and Discard buttons must be present
    const resumeBtn = page.locator('button', { hasText: /continue|fortsetzen/i })
    const discardBtn = page.locator('button', { hasText: /start over|neu beginnen/i })
    await expect(resumeBtn.first(), 'T2: Resume button must be visible').toBeVisible()
    await expect(discardBtn.first(), 'T2: Discard button must be visible').toBeVisible()

    // Click "Continue" — banner disappears, wizard shows (step 0 pre-selected)
    await resumeBtn.first().click()
    await expect(banner, 'T2: banner must disappear after clicking Continue').toBeHidden({
      timeout: 5_000,
    })

    // Provider type tiles must render (wizard resumed)
    const tiles = page.locator('button[aria-pressed]')
    await expect(tiles.first(), 'T2: wizard step 1 must render after resume').toBeVisible()
  })

  // ── T3: Draft discard ──────────────────────────────────────────────────────

  test('T3 — Draft discard: "Neu beginnen" → leerer Wizard', async ({ page }) => {
    await injectDraft(page, 'dienstleister')
    await page.goto(BASE_URL + '/shop-admin/onboarding')
    await page.waitForLoadState('networkidle')

    // Banner visible
    const discardBtn = page.locator('button', { hasText: /start over|neu beginnen/i })
    await expect(discardBtn.first(), 'T3: Discard button must be visible').toBeVisible({
      timeout: 10_000,
    })

    // Click discard
    await discardBtn.first().click()

    // Banner must be gone
    await expect(
      page.locator('button', { hasText: /start over|neu beginnen/i }).first(),
      'T3: Discard button must disappear'
    ).toBeHidden({ timeout: 5_000 })

    // Wizard step 1 renders with NO pre-selection (all tiles aria-pressed="false")
    const tiles = page.locator('button[aria-pressed]')
    await expect(tiles.first(), 'T3: step 1 tiles must render').toBeVisible()

    // All 4 tiles must be aria-pressed="false" (fresh start)
    const count = await tiles.count()
    for (let i = 0; i < count; i++) {
      const pressed = await tiles.nth(i).getAttribute('aria-pressed')
      expect(pressed, `T3: tile ${i} must not be pre-selected`).toBe('false')
    }
  })

  // ── T4: Conditional specialties step ────────────────────────────────────────

  test('T4 — Conditional specialties: Elektriker → Sub-Step erscheint', async ({ page }) => {
    await page.goto(BASE_URL + '/shop-admin/onboarding')

    // Step 1: Select Handwerker
    const handwerkerTile = page.locator('button[aria-pressed]', {
      hasText: /handwerker|tradesperson/i,
    })
    await expect(handwerkerTile.first(), 'T4: Handwerker tile must be visible').toBeVisible({
      timeout: 15_000,
    })
    await handwerkerTile.first().click()

    await page.locator('button', { hasText: /next|weiter/i }).last().click()

    // Step 2: Wait for domain chips, select "elektriker" (has specialties)
    const elektrikerChip = page.locator('button', { hasText: /electrician|elektriker/i })
    await expect(elektrikerChip.first(), 'T4: Elektriker chip must load').toBeVisible({
      timeout: 10_000,
    })
    await elektrikerChip.first().click()

    // Click Next — should trigger sub-step (specialties)
    await page.locator('button', { hasText: /next|weiter/i }).last().click()

    // Specialties sub-step must appear (solar systems / solaranlagen chip)
    const specialtyChip = page.locator('button', { hasText: /solar|solaranlagen/i })
    await expect(
      specialtyChip.first(),
      'T4: specialty chip (Solaranlagen) must appear after clicking Next with Elektriker selected'
    ).toBeVisible({ timeout: 8_000 })

    // Select specialty and click Next → should go to Step 3 (Location)
    await specialtyChip.first().click()
    await page.locator('button', { hasText: /next|weiter/i }).last().click()

    // Step 3 (Location) title must be visible
    const locationTitle = page.locator('h2', { hasText: /located|wo bist/i })
    await expect(locationTitle.first(), 'T4: Step 3 (Location) must load after specialties').toBeVisible({
      timeout: 8_000,
    })
  })

  // ── T5: Email conflict → 409 + login link ──────────────────────────────────

  test('T5 — Email conflict: 409 → Fehlermeldung mit Login-Link', async ({ page }) => {
    const conflictEmail = `${PREFIX}-conflict@pundo-e2e.io`
    const conflictPw = 'E2eConflictPw!99'

    // Pre-register via API
    await registerOwnerViaApi(conflictEmail, conflictPw)

    await page.goto(BASE_URL + '/shop-admin/onboarding')

    // Step 1: Handwerker
    const handwerkerTile = page.locator('button[aria-pressed]', {
      hasText: /handwerker|tradesperson/i,
    })
    await expect(handwerkerTile.first()).toBeVisible({ timeout: 15_000 })
    await handwerkerTile.first().click()
    await page.locator('button', { hasText: /next|weiter/i }).last().click()

    // Step 2: Select maler (no specialties → goes straight to step 3)
    const malerChip = page.locator('button', { hasText: /painter|maler/i })
    await expect(malerChip.first()).toBeVisible({ timeout: 10_000 })
    await malerChip.first().click()
    await page.locator('button', { hasText: /next|weiter/i }).last().click()

    // Step 3: Location — set address directly in the text field and pin via coordinates
    // The map is dynamically loaded; fill address field and force a pin via JS injection
    await page.waitForLoadState('networkidle')
    const addressInput = page.locator('input[placeholder*="address" i], input[placeholder*="adresse" i]')
    await expect(addressInput.first(), 'T5: address input must exist in Step 3').toBeVisible({
      timeout: 10_000,
    })
    // Fill address manually
    await addressInput.first().fill('Test Street, Larnaca')

    // Set pin via script (map click is hard to simulate in headless)
    await page.evaluate(() => {
      // Dispatch a custom event that the map component listens for
      window.dispatchEvent(
        new CustomEvent('onboarding:pin', { detail: { lat: 34.917, lng: 33.636 } })
      )
    })

    // Click Next on Location step — may need coords set; if Next is still disabled,
    // use JS to click it anyway (component validates lat/lng existence)
    const locationNextBtn = page.locator('button', { hasText: /next|weiter/i }).last()
    // Wait a moment for any address resolution
    await page.waitForTimeout(500)
    // If disabled (no pin set), try clicking anyway to see the error OR inject location via localStorage
    const isDisabled = await locationNextBtn.getAttribute('disabled')
    if (isDisabled !== null) {
      // Inject partial location into localStorage draft and reload to skip map interaction
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
      const draft = {
        version: 1,
        expiresAt,
        providerType: 'handwerker',
        domainSlugs: ['maler'],
        specialtySlugs: [],
        location: { lat: 34.917, lng: 33.636, address: 'Test Street, Larnaca', isB2cStorefront: false },
        contact: {},
      }
      await page.evaluate(
        ({ key, value }: { key: string; value: string }) => window.localStorage.setItem(key, value),
        { key: DRAFT_KEY, value: JSON.stringify(draft) }
      )
      await page.reload()
      // Resume draft (banner shows)
      const resumeBtn = page.locator('button', { hasText: /continue|fortsetzen/i })
      await expect(resumeBtn.first()).toBeVisible({ timeout: 8_000 })
      await resumeBtn.first().click()

      // After resume wizard goes to step 3 (location already set → step 4)
      // Navigate to step 4 directly (wizard should resume at contact step)
    }

    // Step 4: Contact — fill phone
    const contactH2 = page.locator('h2', { hasText: /reach you|kunden reach|wie erreichen/i })
    // Wait up to 10s for contact step or click Next again from location
    try {
      await expect(contactH2.first()).toBeVisible({ timeout: 5_000 })
    } catch {
      // Still on location? Try clicking next
      await page.locator('button', { hasText: /next|weiter/i }).last().click({ force: true })
      await expect(contactH2.first()).toBeVisible({ timeout: 8_000 })
    }

    const phoneInput = page.locator('input[type="tel"]').first()
    await phoneInput.fill('+35799000011')
    await page.locator('button', { hasText: /next|weiter/i }).last().click()

    // Step 5: Photo — click Skip
    const skipBtn = page.locator('button', { hasText: /skip|überspringen/i })
    await expect(skipBtn.first(), 'T5: Skip button in Step 5 must be visible').toBeVisible({
      timeout: 8_000,
    })
    await skipBtn.first().click()

    // Step 6: Credentials — fill conflict email + password
    const emailInput = page.locator('input[name="email"]')
    const passwordInput = page.locator('input[name="password"]')
    await expect(emailInput, 'T5: email input on Step 6 must exist').toBeVisible({ timeout: 8_000 })
    await emailInput.fill(conflictEmail)
    await passwordInput.fill(conflictPw)
    await page.locator('button[type="submit"]').click()

    // Error message with link to /shop-admin/login must appear
    const loginLink = page.locator('a[href*="/shop-admin/login"]')
    await expect(loginLink, 'T5: login link must appear after 409 email conflict').toBeVisible({
      timeout: 10_000,
    })
  })

  // ── T6: Progress bar + i18n ─────────────────────────────────────────────────

  test('T6 — Progress bar + i18n (EN + DE)', async ({ context }) => {
    // — English (app_lang cookie = en, or default) —
    const enPage = await context.newPage()
    await context.addCookies([{ name: 'app_lang', value: 'en', domain: 'localhost', path: '/' }])
    await enPage.goto(BASE_URL + '/shop-admin/onboarding')
    await enPage.waitForLoadState('networkidle')

    // Progress text "Step 1 of 6" (rendered as <p> in wizard)
    const progressEN = enPage.locator('p', { hasText: /step 1 of 6/i })
    await expect(progressEN.first(), 'T6: "Step 1 of 6" must be visible (EN)').toBeVisible({
      timeout: 10_000,
    })

    // Tile label "Tradesperson" visible (EN provider type label)
    const tradespersonTile = enPage.locator('button', { hasText: /tradesperson/i })
    await expect(tradespersonTile.first(), 'T6: "Tradesperson" tile must be visible (EN)').toBeVisible()
    await enPage.close()

    // — German (app_lang cookie = de) —
    const dePage = await context.newPage()
    await context.addCookies([{ name: 'app_lang', value: 'de', domain: 'localhost', path: '/' }])
    await dePage.goto(BASE_URL + '/shop-admin/onboarding')
    await dePage.waitForLoadState('networkidle')

    const progressDE = dePage.locator('p', { hasText: /schritt 1 von 6/i })
    await expect(progressDE.first(), 'T6: "Schritt 1 von 6" must be visible (DE)').toBeVisible({
      timeout: 10_000,
    })

    const handwerkerTile = dePage.locator('button', { hasText: /^handwerker$/i })
    await expect(handwerkerTile.first(), 'T6: "Handwerker" tile must be visible (DE)').toBeVisible()
    await dePage.close()
  })

})
