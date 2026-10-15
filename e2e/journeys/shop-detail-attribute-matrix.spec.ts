/**
 * Journey: Shop-Detail Attribut-Matrix
 * spec: shop-self-service-attribute-batch-20260606
 *
 * Tests the self-service attribute batch:
 *   - Service radius (F5300)
 *   - Charity claim (F3800 Phase 1a)
 *   - Appointment required
 *   - Payment methods
 *
 * Design: Fresh shop-owner registered per test run (no DB reset).
 * Backend must have deployed the new columns before E2E goes green.
 *
 * Ports: Frontend 3500, Backend 8500 — never 3000/8000.
 *
 * AC coverage:
 *   AC-01 — Owner sets service_radius_km=30 → GET returns 30
 *   AC-02 — Shop-Detail shows radius hint
 *   AC-06 — Owner activates charity → charity_status=pending → sees "Under review"
 *   AC-07 — Consumer sees NO charity badge when pending
 *   AC-08 — Consumer sees charity badge when approved (fixture shop)
 *   AC-09 — Owner deactivates charity → status resets to none (no badge)
 *   AC-11 — Owner sets appointment_required=true → detail shows hint
 *   AC-13 — Owner selects cash + card → GET returns ['cash', 'card']
 *   AC-14 — Consumer sees payment chips on detail page
 *   AC-16 — UI strings present (smoke: en checked here, ar/he RTL checked manually)
 *   AC-17 — tsc + ESLint pass (checked by T10 / CI)
 */

import { test, expect, type Page } from '@playwright/test'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { BASE_URL, BACKEND_URL } from '../env'

// ─── Port-Safety ──────────────────────────────────────────────────────────────


if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-detail-attribute-matrix] Safety: Niemals gegen Produktiv-Ports laufen!')
}

// ─── Fresh Owner Setup ────────────────────────────────────────────────────────

// B8950-012: eigener Spec-Shop per Admin-API + Impersonation (statt Registrierung + Passwort-Login);
// afterAll löscht ihn per Admin-Delete.
let specShopRef: WorkerShop | null = null

interface FreshOwner {
  token: string
  shopId: number
  shopSlug: string | null
}

const freshOwner: FreshOwner = { token: '', shopId: 0, shopSlug: null }

test.use({ storageState: { cookies: [], origins: [] } })

// ─── Helper: inject auth cookie ───────────────────────────────────────────────

async function ensureAuth(page: Page) {
  if (!freshOwner.token) throw new Error('freshOwner not set up — beforeAll failed')
  await page.context().addCookies([{
    name: 'shop_owner_token',
    value: freshOwner.token,
    domain: new URL(BASE_URL).hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }])
}

// ─── Register fresh owner once ────────────────────────────────────────────────

test.beforeAll(async () => {
  test.setTimeout(120_000)
  specShopRef = await specShop('ATTRIB')
  freshOwner.token = specShopRef.ownerToken
  freshOwner.shopId = specShopRef.id
  freshOwner.shopSlug = specShopRef.slug
  console.log(`[shop-detail-attribute-matrix] Spec-Shop ready: shopId=${freshOwner.shopId} shopSlug=${freshOwner.shopSlug}`)
})

test.afterAll(async () => {
  await specShopRef?.destroy()
})

// ─── AC-01: Owner sets service_radius_km=30 ───────────────────────────────────

test('AC-01 — PATCH service_radius_km=30 persists', async ({ request }) => {
  if (!freshOwner.token) test.skip()

  const patchRes = await request.patch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
    data: { service_radius_km: 30, delivers_island_wide: false },
    headers: {
      'Authorization': `Bearer ${freshOwner.token}`,
      'Content-Type': 'application/json',
    },
  })
  // Backend must accept the new fields — if 422/400 it's a backend gap
  expect(patchRes.status(), 'PATCH should return 200 or 204').toBeLessThan(300)

  const getRes = await request.get(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
    headers: { 'Authorization': `Bearer ${freshOwner.token}` },
  })
  const body = await getRes.json()
  expect(body.service_radius_km).toBe(30)
})

