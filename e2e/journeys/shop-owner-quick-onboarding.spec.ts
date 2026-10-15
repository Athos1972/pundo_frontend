/**
 * Journey: Shop-Owner Schnell-Onboarding Wizard (F5910)
 *
 * Tests draft persistence, discard flow, conditional specialties, email conflict,
 * progress bar and i18n for the 6-step onboarding wizard.
 *
 * T9 additionally verifies post-approval item integrity (B5910-003):
 * - Draft listings have category_id + no tmpl-* slugs after submit
 * - Listings activate after admin approval
 * - Items have photos (requires Visual-Backfill)
 * - Customer search finds the shop's services after approval
 *
 * Backend must be running at 8500 with pundo_test seeded (onboarding domains).
 * Frontend must be running at 3500.
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'
import { RUN_ID, TestDataTracker, adminApi } from './_helpers/test-data'
import { waitForPageHydrated } from './_helpers/hydration'
import { BASE_URL, BACKEND_URL } from '../env'

// ─── Port safety ──────────────────────────────────────────────────────────────


if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error(
    '[shop-owner-quick-onboarding] Safety: NEVER run against prod ports 3000/8000!'
  )
}

// ─── Test identity ────────────────────────────────────────────────────────────

const UUID = randomUUID().slice(0, 8)
// B8950-012: Run-ID im Präfix (verankerter Selektor ^e2e-<run>-); afterAll löscht alle Owner/Shops dieses Präfixes
const PREFIX = `e2e-${RUN_ID}-quick-ob-${UUID}`

test.afterAll(async () => {
  // B5910-004: T9/T12 legen Entwurfs-Angebote an; deren Cleanup braucht mehr als die 30 s Hook-Default
  test.setTimeout(180_000)
  const tracker = new TestDataTracker()
  const owners = await adminApi<{ items: Array<{ id: number }> }>('GET', `/shop-owners?q=${encodeURIComponent(PREFIX)}&limit=100`)
  for (const o of owners.json?.items ?? []) tracker.owner(o.id)
  await tracker.cleanup()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DRAFT_KEY_V1 = 'pundo.onboarding.draft.v1'
const DRAFT_KEY_V2 = 'pundo.onboarding.draft.v2'

/** Build a valid v2 draft object and write it to localStorage via page.addInitScript. */
async function injectDraft(
  page: import('@playwright/test').Page,
  providerType = 'dienstleister'
) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
  const draft = {
    version: 2,
    expiresAt,
    providerType,
    domainSlugs: [],
    specialtySlugs: [],
    location: null,
    contact: {},
    shopName: '',
  }
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value)
    },
    { key: DRAFT_KEY_V2, value: JSON.stringify(draft) }
  )
}

