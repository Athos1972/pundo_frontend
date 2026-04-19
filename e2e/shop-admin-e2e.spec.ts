/**
 * E2E-Tests: Authentifizierter Shop-Admin Flow
 *
 * Voraussetzungen:
 *   - global-setup.ts hat erfolgreich durchlaufen
 *   - Backend läuft auf Port 8002 gegen pundo_test
 *   - Frontend läuft auf Port 3002 (next start, Standalone-Build)
 *
 * Testet den vollständigen Shop-Owner-Workflow:
 *   Login → Dashboard → Profil → Öffnungszeiten → Produkte → Angebote
 */

import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Lädt den Storage State (JWT-Cookie) aus dem global-setup
function loadStorageState() {
  const stateFile = path.join(__dirname, '.test-state.json')
  if (!fs.existsSync(stateFile)) {
    throw new Error(
      '[shop-admin-e2e] .test-state.json nicht gefunden. ' +
      'Bitte globalSetup ausführen (playwright.config.ts → globalSetup).'
    )
  }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
  return state as {
    email: string
    password: string
    shop_name: string
    shop_address: string
    ownerId: number
    storageState: Parameters<typeof test.use>[0]['storageState']
  }
}

// Alle Tests in dieser Datei verwenden den gespeicherten Auth-State
test.use({
  storageState: (() => {
    const stateFile = path.join(__dirname, '.test-state.json')
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8')).storageState
    }
    return undefined
  })(),
})

// Helper: Wait for React hydration (production build)
// networkidle alone is insufficient — React attaches event handlers asynchronously after JS loads.
// We use a data-hydrated marker set by useEffect in Toast.tsx / LoginForm,
// which only executes after React has completed hydration.
async function waitHydrated(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('body[data-hydrated="true"]', { timeout: 15_000 })
}

// ─── Login-Seite ───────────────────────────────────────────────────────────────

test.describe('Login', () => {
  // Login-Test ohne gespeicherten State — frische Session
  test.use({ storageState: undefined })

  test('login mit korrekten Daten leitet zu Dashboard weiter', async ({ page }) => {
    const state = loadStorageState()
    await page.goto('/shop-admin/login')
    await waitHydrated(page)  // Wait for React hydration before interacting
    await page.locator('input[name="email"]').fill(state.email)
    await page.locator('input[name="password"]').fill(state.password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/shop-admin\/dashboard/, { timeout: 15_000 })
  })

  test('login mit falschem Passwort zeigt Fehlermeldung', async ({ page }) => {
    const state = loadStorageState()
    await page.goto('/shop-admin/login')
    await waitHydrated(page)
    await page.locator('input[name="email"]').fill(state.email)
    await page.locator('input[name="password"]').fill('WrongPassword!')
    await page.locator('button[type="submit"]').click()
    // Bleibt auf Login-Seite oder zeigt Fehler
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).toContain('/shop-admin/login')
  })
})

// ─── Dashboard ────────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test('Dashboard lädt ohne Fehler', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/shop-admin/dashboard')
    await expect(page).toHaveURL(/\/shop-admin\/dashboard/)
    expect(errors).toHaveLength(0)
  })

  test('Navigation zeigt alle Menüpunkte', async ({ page }) => {
    await page.goto('/shop-admin/dashboard')
    await expect(page.getByRole('link', { name: /dashboard/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /products|produkte/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /offers|angebote/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /api keys/i }).first()).toBeVisible()
  })
})

// ─── Profil ────────────────────────────────────────────────────────────────────