// ─── AC-02: Consumer sees radius hint on detail page ─────────────────────────

test('AC-02 — Shop-Detail shows radius hint', async ({ page }) => {
  if (!freshOwner.token || !freshOwner.shopSlug) test.skip()
  await ensureAuth(page)

  await page.goto(`${BASE_URL}/en/shops/${freshOwner.shopSlug}`)
  // Radius hint should contain km value
  const radiusHint = page.locator('text=/30 km/i')
  await expect(radiusHint.first()).toBeVisible({ timeout: 8000 })
})

// ─── AC-06: Charity claim → pending status shown in owner form ────────────────

test('AC-06 — Owner activates charity → sees "Under review"', async ({ page }) => {
  if (!freshOwner.token) test.skip()
  await ensureAuth(page)

  await page.goto(`${BASE_URL}/shop-admin/profile`)

  // Activate the charity toggle (role=switch)
  const toggle = page.getByRole('switch', { name: /charity|non-profit/i })
  const isChecked = await toggle.getAttribute('aria-checked')
  if (isChecked !== 'true') {
    await toggle.click()
  }

  // Submit form
  await page.getByRole('button', { name: /save/i }).click()
  // F8950 T22: statt waitForTimeout(1000) auf den Speichern-Toast warten
  await expect(page.getByRole('status').filter({ hasText: /saved|gespeichert/i }).first()).toBeVisible({ timeout: 10_000 })

  // Re-navigate to see server state
  await page.reload()

  // "Under review" label should be visible
  await expect(page.locator('text=/Under review|In Prüfung/i').first()).toBeVisible({ timeout: 8000 })
})

// ─── AC-07: Consumer sees NO badge while charity is pending ──────────────────

test('AC-07 — No charity badge visible for pending shop', async ({ page }) => {
  if (!freshOwner.shopSlug) test.skip()
  // freshOwner charity is pending (not approved) — consumer sees no badge

  await page.goto(`${BASE_URL}/en/shops/${freshOwner.shopSlug}`)
  // Badge has text "Supports charity" — should not appear
  const badge = page.locator('text=/Supports charity/i')
  await expect(badge).toHaveCount(0)
})

// ─── AC-09: Owner deactivates charity → no badge ─────────────────────────────

test('AC-09 — Owner deactivates charity → badge gone', async ({ page, request }) => {
  if (!freshOwner.token || !freshOwner.shopSlug) test.skip()
  await ensureAuth(page)

  // Deactivate via API
  await request.patch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
    data: { supports_charity: false },
    headers: {
      'Authorization': `Bearer ${freshOwner.token}`,
      'Content-Type': 'application/json',
    },
  })

  // Consumer sees no badge
  await page.goto(`${BASE_URL}/en/shops/${freshOwner.shopSlug}`)
  const badge = page.locator('text=/Supports charity/i')
  await expect(badge).toHaveCount(0)
})

// ─── AC-11: Appointment required shown on detail ──────────────────────────────

test('AC-11 — Appointment required hint shown on shop detail', async ({ page, request }) => {
  if (!freshOwner.token || !freshOwner.shopSlug) test.skip()

  await request.patch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
    data: { appointment_required: true },
    headers: {
      'Authorization': `Bearer ${freshOwner.token}`,
      'Content-Type': 'application/json',
    },
  })

  await page.goto(`${BASE_URL}/en/shops/${freshOwner.shopSlug}`)
  await expect(page.locator('text=/Appointment required/i').first()).toBeVisible({ timeout: 8000 })
})

// ─── AC-13: Owner sets payment methods ───────────────────────────────────────

test('AC-13 — PATCH payment_methods persists', async ({ request }) => {
  if (!freshOwner.token) test.skip()

  const patchRes = await request.patch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
    data: { payment_methods: ['cash', 'card'] },
    headers: {
      'Authorization': `Bearer ${freshOwner.token}`,
      'Content-Type': 'application/json',
    },
  })
  expect(patchRes.status()).toBeLessThan(300)

  const getRes = await request.get(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
    headers: { 'Authorization': `Bearer ${freshOwner.token}` },
  })
  const body = await getRes.json()
  expect(body.payment_methods).toContain('cash')
  expect(body.payment_methods).toContain('card')
})