/** Inject a legacy v1 draft key (for AC-24 cleanup test). */
async function injectLegacyV1Draft(page: import('@playwright/test').Page) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
  const draft = { version: 1, expiresAt, providerType: 'haendler', domainSlugs: [], specialtySlugs: [], location: null, contact: {} }
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value)
    },
    { key: DRAFT_KEY_V1, value: JSON.stringify(draft) }
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

    // Click "Handwerker" tile — auto-advances to step 2 after 150 ms
    const handwerkerTile = page.locator('button[aria-pressed]', {
      hasText: /handwerker|tradesperson/i,
    })
    await handwerkerTile.click()
    await expect(handwerkerTile).toHaveAttribute('aria-pressed', 'true')
    // No "Next" button on step 1 — auto-advance fires after 150 ms debounce

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
    // Auto-advance: no "Next" button in step 1 — 150 ms timer fires automatically

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
    // Auto-advance: tile click triggers step 2 after 150 ms

    // Step 2: Select maler (may have specialties in seed — handle sub-step if it appears)
    const malerChip = page.locator('button', { hasText: /painter|maler/i })
    await expect(malerChip.first()).toBeVisible({ timeout: 10_000 })
    await malerChip.first().click()
    await page.locator('button', { hasText: /next|weiter/i }).last().click()

    // If specialties sub-step appeared instead of Step 3, click through it
    const locationTitle = page.locator('h2', { hasText: /located|wo bist/i })
    try {
      await expect(locationTitle.first()).toBeVisible({ timeout: 2_000 })
    } catch {
      await page.locator('button', { hasText: /next|weiter/i }).last().click()
    }

    // Step 3: Location — set address directly in the text field and pin via coordinates
    // The map is dynamically loaded; fill address field and force a pin via JS injection
    // F8950 T22: statt networkidle - der expect unten wartet auf das Adressfeld von Step 3
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
    // F8950 T22: statt waitForTimeout(500) bis zu 2 s auf "Next aktiv" warten (Adress-/Pin-Aufloesung);
    // bleibt der Button deaktiviert, greift der Fallback unten (Draft per localStorage).
    await expect(locationNextBtn).toBeEnabled({ timeout: 2_000 }).catch(() => {})
    // If disabled (no pin set), try clicking anyway to see the error OR inject location via localStorage
    const isDisabled = await locationNextBtn.getAttribute('disabled')
    if (isDisabled !== null) {
      // Inject partial location into localStorage draft and reload to skip map interaction
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
      const draft = {
        version: 2,
        expiresAt,
        providerType: 'handwerker',
        domainSlugs: ['maler'],
        specialtySlugs: [],
        location: { lat: 34.917, lng: 33.636, address: 'Test Street, Larnaca', isB2cStorefront: false },
        contact: {},
        shopName: '',
      }
      await page.evaluate(
        ({ key, value }: { key: string; value: string }) => window.localStorage.setItem(key, value),
        { key: DRAFT_KEY_V2, value: JSON.stringify(draft) }
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

    // Step 5: Name (required) + Photo — enter name then click Skip (photo optional)
    const nameInput = page.locator('input#shop-name')
    await expect(nameInput, 'T5: shop-name input must be visible in Step 5').toBeVisible({
      timeout: 8_000,
    })
    await nameInput.fill('Conflict Test Shop')
    const skipBtn = page.locator('button', { hasText: /skip|überspringen/i })
    await expect(skipBtn.first(), 'T5: Skip button in Step 5 must be visible').toBeVisible()
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
    await context.addCookies([{ name: 'app_lang', value: 'en', domain: new URL(BASE_URL).hostname, path: '/' }])
    await enPage.goto(BASE_URL + '/shop-admin/onboarding')

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
    await context.addCookies([{ name: 'app_lang', value: 'de', domain: new URL(BASE_URL).hostname, path: '/' }])
    await dePage.goto(BASE_URL + '/shop-admin/onboarding')

    const progressDE = dePage.locator('p', { hasText: /schritt 1 von 6/i })
    await expect(progressDE.first(), 'T6: "Schritt 1 von 6" must be visible (DE)').toBeVisible({
      timeout: 10_000,
    })

    const handwerkerTile = dePage.locator('button', { hasText: /handwerker/i })
    await expect(handwerkerTile.first(), 'T6: "Handwerker" tile must be visible (DE)').toBeVisible()
    await dePage.close()
  })

  // ── T7: AC-24 — v1-Draft is silently deleted on page load ──────────────────

  test('T7 — AC-24: v1-Draft wird beim Laden still gelöscht', async ({ page }) => {
    // Inject a legacy v1 draft key
    await injectLegacyV1Draft(page)

    await page.goto(BASE_URL + '/shop-admin/onboarding')
    await waitForPageHydrated(page)

    // v1 key must be gone — no banner shown (wizard starts fresh at step 1)
    // F8950 T22: der Wizard loescht den Key beim Hydrieren (Effect) - darauf pollen statt networkidle
    await expect.poll(
      () => page.evaluate((key: string) => window.localStorage.getItem(key) === null, DRAFT_KEY_V1),
      { message: 'T7: v1 draft key must be deleted on page load' },
    ).toBe(true)

    // No resume banner should appear (v1 draft was not migrated)
    const banner = page.locator('button', { hasText: /continue|fortsetzen/i })
    await expect(banner, 'T7: no resume banner should appear after v1 draft purge').toBeHidden({
      timeout: 3_000,
    })

    // Wizard shows step 1 fresh
    const tiles = page.locator('button[aria-pressed]')
    await expect(tiles.first(), 'T7: wizard must render step 1 fresh').toBeVisible({
      timeout: 10_000,
    })
  })

  // ── T8: AC-18 — Step 5 Next/Skip disabled without name ─────────────────────

  test('T8 — AC-18: Step 5 — Next und Skip deaktiviert ohne Geschäftsname', async ({ page }) => {
    await page.goto(BASE_URL + '/shop-admin/onboarding')

    // Advance to step 5 via tile click + quick navigation
    const handwerkerTile = page.locator('button[aria-pressed]', {
      hasText: /handwerker|tradesperson/i,
    })
    await expect(handwerkerTile.first()).toBeVisible({ timeout: 15_000 })
    await handwerkerTile.first().click()

    // Step 2: pick a domain without specialties (maler usually works)
    const malerChip = page.locator('button', { hasText: /painter|maler/i })
    await expect(malerChip.first()).toBeVisible({ timeout: 10_000 })
    await malerChip.first().click()
    await page.locator('button', { hasText: /next|weiter/i }).last().click()

    // Skip sub-step if it appears
    try {
      await expect(page.locator('h2', { hasText: /located|wo bist/i }).first()).toBeVisible({ timeout: 2_000 })
    } catch {
      await page.locator('button', { hasText: /next|weiter/i }).last().click()
    }

    // Step 3: inject location via localStorage and reload
    // F8950 T22: statt networkidle - Step 3 (Standort) ist gerendert, bevor der Draft ueberschrieben wird
    await expect(page.locator('h2', { hasText: /located|wo bist/i }).first()).toBeVisible({ timeout: 10_000 })
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
    const draft = {
      version: 2, expiresAt,
      providerType: 'handwerker', domainSlugs: ['maler'], specialtySlugs: [],
      location: { lat: 34.917, lng: 33.636, address: 'Test Street', isB2cStorefront: false },
      contact: { phone: '+35799000022' },
      shopName: '',
    }
    await page.evaluate(
      ({ key, val }: { key: string; val: string }) => window.localStorage.setItem(key, val),
      { key: DRAFT_KEY_V2, val: JSON.stringify(draft) }
    )
    await page.reload()
    const resumeBtn = page.locator('button', { hasText: /continue|fortsetzen/i })
    await expect(resumeBtn.first()).toBeVisible({ timeout: 8_000 })
    await resumeBtn.first().click()

    // Should resume at step 5 (contact already filled)
    const nameInput = page.locator('input#shop-name')
    await expect(nameInput, 'T8: shop-name input must be visible on Step 5').toBeVisible({
      timeout: 8_000,
    })

    // Next and Skip must be disabled when name is empty
    const nextBtn = page.locator('button', { hasText: /next|weiter/i }).last()
    const skipBtn = page.locator('button', { hasText: /skip|überspringen/i }).first()
    await expect(nextBtn, 'T8: Next must be disabled without name').toBeDisabled()
    await expect(skipBtn, 'T8: Skip must be disabled without name').toBeDisabled()
  })

  // ── T10 (F2970): 22 Dienstleister-Chips, Friseur + Barber, "Andere"-Freitext ────────────

  test('T10 — F2970: Dienstleister-Domains (22 Chips, 390 px ohne horizontalen Scroll), Friseur-Spezialitaet, Freitext bei "Andere"', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.context().addCookies([{ name: 'app_lang', value: 'de', url: BASE_URL }])
    await page.goto(BASE_URL + '/shop-admin/onboarding')
    const tile = page.locator('button[aria-pressed]', { hasText: /dienstleister|service provider/i })
    await expect(tile.first()).toBeVisible({ timeout: 15_000 })
    await tile.first().click()

    // Step 2: alle Dienstleister-Domains aus dem Backend (>= 22 inkl. "Sonstiges" = 23 Chip-Buttons)
    const friseurChip = page.locator('button', { hasText: /^Friseur & Barbier$/ })
    await expect(friseurChip.first(), 'T10: Friseur & Barbier Chip').toBeVisible({ timeout: 15_000 })
    const chips = page.locator('button[aria-pressed]')
    expect(await chips.count(), 'T10: >= 22 Domain-Chips + Sonstiges').toBeGreaterThanOrEqual(23)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'T10: kein horizontaler Scroll bei 390 px'
    ).toBe(true)

    // Friseur waehlen -> Weiter -> Spezialitaeten enthalten Barber-/Herren-Variante, Kinder, Hausbesuch
    await friseurChip.first().click()
    await page.locator('button', { hasText: /^weiter$/i }).last().click()
    await expect(page.locator('button', { hasText: /^Herren$/ }).first(), 'T10: Spezialitaet Herren').toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: /^Kinder$/ }).first(), 'T10: neue Spezialitaet Kinder').toBeVisible()
    await expect(page.locator('button', { hasText: /^Hausbesuch$/ }).first(), 'T10: neue Spezialitaet Hausbesuch').toBeVisible()

    // zurueck -> "Sonstiges" zeigt das optionale Freitextfeld (max. 120 Zeichen)
    await page.locator('button', { hasText: /^zurück$/i }).last().click()
    await friseurChip.first().click() // abwaehlen
    await page.locator('button', { hasText: /^Sonstiges$/ }).first().click()
    const other = page.locator('input#onboarding-other-offer')
    await expect(other, 'T10: Freitextfeld bei "Sonstiges"').toBeVisible()
    expect(await other.getAttribute('maxlength')).toBe('120')
    await other.fill('Hufschmied')
    // nur "Sonstiges" + Text: Weiter ist aktiv (Backend akzeptiert domain_slugs=[] seit F2970)
    await expect(page.locator('button', { hasText: /^weiter$/i }).last()).toBeEnabled()
  })

  // ── T11 (B5910-004): Tattoo & Piercing ohne Spezialität ist nicht absendbar ───────────────

  test('T11 — B5910-004: Tattoo & Piercing ohne Spezialität: Weiter gesperrt, API antwortet 422', async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'de', url: BASE_URL }])
    await page.goto(BASE_URL + '/shop-admin/onboarding')
    const tile = page.locator('button[aria-pressed]', { hasText: /dienstleister|service provider/i })
    await expect(tile.first()).toBeVisible({ timeout: 15_000 })
    await tile.first().click()

    const tattooChip = page.locator('button', { hasText: /^Tattoo & Piercing$/ })
    await expect(tattooChip.first(), 'T11: Tattoo & Piercing Chip').toBeVisible({ timeout: 15_000 })
    await tattooChip.first().click()
    await page.locator('button', { hasText: /^weiter$/i }).last().click()

    // Spezialitäten-Schritt: Hinweis sichtbar, Weiter gesperrt
    const hint = page.getByTestId('specialty-required-hint')
    await expect(hint, 'T11: Pflicht-Hinweis').toBeVisible({ timeout: 10_000 })
    const next = page.locator('button', { hasText: /^weiter$/i }).last()
    await expect(next, 'T11: Weiter ohne Spezialität gesperrt').toBeDisabled()

    // Spezialität wählen -> Weiter frei
    await page.locator('button', { hasText: /^Piercing$/ }).first().click()
    await expect(hint).toBeHidden()
    await expect(next, 'T11: Weiter mit Spezialität aktiv').toBeEnabled()

    // Backend lehnt den direkten Submit ohne Spezialität ab (422, nichts angelegt)
    const email = `${PREFIX}-t11@pundo-e2e.io`
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_type: 'dienstleister',
        domain_slugs: ['tattoo-piercing'],
        specialty_slugs: [],
        location: { lat: 34.917, lng: 33.636, address: 'T11 Street, Larnaca', is_b2c_storefront: true },
        contact: { phone: '+35799000099' },
        shop_name: `${PREFIX}-t11-shop`,
        credentials: { type: 'email', email, password: 'E2eTestPassword!99', name: `${PREFIX} T11` },
        lang: 'de',
      }),
    })
    expect(res.status, 'T11: Tattoo ohne Spezialität -> 422').toBe(422)
    const body = await res.json() as { detail?: Array<{ code?: string }> }
    expect(body.detail?.[0]?.code).toBe('specialty_required')
  })

})