test.describe('Shop Profil', () => {
  test('Profil-Seite lädt mit Shop-Daten', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    // Shop-Name soll vorausgefüllt sein
    const nameInput = page.locator('input[name="name"]')
    await expect(nameInput).toBeVisible()
    const value = await nameInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('Profil speichern funktioniert', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitHydrated(page)
    const descField = page.locator('textarea[name="description"]')
    await descField.fill('Automatisch getestete Beschreibung – E2E')
    // Use role=button with name to avoid strict mode violations
    await page.getByRole('button', { name: /^save$|^speichern$|^gespeichert/i }).first().click()
    // Toast "Saved" soll erscheinen
    await expect(page.getByRole('status')).toContainText(/saved|gespeichert/i, { timeout: 10_000 })
  })

  test('Social Links Felder sichtbar auf Profil-Seite', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    // Wait for form to be rendered (no waitHydrated — ToastProvider not guaranteed before interaction)
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10_000 })
    // Kontaktfelder
    await expect(page.locator('input[name="whatsapp_number"]')).toBeVisible()
    await expect(page.locator('input[name="website_url"]')).toBeVisible()
    await expect(page.locator('input[name="webshop_url"]')).toBeVisible()
    // Social Links Sektion (festes Set)
    await expect(page.getByText('Facebook')).toBeVisible()
    await expect(page.getByText('Instagram')).toBeVisible()
    await expect(page.getByText('TikTok')).toBeVisible()
  })

  test('Social Links Felder befüllbar und Save-Button bleibt aktiv', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10_000 })

    // WhatsApp-Nummer befüllen
    const waInput = page.locator('input[name="whatsapp_number"]')
    await waInput.fill('+35799000001')
    await expect(waInput).toHaveValue('+35799000001')

    // Instagram-URL befüllen (4. URL-Input: 0=logo, 1=website, 2=webshop, 3=facebook, 4=instagram)
    const igInput = page.locator('input[type="url"][placeholder="https://..."]').nth(4)
    await igInput.fill('https://instagram.com/testshop_e2e')
    await expect(igInput).toHaveValue('https://instagram.com/testshop_e2e')

    // Save-Button muss nach gültiger Eingabe aktiviert bleiben (keine Validierungsfehler)
    const saveBtn = page.getByRole('button', { name: /^save$|^speichern$/i }).first()
    await expect(saveBtn).toBeEnabled()
    // Kein Inline-Fehler sichtbar
    await expect(page.getByText('Invalid URL')).not.toBeVisible()
  })
})

// ─── Öffnungszeiten ──────────────────────────────────────────────────────────

test.describe('Öffnungszeiten', () => {
  test('Öffnungszeiten-Seite zeigt 7 Checkboxen', async ({ page }) => {
    await page.goto('/shop-admin/hours')
    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes).toHaveCount(7)
  })

  test('Öffnungszeiten speichern funktioniert', async ({ page }) => {
    await page.goto('/shop-admin/hours')
    await waitHydrated(page)
    // New shops have all days closed by default — uncheck the first day to open it
    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    const isClosed = await firstCheckbox.isChecked()
    if (isClosed) await firstCheckbox.click()
    // Ersten Tag auf 09:00–18:00 setzen (aria-label immer auf Englisch "open from" / "close at")
    await page.locator('input[type="time"][aria-label*="open from"]').first().fill('09:00')
    await page.locator('input[type="time"][aria-label*="close at"]').first().fill('18:00')
    // Save button — use role to be specific
    await page.getByRole('button', { name: /save hours|öffnungszeiten speichern|save/i }).first().click()
    await expect(page.getByRole('status')).toContainText(/saved|gespeichert/i, { timeout: 10_000 })
  })
})

// ─── Produkte ────────────────────────────────────────────────────────────────

test.describe('Produkte CRUD', () => {
  const TEST_PRODUCT = 'E2E Testprodukt Olivenöl'

  test('Produkt anlegen', async ({ page }) => {
    await page.goto('/shop-admin/products/new')
    await waitHydrated(page)
    await page.locator('input[name="name"]').fill(TEST_PRODUCT)
    await page.locator('input[name="price"]').fill('4.99')
    await page.locator('input[name="unit"]').fill('l')
    // Select first real category (index 1, after the "—" placeholder at index 0)
    await page.locator('select[name="category_id"]').selectOption({ index: 1 })
    // Submit via role (logout button is now type="button", not type="submit")
    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    // Nach erfolgreichem Anlegen zurück zur Produktliste
    await expect(page).toHaveURL(/\/shop-admin\/products$/, { timeout: 15_000 })
    await expect(page.getByText(TEST_PRODUCT).first()).toBeVisible()
  })

  test('Produkt bearbeiten', async ({ page }) => {
    await page.goto('/shop-admin/products')
    await waitHydrated(page)
    // Edit-Link des ersten Produkts klicken
    const editLink = page.getByRole('link', { name: /edit|bearbeiten/i }).first()
    await editLink.click()
    await expect(page).toHaveURL(/\/edit/)
    await waitHydrated(page)
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill(`${TEST_PRODUCT} (bearbeitet)`)
    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/products$/, { timeout: 15_000 })
    await expect(page.getByText(/bearbeitet/)).toBeVisible()
  })

  test('Produkt löschen', async ({ page }) => {
    await page.goto('/shop-admin/products')
    await waitHydrated(page)
    // Click Delete → wait for Cancel button (confirms React committed the confirm state) → click Delete again
    await page.getByRole('button', { name: /delete|löschen/i }).first().click()
    await page.getByRole('button', { name: /cancel|abbrechen/i }).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: /delete|löschen/i }).first().click()
    // Produkt verschwindet aus Liste
    await expect(page.getByText(/bearbeitet/)).not.toBeVisible({ timeout: 10_000 })
  })
})