// ─── AC-14: Consumer sees payment chips ──────────────────────────────────────

test('AC-14 — Payment chips visible on shop detail', async ({ page }) => {
  if (!freshOwner.shopSlug) test.skip()

  await page.goto(`${BASE_URL}/en/shops/${freshOwner.shopSlug}`)
  // Cash and Visa chips should be visible after AC-13
  await expect(page.locator('text=/Cash/i').first()).toBeVisible({ timeout: 8000 })
  await expect(page.locator('text=/Visa/i').first()).toBeVisible({ timeout: 8000 })
})

// ─── AC-16: Translation keys present in EN ───────────────────────────────────

test('AC-16 (smoke) — EN translation strings are not empty', async ({ page }) => {
  if (!freshOwner.shopSlug) test.skip()

  await page.goto(`${BASE_URL}/en/shops/${freshOwner.shopSlug}`)
  // The page should not contain raw translation key literals (regression guard)
  const content = await page.content()
  expect(content).not.toContain('shop_delivers_radius')
  expect(content).not.toContain('payment_methods_heading')
  expect(content).not.toContain('charity_badge_label')
})


// ═════════════════════════════════════════════════════════════════════════════
// Profil-Roundtrip (F8950 T21): ersetzt die gestrichenen Journeys shop-admin-profile (31 Tests) und
// shop-admin-profile-phone-logo (13 Tests). Eigener Spec-Shop 'PROFILE'; die Reihenfolge ist Absicht
// (Tabula Rasa -> Edit -> Zeiten -> Kunden-Sicht), daher serial. Zuordnung alt -> neu: 03-implementation.md
// (Kommentare "alt A1" usw. verweisen auf die Testnummern der gestrichenen Specs).
// ═════════════════════════════════════════════════════════════════════════════

const SHOP_LOGO_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCADIAMgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDbooor9VPzQKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//Z'

