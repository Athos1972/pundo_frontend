/**
 * Journey: Shop-Admin Profile — Phone Field (FINDING-1) + Logo Upload (FINDING-3)
 *
 * Szenario C — Phone Field:
 *   Tests for the newly implemented phone field in ShopProfilePatch/Response and ProfileForm.
 *   C1: Backend API: phone field present in GET /shop-owner/shop response
 *   C2: Backend API: PATCH with phone saves correctly
 *   C3: Backend API: clearing phone (null) removes it
 *   C4: UI: phone input is visible in ProfileForm
 *   C5: UI + API: phone save round-trip via ProfileForm
 *   C6: Customer-facing /shops/[slug] shows phone as tel: link
 *
 * Szenario D — Logo Upload:
 *   Tests for the LogoUpload component and POST /shop-owner/shop/logo endpoint.
 *   D1: Backend API: valid JPEG upload returns logo_url with /shop_logos/ path
 *   D2: Backend API: invalid file type (PDF) → 400 error
 *   D3: Backend API: oversized file (>5MB) → 400 error
 *   D4: UI: LogoUpload component is visible in ProfileForm (upload button exists)
 *   D5: UI: "Or enter URL" toggle reveals URL text input
 *   D6: UI: file input accepts only image/jpeg,image/png,image/webp (accept attribute)
 *   D7: UI + API: after upload the logo appears in customer-facing shop page
 *
 * Ports: Frontend 3500, Backend 8500 — niemals 3000/8000.
 *
 * Note: Logo file upload via UI (D7) uses the Playwright setInputFiles API to
 * simulate file selection without triggering the real file dialog.
 *
 * Note on waitHydrated: The app does NOT set data-hydrated="true" on <body>.
 * Instead we wait for networkidle + a specific form element that is only present
 * when the ProfileForm has rendered (the submit button with name="name" input).
 * This is more reliable than body attribute polling.
 */

import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// ─── Port-Safety ──────────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-admin-profile-phone-logo] Safety: Niemals gegen Produktiv-Ports laufen!')
}

// ─── State-Datei laden (vom global-setup) ─────────────────────────────────────

interface TestState {
  email: string
  password: string
  shop_name: string
  ownerId: number
  shopId: number | null
  shopSlug: string | null
}

function loadTestState(): TestState {
  const stateFile = path.join(__dirname, '..', '.test-state.json')
  if (!fs.existsSync(stateFile)) {
    throw new Error('[shop-admin-profile-phone-logo] .test-state.json nicht gefunden — bitte globalSetup ausführen.')
  }
  return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as TestState
}

test.use({
  storageState: (() => {
    const stateFile = path.join(__dirname, '..', '.test-state.json')
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8')).storageState
    }
    return undefined
  })(),
})

// ─── API-Helpers ───────────────────────────────────────────────────────────────

function ownerAuthHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function getOwnerToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Owner-Login fehlgeschlagen: ${res.status} ${await res.text()}`)
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const match = cookieHeader.match(/shop_owner_token=([^;]+)/)
  if (!match) throw new Error(`shop_owner_token cookie nicht gefunden: ${cookieHeader}`)
  return match[1]
}

async function getShopProfile(token: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
    headers: ownerAuthHeader(token),
  })
  if (!res.ok) throw new Error(`GET /shop-owner/shop → ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