// ─── Angebote ────────────────────────────────────────────────────────────────

test.describe('Angebote CRUD', () => {
  const TEST_OFFER = 'E2E Sommer-Angebot 2026'

  test('Angebot anlegen', async ({ page }) => {
    await page.goto('/shop-admin/offers/new')
    await waitHydrated(page)
    await page.locator('input[name="title"]').fill(TEST_OFFER)
    await page.locator('input[name="price"]').fill('3.50')
    await page.locator('input[name="valid_from"]').fill('2026-06-01')
    await page.locator('input[name="valid_until"]').fill('2026-08-31')
    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    await expect(page.getByText(TEST_OFFER)).toBeVisible()
  })

  test('Angebot archivieren', async ({ page }) => {
    await page.goto('/shop-admin/offers')
    await waitHydrated(page)
    // Click Archive → wait for Cancel button → click Archive to confirm
    await page.getByRole('button', { name: /archive|archivieren/i }).first().click()
    await page.getByRole('button', { name: /cancel|abbrechen/i }).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: /archive|archivieren/i }).first().click()
    // Angebot verschwindet aus Active-Tab
    await expect(page.getByText(TEST_OFFER)).not.toBeVisible({ timeout: 10_000 })
    // Im Expired-Tab sichtbar (use .first() to avoid strict mode if duplicates)
    await page.getByRole('button', { name: /expired|abgelaufen/i }).click()
    await expect(page.getByText(TEST_OFFER).first()).toBeVisible()
  })
})

// ─── API Keys ────────────────────────────────────────────────────────────────

test.describe('API Keys', () => {
  test('API Key anlegen zeigt einmaligen Key', async ({ page }) => {
    await page.goto('/shop-admin/api-keys')
    await waitHydrated(page)
    // Click "Add" button (renders as "+ New API key")
    await page.getByRole('button', { name: /new api key|neuer api-key/i }).click()
    // Formular ausfüllen — aria-label ist der key_name string
    await page.locator('input[name="name"]').fill('E2E Test Key')
    await page.locator('select[name="scope"]').selectOption('read')
    await page.getByRole('button', { name: /new api key|add|neuer api-key|hinzufügen/i }).first().click()
    // Key wird einmalig angezeigt
    await expect(page.getByText(/shown only once|wird nur einmal/i)).toBeVisible({ timeout: 10_000 })
    // Key beginnt mit einem erkennbaren Muster (alphanumerisch, mind. 10 Zeichen)
    const keyEl = page.locator('code')
    await expect(keyEl).toBeVisible()
    const keyText = await keyEl.textContent()
    expect(keyText?.length).toBeGreaterThan(10)
  })

  test('API Key löschen', async ({ page }) => {
    await page.goto('/shop-admin/api-keys')
    await waitHydrated(page)
    // Click Delete → wait for Cancel to appear → click Delete to confirm
    await page.getByRole('button', { name: /delete|löschen/i }).first().click()
    await page.getByRole('button', { name: /cancel|abbrechen/i }).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: /delete|löschen/i }).first().click()
    // Key ist weg
    await expect(page.getByText('E2E Test Key').first()).not.toBeVisible({ timeout: 10_000 })
  })
})

// ─── Logout ───────────────────────────────────────────────────────────────────

test.describe('Logout', () => {
  test('Logout leitet zur Login-Seite weiter', async ({ page }) => {
    await page.goto('/shop-admin/dashboard')
    await waitHydrated(page)
    // Logout button is now type="button" (not type="submit") with onClick handler
    const logoutBtn = page.getByRole('button', { name: /sign out|ausloggen|logout/i })
    await logoutBtn.first().click()
    await expect(page).toHaveURL(/\/shop-admin\/login/, { timeout: 10_000 })
  })
})