test.describe.serial('Profil-Roundtrip — Felder, Zeiten, Telefon, Logo (T21)', () => {
  let profileShop: WorkerShop
  let ownerToken = ''
  let shopSlug = ''

  const ownerHeaders = () => ({ Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' })

  async function getProfile(): Promise<Record<string, unknown>> {
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, { headers: ownerHeaders() })
    if (!res.ok) throw new Error(`GET /shop-owner/shop -> ${res.status}`)
    return res.json() as Promise<Record<string, unknown>>
  }
  async function patchProfile(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH', headers: ownerHeaders(), body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`PATCH /shop-owner/shop -> ${res.status}: ${await res.text()}`)
    return res.json() as Promise<Record<string, unknown>>
  }
  async function getHours(): Promise<Array<Record<string, unknown>>> {
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/hours`, { headers: ownerHeaders() })
    if (!res.ok) throw new Error(`GET /shop-owner/shop/hours -> ${res.status}`)
    return res.json() as Promise<Array<Record<string, unknown>>>
  }
  async function putHours(hours: Array<Record<string, unknown>>): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/hours`, {
      method: 'PUT', headers: ownerHeaders(), body: JSON.stringify(hours),
    })
    if (!res.ok) throw new Error(`PUT /shop-owner/shop/hours -> ${res.status}: ${await res.text()}`)
  }
  async function waitHydrated(page: Page) {
    await page.waitForLoadState('load')
    await page.waitForSelector('body[data-hydrated="true"]', { timeout: 20_000 })
  }
  async function save(page: Page, name: RegExp) {
    await page.getByRole('button', { name }).first().click()
    // filter: nach einem Logo-Upload steht zusaetzlich der Toast "Logo uploaded successfully." im DOM
    await expect(page.getByRole('status').filter({ hasText: /saved|gespeichert/i }).first(), 'Toast "Gespeichert"')
      .toBeVisible({ timeout: 10_000 })
  }
  const SAVE_PROFILE = /^save$|^speichern$/i
  const SAVE_HOURS = /save hours|öffnungszeiten speichern/i

  test.beforeAll(async () => {
    test.setTimeout(120_000)
    profileShop = await specShop('PROFILE')
    ownerToken = profileShop.ownerToken
    shopSlug = profileShop.slug
  })

  test.afterAll(async () => {
    await profileShop?.destroy()
  })

  test.beforeEach(async ({ context }) => {
    await context.addCookies(profileShop.storageState.cookies)
  })

  // ── Profilfelder ───────────────────────────────────────────────────────────

  test('Profil Tabula Rasa — leerer Ausgangszustand, UI-Save aller Felder, API-Roundtrip', async ({ page }) => {
    // Ausgangszustand eines frischen Shops (alt A1): alle Felder leer
    const before = await getProfile()
    expect(before.description === null || before.description === '', 'description leer').toBe(true)
    expect(before.website_url === null || before.website_url === '', 'website_url leer').toBe(true)
    expect(before.whatsapp_number === null || before.whatsapp_number === '', 'whatsapp_number leer').toBe(true)
    expect(before.social_links, 'social_links null').toBeNull()
    const langsBefore = before.spoken_languages as string[] | null
    expect(langsBefore === null || langsBefore.length === 0, 'spoken_languages leer').toBe(true)

    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    // description, whatsapp_number, website_url (alt A2)
    const descField = page.locator('textarea[name="description"]')
    await expect(descField, 'Beschreibungs-Textarea sichtbar').toBeVisible()
    await descField.fill('E2E Tabula Rasa Beschreibung')
    await page.locator('input[name="whatsapp_number"]').fill('+35799111222')
    await page.locator('input[name="website_url"]').fill('https://e2e-tabula-rasa.example.com')

    // Social Links Instagram + Facebook (alt A4)
    const instagramLabel = page.getByText('Instagram', { exact: true })
    await expect(instagramLabel, 'Instagram-Label sichtbar').toBeVisible({ timeout: 10_000 })
    await instagramLabel.locator('..').locator('input[type="url"]').first().fill('https://instagram.com/e2e_tabula_rasa')
    const facebookLabel = page.getByText('Facebook', { exact: true })
    await expect(facebookLabel, 'Facebook-Label sichtbar').toBeVisible({ timeout: 10_000 })
    await facebookLabel.locator('..').locator('input[type="url"]').first().fill('https://facebook.com/e2e-tabula-rasa')

    // spoken_languages EN + DE (alt A6)
    const enButton = page.getByRole('button', { name: /^EN$/i }).first()
    const deButton = page.getByRole('button', { name: /^DE$/i }).first()
    await expect(enButton, 'EN-Button sichtbar').toBeVisible({ timeout: 10_000 })
    await expect(deButton, 'DE-Button sichtbar').toBeVisible({ timeout: 10_000 })
    await enButton.click()
    await deButton.click()

    await save(page, SAVE_PROFILE)

    // API-Roundtrip (alt A3, A3b, A5, A7)
    const after = await getProfile()
    expect(after.description, 'description gespeichert').toBe('E2E Tabula Rasa Beschreibung')
    expect(after.whatsapp_number, 'whatsapp_number gespeichert').toBe('+35799111222')
    expect(after.website_url, 'website_url gespeichert').toBe('https://e2e-tabula-rasa.example.com')
    const links = after.social_links as Record<string, string> | null
    expect(links, 'social_links nicht null').not.toBeNull()
    expect(links?.facebook, 'facebook gespeichert').toBe('https://facebook.com/e2e-tabula-rasa')
    expect(links?.instagram, 'instagram gespeichert').toBe('https://instagram.com/e2e_tabula_rasa')
    const langs = (after.spoken_languages as string[]).map(l => l.toUpperCase())
    expect(langs, 'EN enthalten').toContain('EN')
    expect(langs, 'DE enthalten').toContain('DE')
  })

  test('Profil Edit — description, Instagram, WhatsApp, Website und Sprachen auf bestehendem Shop ändern', async ({ page }) => {
    // alt B10: Sprachen per API zuruecksetzen, damit der UI-Zustand eindeutig ist
    await patchProfile({ spoken_languages: [] })

    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    const newDesc = `E2E Edit-Flow Beschreibung ${Date.now()}`
    await page.locator('textarea[name="description"]').fill(newDesc)                                 // alt B2
    const instagramLabel = page.getByText('Instagram', { exact: true })
    await expect(instagramLabel).toBeVisible({ timeout: 10_000 })
    await instagramLabel.locator('..').locator('input[type="url"]').first().fill('https://instagram.com/e2e_edit_flow_test') // alt B7
    await page.locator('input[name="whatsapp_number"]').fill('+35799888777')                         // alt B8
    await page.locator('input[name="website_url"]').fill('https://e2e-edit-flow.example.com')        // alt B9
    const enButton = page.getByRole('button', { name: /^EN$/i }).first()                              // alt B10
    const elButton = page.getByRole('button', { name: /^EL$/i }).first()
    await expect(enButton).toBeVisible({ timeout: 10_000 })
    await expect(elButton).toBeVisible({ timeout: 10_000 })
    await enButton.click()
    await elButton.click()

    await save(page, SAVE_PROFILE)

    const profile = await getProfile()
    expect(profile.description, 'description aktualisiert').toBe(newDesc)
    expect((profile.social_links as Record<string, string> | null)?.instagram, 'instagram aktualisiert')
      .toBe('https://instagram.com/e2e_edit_flow_test')
    expect(profile.whatsapp_number, 'whatsapp_number aktualisiert').toBe('+35799888777')
    expect(profile.website_url, 'website_url aktualisiert').toBe('https://e2e-edit-flow.example.com')
    const langs = (profile.spoken_languages as string[]).map(l => l.toUpperCase())
    expect(langs, 'EN enthalten').toContain('EN')
    expect(langs, 'EL enthalten').toContain('EL')
  })

  test('Profil — ungültige Social-Link-URL zeigt Inline-Fehler oder sperrt Save (alt B11)', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    const instagramLabel = page.getByText('Instagram', { exact: true })
    await expect(instagramLabel).toBeVisible({ timeout: 10_000 })
    await instagramLabel.locator('..').locator('input[type="url"]').first().fill('not-a-valid-url')

    const saveBtn = page.getByRole('button', { name: SAVE_PROFILE }).first()
    await expect(
      saveBtn.and(page.locator(':disabled')).or(page.getByText('Invalid URL')).first(),
      'Save-Button disabled ODER "Invalid URL" sichtbar',
    ).toBeVisible()
  })

  // ── Öffnungszeiten ─────────────────────────────────────────────────────────

  test('Öffnungszeiten — API-Roundtrip, 7 Checkboxen, UI-Save Mo–Fr, Montag ändern', async ({ page }) => {
    // Kontrollierter Ausgangszustand (alt A-beforeAll/C3): Mo–Fr offen 08:00–17:00, Sa+So zu.
    // Ein fill() auf ein Zeitfeld mit Fallback-Wert loest kein onChange aus, daher nicht "alles zu" starten.
    await putHours([
      ...[0, 1, 2, 3, 4].map(day => ({ day, closed: false, open: '08:00', close: '17:00' })),
      ...[5, 6].map(day => ({ day, closed: true, open: '00:00', close: '00:00' })),
    ])
    const seeded = await getHours()                                     // alt A1 (Zeiten), B4, C3
    expect(seeded, '7 Tage').toHaveLength(7)
    for (let i = 0; i < 7; i++) {
      expect(typeof seeded[i].day, `Tag ${i}: day ist Zahl`).toBe('number')
      expect(typeof seeded[i].closed, `Tag ${i}: closed ist boolean`).toBe('boolean')
    }
    for (let i = 0; i < 5; i++) {
      expect(seeded[i].closed, `Tag ${i} offen`).toBe(false)
      expect(seeded[i].open, `Tag ${i} open=08:00`).toBe('08:00')
      expect(seeded[i].close, `Tag ${i} close=17:00`).toBe('17:00')
    }
    expect(seeded[5].closed, 'Sa zu').toBe(true)
    expect(seeded[6].closed, 'So zu').toBe(true)

    await page.goto('/shop-admin/hours')
    await waitHydrated(page)

    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes, '7 Checkboxen').toHaveCount(7)

    // alt B5: jede der 7 Checkboxen ist togglebar (und wird zurueckgesetzt)
    for (let i = 0; i < 7; i++) {
      const cb = checkboxes.nth(i)
      const before = await cb.isChecked()
      await cb.click()
      await expect(cb, `Tag ${i}: Zustand hat sich geändert`).toBeChecked({ checked: !before })
      await cb.click()
      await expect(cb, `Tag ${i}: zurückgesetzt`).toBeChecked({ checked: before })
    }

    // alt A8: Mo–Fr 08:00–17:00 -> 09:00–18:00, Sa+So bleiben zu
    const openInputs = page.locator('input[type="time"][aria-label*="open from"]:not([aria-label*="second"])')
    const closeInputs = page.locator('input[type="time"][aria-label*="close at"]:not([aria-label*="second"])')
    await expect(openInputs, 'Genau 5 open-from-Inputs (erster Slot)').toHaveCount(5)
    await expect(closeInputs, 'Genau 5 close-at-Inputs (erster Slot)').toHaveCount(5)
    for (let i = 0; i < 5; i++) {
      await openInputs.nth(i).fill('09:00')
      await closeInputs.nth(i).fill('18:00')
    }
    await save(page, SAVE_HOURS)

    // alt A9
    const hours = await getHours()
    for (let i = 0; i < 5; i++) {
      expect(hours[i].closed, `Tag ${i} nicht zu`).toBe(false)
      expect(hours[i].open, `Tag ${i} open=09:00`).toBe('09:00')
      expect(hours[i].close, `Tag ${i} close=18:00`).toBe('18:00')
    }
    expect(hours[5].closed, 'Sa zu').toBe(true)
    expect(hours[6].closed, 'So zu').toBe(true)

    // alt B3/B3b: nur Montag auf 10:00–20:00 (frisch geladene Seite: nach dem Save rendert das Formular neu)
    await page.goto('/shop-admin/hours')
    await waitHydrated(page)
    await expect(openInputs, 'Zeitfelder nach Reload (Mo–Fr offen)').toHaveCount(5)
    await expect(openInputs.first()).toHaveValue('09:00')
    await openInputs.first().fill('10:00')
    await closeInputs.first().fill('20:00')
    await save(page, SAVE_HOURS)
    const monday = (await getHours()).find(h => h.day === 0)
    expect(monday?.closed, 'Montag nicht zu').toBe(false)
    expect(monday?.open, 'Montag open=10:00').toBe('10:00')
    expect(monday?.close, 'Montag close=20:00').toBe('20:00')
  })

  test('Öffnungszeiten — zweites Zeitfenster (Split-Schicht) per UI hinzufügen (alt B6)', async ({ page }) => {
    await page.goto('/shop-admin/hours')
    await waitHydrated(page)

    // Checkbox checked = Tag geschlossen. Montag ist aus dem vorigen Test offen; sicherheitshalber oeffnen.
    const mondayCb = page.locator('input[type="checkbox"]').first()
    if (await mondayCb.isChecked()) await mondayCb.click()

    const openInput = page.locator('input[type="time"][aria-label*="open from"]').first()
    await expect(openInput, 'open-from Input sichtbar').toBeVisible()

    const secondOpen = page.locator('input[type="time"][aria-label*="second open from"]').first()
    const secondClose = page.locator('input[type="time"][aria-label*="second close at"]').first()
    if (!(await secondOpen.isVisible())) {
      await page.getByRole('button', { name: /second.*slot|zweites.*fenster|\+/i }).first().click()
    }
    await expect(secondOpen, 'Zweiter open-from-Input erscheint').toBeVisible()

    await openInput.fill('09:00')
    await page.locator('input[type="time"][aria-label*="close at"]').first().fill('12:00')
    await secondOpen.fill('13:00')
    await secondClose.fill('17:00')
    await save(page, SAVE_HOURS)

    const monday = (await getHours()).find(h => h.day === 0)
    expect(monday?.second_open, 'second_open=13:00 gespeichert').toBe('13:00')
    expect(monday?.second_close, 'second_close=17:00 gespeichert').toBe('17:00')
  })

  // ── Kunden-Sicht auf die gespeicherten Daten ──────────────────────────────

  test('Kunden-Sicht — /shops/[slug] zeigt Profilfelder, Öffnungszeiten und geschlossene Tage (alt A10, B12, B13)', async ({ page }) => {
    const profile = await getProfile()
    await page.goto(`${BASE_URL}/en/shops/${shopSlug}`)
    // Gestreamte Sektionen (Suspense) abwarten, bevor der Body-Text gelesen wird
    await expect(page.getByRole('heading', { name: 'Opening hours' })).toBeVisible({ timeout: 20_000 })
    const bodyText = await page.locator('body').innerText()

    expect(bodyText, 'Shop-Name sichtbar').toContain(profileShop.name)
    expect(bodyText, 'description sichtbar').toContain(profile.description as string)
    await expect(page.locator('a[href*="e2e-edit-flow.example.com"]').first(), 'website_url als Link').toBeVisible()
    await expect(page.locator('a[href*="wa.me"], a[href*="whatsapp"]').first(), 'WhatsApp-Link').toBeVisible()
    // Montag 09:00–12:00 + 13:00–17:00 (zweites Fenster), Di–Fr 09:00–18:00
    expect(bodyText, 'Öffnungszeiten sichtbar').toMatch(/09:00/)
    expect(bodyText, 'zweites Fenster sichtbar').toMatch(/13:00/)
    // Sprach-Chip EL (nach dem Edit: EN + EL)
    await expect(page.getByText('EL', { exact: true }).first(), 'Sprach-Chip EL').toBeVisible()
    // Geschlossene Tage Sa+So
    expect(bodyText, '"Closed" für Sa+So').toMatch(/closed|geschlossen|κλειστό|закрыто/i)
  })

  // ── Telefon ────────────────────────────────────────────────────────────────

  test('Telefon (API) — Feld vorhanden, speichern, mit null löschen (alt C1–C3)', async () => {
    await patchProfile({ phone: null })
    const profile = await getProfile()
    expect('phone' in profile, 'phone-Feld im GET vorhanden').toBe(true)         // alt C1
    expect(profile.phone, 'phone initial null').toBeNull()

    const result = await patchProfile({ phone: '+35799111222' })                  // alt C2
    expect(result.phone, 'phone in PATCH-Antwort').toBe('+35799111222')
    expect((await getProfile()).phone, 'phone im GET persistiert').toBe('+35799111222')

    const cleared = await patchProfile({ phone: null })                           // alt C3
    expect(cleared.phone, 'phone in PATCH-Antwort null').toBeNull()
    expect((await getProfile()).phone, 'phone im GET null').toBeNull()
  })

  test('Telefon (UI) — type=tel, Save-Roundtrip, Kunden-Sicht zeigt tel:-Link (alt C4–C6)', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await page.waitForSelector('button[type="submit"]', { timeout: 20_000 })

    const phoneInput = page.locator('input[name="phone"]')                         // alt C4
    await expect(phoneInput, 'phone input sichtbar').toBeVisible()
    expect(await phoneInput.getAttribute('type'), 'phone input type=tel').toBe('tel')

    await phoneInput.fill('+35799555666')                                          // alt C5
    await save(page, SAVE_PROFILE)
    expect((await getProfile()).phone, 'phone über UI gespeichert').toBe('+35799555666')

    await page.goto(`${BASE_URL}/en/shops/${shopSlug}`)                            // alt C6
    await expect(page.locator('a[href="tel:+35799555666"]').first(), 'tel:-Link in Kunden-Sicht').toBeVisible({ timeout: 20_000 })
  })

  // ── Logo ───────────────────────────────────────────────────────────────────

  test('Logo (API) — gültiges JPEG ok, PDF und >5 MB werden mit 400 abgelehnt (alt D1–D3)', async () => {
    const upload = (bytes: Uint8Array, type: string, name: string) => {
      const formData = new FormData()
      formData.append('file', new Blob([new Uint8Array(bytes)], { type }), name)
      return fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/logo`, {
        method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: formData,
      })
    }

    // alt D1
    const ok = await upload(Buffer.from(SHOP_LOGO_JPEG_B64, 'base64'), 'image/jpeg', 'logo.jpg')
    expect(ok.ok, `Logo-Upload ok (Status ${ok.status})`).toBe(true)
    const logoUrl = ((await ok.json()) as Record<string, unknown>).logo_url
    expect(typeof logoUrl, 'logo_url ist String').toBe('string')
    expect((logoUrl as string).startsWith('/shop_logos/'), 'logo_url beginnt mit /shop_logos/').toBe(true)
    expect(/\.(webp|jpe?g)$/.test(logoUrl as string), 'logo_url hat Bild-Endung').toBe(true)

    // alt D2
    const pdf = await upload(Buffer.from('%PDF-1.4 fake pdf content'), 'application/pdf', 'test.pdf')
    expect(pdf.status, 'PDF -> 400').toBe(400)
    const pdfDetail = ((await pdf.json()) as Record<string, unknown>).detail
    expect(typeof pdfDetail, 'detail ist String').toBe('string')
    expect((pdfDetail as string).toLowerCase(), 'Fehler nennt unsupported/type').toMatch(/unsupported|type/)

    // alt D3
    const big = Buffer.alloc(6 * 1024 * 1024 + 4)
    big[0] = 0xff; big[1] = 0xd8; big[big.length - 2] = 0xff; big[big.length - 1] = 0xd9
    const large = await upload(big, 'image/jpeg', 'large.jpg')
    expect(large.status, '>5 MB -> 400').toBe(400)
    expect((((await large.json()) as Record<string, unknown>).detail as string).toLowerCase(), 'Fehler nennt Größe')
      .toMatch(/too large|size|5 mb/)
  })

  test('Logo (UI) — Upload-Feld mit accept, URL-Toggle, Upload + Save, Logo in Kunden-Sicht (alt D4–D7)', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await page.waitForSelector('button[type="submit"]', { timeout: 20_000 })

    // alt D4 + D6: file input im DOM, accept auf JPEG/PNG/WebP beschraenkt
    const fileInput = page.locator('input[type="file"]').first()
    expect(await fileInput.count(), 'file input im DOM').toBeGreaterThan(0)
    const accept = await fileInput.getAttribute('accept')
    expect(accept, 'accept gesetzt').not.toBeNull()
    expect(accept, 'accept: jpeg').toMatch(/jpeg/i)
    expect(accept, 'accept: png').toMatch(/png/i)
    expect(accept, 'accept: webp').toMatch(/webp/i)
    expect(accept, 'accept nicht */*').not.toBe('*/*')

    // alt D7: Upload per setInputFiles, Save, API-Check, Kunden-Sicht
    const uploadResponse = page.waitForResponse(r => /\/logo/.test(r.url()) && r.request().method() === 'POST')
    await fileInput.setInputFiles({
      name: 'logo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(SHOP_LOGO_JPEG_B64, 'base64'),
    })
    expect((await uploadResponse).ok(), 'Logo-Upload-Antwort ok').toBe(true)
    await save(page, SAVE_PROFILE)
    expect((await getProfile()).logo_url, 'logo_url nach Upload + Save gesetzt').not.toBeNull()

    await page.goto(`${BASE_URL}/en/shops/${shopSlug}`)
    await expect(page.locator('img[src*="shop_logos"]').first(), 'Logo in Kunden-Sicht').toBeAttached({ timeout: 20_000 })

    // alt D5 (zuletzt: der URL-Modus ersetzt das Upload-Feld und liesse den Save leer zurueck)
    await page.goto('/shop-admin/profile')
    await page.waitForSelector('button[type="submit"]', { timeout: 20_000 })
    const toggleBtn = page.locator('button[type="button"]').filter({ hasText: /url|manual/i })
    expect(await toggleBtn.count(), '"Or enter URL"-Toggle existiert').toBeGreaterThan(0)
    await toggleBtn.first().click()
    await expect(page.locator('input[type="url"]').first(), 'URL-Feld nach Toggle sichtbar').toBeVisible()
  })
})