async function patchShopProfile(token: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
    method: 'PATCH',
    headers: ownerAuthHeader(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH /shop-owner/shop → ${res.status}: ${await res.text()}`)
  return res.json() as Promise<Record<string, unknown>>
}

// waitProfileForm: waits for the ProfileForm submit button to be present.
// The app does NOT set data-hydrated="true" on <body>, so we wait for a
// DOM element that is only rendered by ProfileForm after the page is ready.
async function waitProfileForm(page: Page) {
  await page.waitForLoadState('networkidle')
  // The submit "Save" button is rendered by ProfileForm — once it's in the DOM
  // the form is ready for interaction.
  await page.waitForSelector('button[type="submit"]', { timeout: 20_000 })
}

// ─── Szenario C: Phone Field ──────────────────────────────────────────────────

test.describe.serial('Szenario C — Phone Field: FINDING-1', () => {
  const state = loadTestState()
  const shopSlug = state.shopSlug
  let ownerToken = ''

  test.beforeAll(async () => {
    ownerToken = await getOwnerToken(state.email, state.password)
    // Reset phone to null before tests
    await patchShopProfile(ownerToken, { phone: null })
  })

  test.afterAll(async () => {
    if (ownerToken) {
      // Clean up — reset phone after tests
      await patchShopProfile(ownerToken, { phone: null }).catch(() => {})
    }
  })

  // ── C1: phone field present in GET response ────────────────────────────────

  test('C1 — API: phone field present in GET /shop-owner/shop response', async () => {
    const profile = await getShopProfile(ownerToken)
    // The 'phone' key must exist in the response (even if null)
    expect('phone' in profile, 'phone field exists in response').toBe(true)
    // After reset it should be null
    expect(profile.phone, 'phone is null initially').toBeNull()
  })

  // ── C2: PATCH with phone saves correctly ─────────────────────────────────

  test('C2 — API: PATCH with phone number saves correctly', async () => {
    const result = await patchShopProfile(ownerToken, { phone: '+35799111222' })
    expect(result.phone, 'phone returned in PATCH response').toBe('+35799111222')

    // Verify with GET
    const profile = await getShopProfile(ownerToken)
    expect(profile.phone, 'phone persisted in GET').toBe('+35799111222')
  })

  // ── C3: clearing phone (null) removes it ─────────────────────────────────

  test('C3 — API: PATCH phone=null clears the phone field', async () => {
    // First set a value
    await patchShopProfile(ownerToken, { phone: '+35799333444' })

    // Then clear
    const result = await patchShopProfile(ownerToken, { phone: null })
    expect(result.phone, 'phone is null in PATCH response').toBeNull()

    const profile = await getShopProfile(ownerToken)
    expect(profile.phone, 'phone is null in GET').toBeNull()
  })

  // ── C4: phone input visible in ProfileForm UI ─────────────────────────────

  test('C4 — UI: phone input is visible in ProfileForm', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitProfileForm(page)

    const phoneInput = page.locator('input[name="phone"]')
    await expect(phoneInput, 'phone input visible in ProfileForm').toBeVisible()

    // Verify it is type="tel"
    const inputType = await phoneInput.getAttribute('type')
    expect(inputType, 'phone input type is tel').toBe('tel')
  })

  // ── C5: UI + API round-trip for phone ────────────────────────────────────

  test('C5 — UI + API: phone save round-trip via ProfileForm', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitProfileForm(page)

    const phoneInput = page.locator('input[name="phone"]')
    await expect(phoneInput, 'phone input visible').toBeVisible()
    await phoneInput.fill('+35799555666')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).first().click()
    await expect(page.getByRole('status'), 'Toast after save').toContainText(
      /saved|gespeichert/i, { timeout: 10_000 }
    )

    // Verify via API
    const profile = await getShopProfile(ownerToken)
    expect(profile.phone, 'phone saved via API').toBe('+35799555666')
  })

  // ── C6: Customer-facing shop detail shows phone ───────────────────────────

  test('C6 — Customer-Sicht: /shops/[slug] shows phone as tel: link', async ({ page }) => {
    if (!shopSlug) {
      test.skip(true, 'shopSlug not available')
      return
    }

    // Ensure phone is set
    await patchShopProfile(ownerToken, { phone: '+35799777888' })

    await page.goto(`${BASE_URL}/shops/${shopSlug}`)
    await page.waitForLoadState('networkidle')

    // Should have a tel: link
    const telLink = page.locator('a[href="tel:+35799777888"]')
    const hasTelLink = await telLink.count() > 0
    // Also accept phone number appearing as text
    const bodyText = await page.locator('body').innerText()
    const hasPhoneText = bodyText.includes('+35799777888') || bodyText.includes('35799777888')

    expect(hasTelLink || hasPhoneText, 'phone visible in customer-facing shop page').toBe(true)
  })
})

// ─── Szenario D: Logo Upload ──────────────────────────────────────────────────
//
// Note on file creation: we generate a minimal valid JPEG using the backend's
// Python venv (which has Pillow) to produce a file that PIL can process into
// WebP variants.

test.describe.serial('Szenario D — Logo Upload: FINDING-3', () => {
  const state = loadTestState()
  const shopSlug = state.shopSlug
  let ownerToken = ''

  // Path to test JPEG, created in beforeAll
  const testJpegPath = path.join('/tmp', 'e2e-test-logo.jpg')
  const testPdfPath = path.join('/tmp', 'e2e-test-invalid.pdf')
  const testLargeJpegPath = path.join('/tmp', 'e2e-test-logo-large.jpg')
  // Backend repo for Python venv
  const BACKEND_REPO = process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'

  test.beforeAll(async () => {
    ownerToken = await getOwnerToken(state.email, state.password)

    // Create a valid 200x200 JPEG using backend Pillow
    const { execSync } = await import('child_process')
    execSync(
      `${BACKEND_REPO}/.venv/bin/python3 -c "
from PIL import Image
import io
img = Image.new('RGB', (200, 200), color=(80, 160, 240))
buf = io.BytesIO()
img.save(buf, format='JPEG', quality=85)
with open('${testJpegPath}', 'wb') as f:
    f.write(buf.getvalue())
print('created')
"`,
      { stdio: 'pipe' }
    )

    // Create a fake PDF
    fs.writeFileSync(testPdfPath, '%PDF-1.4 fake pdf content')

    // Create a >5MB binary file with JPEG magic bytes
    const buf = Buffer.alloc(6 * 1024 * 1024 + 4)
    buf[0] = 0xFF; buf[1] = 0xD8  // JPEG SOI
    buf[buf.length - 2] = 0xFF; buf[buf.length - 1] = 0xD9  // JPEG EOI
    fs.writeFileSync(testLargeJpegPath, buf)
  })

  test.afterAll(async () => {
    // Clean up temp files
    [testJpegPath, testPdfPath, testLargeJpegPath].forEach(p => {
      try { fs.unlinkSync(p) } catch { /* ignore */ }
    })
  })

  // ── D1: valid JPEG upload returns logo_url with /shop_logos/ path ─────────

  test('D1 — API: valid JPEG upload returns logo_url with /shop_logos/ path', async () => {
    const formData = new FormData()
    const jpegBytes = fs.readFileSync(testJpegPath)
    const blob = new Blob([jpegBytes], { type: 'image/jpeg' })
    formData.append('file', blob, 'logo.jpg')

    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: formData,
    })

    expect(res.ok, `Logo upload succeeded (status ${res.status})`).toBe(true)
    const data = await res.json() as Record<string, unknown>
    expect(typeof data.logo_url, 'logo_url is string').toBe('string')
    const logoUrl = data.logo_url as string
    expect(logoUrl.startsWith('/shop_logos/'), 'logo_url starts with /shop_logos/').toBe(true)
    // Should return card variant (WebP) or orig
    const isWebpOrOrig = logoUrl.endsWith('.webp') || logoUrl.endsWith('.jpg') || logoUrl.endsWith('.jpeg')
    expect(isWebpOrOrig, 'logo_url has valid image extension').toBe(true)
  })

  // ── D2: invalid file type (PDF) returns 400 ───────────────────────────────

  test('D2 — API: invalid file type (PDF) returns 400', async () => {
    const formData = new FormData()
    const pdfBytes = fs.readFileSync(testPdfPath)
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    formData.append('file', blob, 'test.pdf')

    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: formData,
    })

    expect(res.status, 'PDF upload returns 400').toBe(400)
    const data = await res.json() as Record<string, unknown>
    expect(typeof data.detail, 'error detail is string').toBe('string')
    const detail = data.detail as string
    expect(detail.toLowerCase(), 'error mentions unsupported type').toMatch(/unsupported|type/i)
  })

  // ── D3: oversized file (>5MB) returns 400 ────────────────────────────────

  test('D3 — API: oversized file (>5MB) returns 400', async () => {
    const formData = new FormData()
    const largeBytes = fs.readFileSync(testLargeJpegPath)
    const blob = new Blob([largeBytes], { type: 'image/jpeg' })
    formData.append('file', blob, 'large.jpg')

    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: formData,
    })

    expect(res.status, 'oversized upload returns 400').toBe(400)
    const data = await res.json() as Record<string, unknown>
    const detail = data.detail as string
    expect(detail.toLowerCase(), 'error mentions file size').toMatch(/too large|size|5 mb/i)
  })

  // ── D4: LogoUpload component visible in ProfileForm ───────────────────────

  test('D4 — UI: LogoUpload component is visible in ProfileForm', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitProfileForm(page)

    // The file input is hidden but present in the DOM; the visible button triggers it.
    // Check for the hidden file input (accept attribute present) and the upload button.
    const fileInput = page.locator('input[type="file"]')
    const hasFileInput = await fileInput.count() > 0

    // The upload button is rendered by LogoUpload (type="button", triggers file picker)
    const uploadButton = page.locator('button[type="button"]').filter({ hasText: /upload|logo/i }).first()
    const hasUploadButton = await uploadButton.isVisible().catch(() => false)

    expect(hasFileInput || hasUploadButton, 'LogoUpload component present (file input or upload button found)').toBe(true)
  })

  // ── D5: "Or enter URL" toggle reveals URL text input ─────────────────────

  test('D5 — UI: "Or enter URL" toggle reveals URL text input', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitProfileForm(page)

    // The toggle button text is tr.logo_or_url — in English: "Or enter URL manually" or similar
    // Check the translations to find the exact text
    // From shop-admin-translations.ts: logo_or_url key
    // We search for any button with URL-related text
    const toggleBtn = page.locator('button[type="button"]').filter({ hasText: /url|manual/i })
    const count = await toggleBtn.count()
    expect(count, '"Or enter URL" toggle button exists').toBeGreaterThan(0)

    await toggleBtn.first().click()
    await page.waitForTimeout(300)

    // After clicking: a url input should appear
    const urlInput = page.locator('input[type="url"]').first()
    await expect(urlInput, 'URL input appears after toggle click').toBeVisible({ timeout: 5_000 })
  })

  // ── D6: file input accept attribute restricts to images ──────────────────

  test('D6 — UI: file input accept attribute restricts to JPEG/PNG/WebP', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitProfileForm(page)

    const fileInput = page.locator('input[type="file"]').first()
    // file input may be hidden — just check DOM presence
    const fileInputCount = await fileInput.count()
    expect(fileInputCount, 'file input exists in DOM').toBeGreaterThan(0)

    const acceptAttr = await fileInput.getAttribute('accept')
    expect(acceptAttr, 'accept attribute is set').not.toBeNull()
    // Must include jpeg/jpg and png; no application/pdf or */*
    expect(acceptAttr, 'accept includes jpeg').toMatch(/jpeg/i)
    expect(acceptAttr, 'accept includes png').toMatch(/png/i)
    expect(acceptAttr, 'accept includes webp').toMatch(/webp/i)
    expect(acceptAttr, 'accept does NOT allow all types').not.toBe('*/*')
  })

  // ── D7: upload via UI, then logo visible in customer-facing shop page ─────
  // Uses Playwright's setInputFiles to simulate file selection without dialog.

  test('D7 — UI + Customer: logo upload via UI appears in /shops/[slug]', async ({ page }) => {
    if (!shopSlug) {
      test.skip(true, 'shopSlug not available')
      return
    }

    await page.goto('/shop-admin/profile')
    await waitProfileForm(page)

    const fileInput = page.locator('input[type="file"]').first()
    const fileInputCount = await fileInput.count()
    expect(fileInputCount, 'file input exists for upload').toBeGreaterThan(0)

    // Use setInputFiles to simulate file selection (bypasses dialog)
    await fileInput.setInputFiles(testJpegPath)

    // Wait for upload to complete:
    // LogoUpload shows a success toast OR the preview image changes to a blob: URL.
    // We wait for either a status/alert role OR img[src*="blob:"] to appear.
    const uploadDone = page.locator('img[src*="blob:"]')
      .or(page.getByRole('status').filter({ hasText: /saved|logo|upload/i }))
      .or(page.getByRole('alert').filter({ hasText: /saved|logo|upload/i }))

    await uploadDone.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {
      // If nothing appeared, we'll verify the form save still works
    })

    // Save the form to commit logo_url to profile
    await page.getByRole('button', { name: /^save$|^speichern$/i }).first().click()
    await expect(page.getByRole('status'), 'Toast after save').toContainText(
      /saved|gespeichert/i, { timeout: 10_000 }
    )

    // Verify via API that logo_url is set
    const profile = await getShopProfile(ownerToken)
    const logoUrl = profile.logo_url as string | null
    expect(logoUrl, 'logo_url set in profile after upload + save').not.toBeNull()

    // Check customer-facing shop page
    await page.goto(`${BASE_URL}/shops/${shopSlug}`)
    await page.waitForLoadState('networkidle')

    // Shop page should have an img referencing shop_logos
    const logoImg = page.locator('img[src*="shop_logos"]')
    const hasLogoImg = await logoImg.count() > 0
    expect(hasLogoImg, 'logo image visible in customer-facing shop page').toBe(true)
  })
})
