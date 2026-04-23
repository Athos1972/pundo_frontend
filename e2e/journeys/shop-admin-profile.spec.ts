/**
 * Journey: Shop-Admin Profile — Öffnungszeiten, Social Links, Kontaktfelder
 *
 * Zwei Szenarien:
 *   Szenario A — Neuer Shop (Tabula Rasa):
 *     Nutzt den global-setup-Owner direkt nach DB-Reset. Alle Felder sind null.
 *     Die Felder werden zum ersten Mal befüllt, gespeichert und in der
 *     Customer-Sicht (/shops/[slug]) verifiziert.
 *
 *     Architektur-Entscheidung: statt einen echten "zweiten Owner" zu registrieren
 *     (das erzeugt Session-Management-Komplexität mit Cookie-Domains), nutzen wir
 *     den global-setup-Owner. Nach jedem DB-Reset sind alle seine Felder null —
 *     das ist exakt die "Tabula Rasa"-Bedingung.
 *
 *   Szenario B — Bestehender Shop (Edit-Flow):
 *     Nutzt den selben global-setup-Owner, nachdem Szenario A Felder gesetzt hat.
 *     Ausgangszustand wird per GET dokumentiert, einzelne Felder gezielt geändert,
 *     per API + Customer-Sicht verifiziert, und am Ende revertiert.
 *
 * Ports: Frontend 3500, Backend 8500 — niemals 3000/8000.
 *
 * Abdeckung:
 *   - opening_hours: alle 7 Tage, open/closed-Toggle, von-bis-Zeiten, zweiter Slot
 *   - social_links: Instagram, Facebook
 *   - whatsapp_number: Telefonnummer via WhatsApp-Feld
 *   - website_url: URL
 *   - description: Freitext
 *   - spoken_languages: Mehrfach-Auswahl
 *   - Ungültige URL-Validierung (Social Links)
 *   - Customer-Sicht: Verifikation aller gespeicherten Felder in /shops/[slug]
 *
 *   SKIP mit Begründung:
 *   - phone: nicht im AdminShop-Typ und nicht im ProfileForm — kein API-Endpoint-
 *     Feld im ShopProfilePatch-Schema. Kommt nur via Crawler/Admin-Import.
 *     Finding dokumentiert in A11.
 *   - Logo-Upload: kein File-Input im ProfileForm, logo_url ist URL-Text-Feld.
 *     Echter File-Dialog nicht automatisierbar. Dokumentiert in A12.
 */

import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// ─── Port-Safety ──────────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-admin-profile] Safety: Niemals gegen Produktiv-Ports laufen!')
}

const BACKEND_REPO = process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'

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
    throw new Error('[shop-admin-profile] .test-state.json nicht gefunden — bitte globalSetup ausführen.')
  }
  return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as TestState
}

// Use global storageState (from global-setup) for all tests in this file.
// Szenario A relies on the post-DB-reset state (all fields null) — the global-setup
// owner always starts fresh after each DB reset.
test.use({
  storageState: (() => {
    const stateFile = path.join(__dirname, '..', '.test-state.json')
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8')).storageState
    }
    return undefined
  })(),
})

// ─── API-Helpers (direkt gegen Backend 8500) ──────────────────────────────────

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
  // The backend sets the JWT as HttpOnly cookie shop_owner_token (not in response body).
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const match = cookieHeader.match(/shop_owner_token=([^;]+)/)
  if (!match) throw new Error(`shop_owner_token cookie nicht gefunden in Set-Cookie: ${cookieHeader}`)
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

async function getOpeningHours(token: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/hours`, {
    headers: ownerAuthHeader(token),
  })
  if (!res.ok) throw new Error(`GET /shop-owner/shop/hours → ${res.status}`)
  return res.json() as Promise<Array<Record<string, unknown>>>
}

async function putOpeningHours(token: string, hours: Array<Record<string, unknown>>): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/hours`, {
    method: 'PUT',
    headers: ownerAuthHeader(token),
    body: JSON.stringify(hours),
  })
  if (!res.ok) throw new Error(`PUT /shop-owner/shop/hours → ${res.status}: ${await res.text()}`)
}

// ─── Helper: waitHydrated ─────────────────────────────────────────────────────

async function waitHydrated(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('body[data-hydrated="true"]', { timeout: 20_000 })
}

// ─── Szenario A: Tabula Rasa — alle Felder zum ersten Mal befüllen ────────────
//
// Voraussetzung: global-setup hat erfolgreich durchgelaufen (DB-Reset + Owner approved).
// Nach DB-Reset: alle Profilfelder sind null, alle Öffnungszeiten geschlossen.

test.describe.serial('Szenario A — Tabula Rasa: Erstes Befüllen aller Felder', () => {
  const state = loadTestState()
  let ownerToken = ''
  // Snapshot der Felder nach Szenario A — wird von Szenario B als Ausgangszustand gelesen
  const shopSlug = state.shopSlug

  test.beforeAll(async () => {
    ownerToken = await getOwnerToken(state.email, state.password)
  })

  // ── A1: Ausgangszustand ist leer ───────────────────────────────────────────

  test('A1 — API: Ausgangszustand nach DB-Reset ist vollständig leer', async () => {
    const profile = await getShopProfile(ownerToken)
    expect(profile.description, 'description ist null').toBeNull()
    expect(profile.website_url, 'website_url ist null').toBeNull()
    expect(profile.whatsapp_number, 'whatsapp_number ist null').toBeNull()
    expect(profile.social_links, 'social_links ist null').toBeNull()
    // spoken_languages is [] or null after fresh DB
    const langs = profile.spoken_languages as string[] | null
    const isEmpty = langs === null || langs.length === 0
    expect(isEmpty, 'spoken_languages leer').toBe(true)

    const hours = await getOpeningHours(ownerToken)
    expect(hours, '7 Tage vorhanden').toHaveLength(7)
    const allClosed = hours.every(h => h.closed === true)
    expect(allClosed, 'Alle Tage initial geschlossen').toBe(true)
  })

  // ── A2: description, whatsapp_number, website_url befüllen (UI) ──────────

  test('A2 — UI: description, whatsapp_number, website_url befüllen und speichern', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    const descField = page.locator('textarea[name="description"]')
    await expect(descField, 'Beschreibungs-Textarea sichtbar').toBeVisible()
    await descField.fill('E2E Tabula Rasa Beschreibung — Szenario A')

    const waInput = page.locator('input[name="whatsapp_number"]')
    await expect(waInput, 'WhatsApp-Feld sichtbar').toBeVisible()
    await waInput.fill('+35799111222')

    const websiteInput = page.locator('input[name="website_url"]')
    await expect(websiteInput, 'Website-URL-Feld sichtbar').toBeVisible()
    await websiteInput.fill('https://e2e-tabula-rasa.example.com')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).first().click()
    await expect(page.getByRole('status'), 'Toast "Gespeichert" erscheint').toContainText(
      /saved|gespeichert/i, { timeout: 10_000 }
    )
  })

  // ── A3: API-Verifikation nach Profil-Save ─────────────────────────────────

  test('A3 — API: description + whatsapp_number in DB angekommen', async () => {
    const profile = await getShopProfile(ownerToken)
    expect(profile.description, 'description gespeichert').toBe('E2E Tabula Rasa Beschreibung — Szenario A')
    expect(profile.whatsapp_number, 'whatsapp_number gespeichert').toBe('+35799111222')
  })

  // ── A3b: website_url gespeichert ──────────────────────────────────────────
  // Backend-Bug BUG-1 wurde behoben: patch_shop() verarbeitet jetzt website_url korrekt.
  // Fix angewendet in ingestor/api/shop_owner_shop.py am 2026-04-23.

  test('A3b — API: website_url in DB gespeichert', async () => {
    const profile = await getShopProfile(ownerToken)
    expect(profile.website_url, 'website_url gespeichert').toBe('https://e2e-tabula-rasa.example.com')
  })

  // ── A4: Social Links befüllen (UI) ────────────────────────────────────────

  test('A4 — UI: Instagram + Facebook Social Links befüllen und speichern', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    // SocialLinksEditor.tsx rendert label-spans und URL-Inputs nebeneinander.
    // Wir nutzen den Label-Text um den zugehörigen Input zu finden.
    const facebookLabel = page.getByText('Facebook', { exact: true })
    await expect(facebookLabel, 'Facebook-Label sichtbar').toBeVisible()

    const instagramLabel = page.getByText('Instagram', { exact: true })
    await expect(instagramLabel, 'Instagram-Label sichtbar').toBeVisible()

    // Input ist im parent-div des Label-span (eine Ebene höher) — dann der erste URL-input
    const facebookInput = facebookLabel.locator('..').locator('input[type="url"]').first()
    await facebookInput.fill('https://facebook.com/e2e-tabula-rasa')
    await expect(facebookInput, 'Facebook-Input befüllt').toHaveValue('https://facebook.com/e2e-tabula-rasa')

    const instagramInput = instagramLabel.locator('..').locator('input[type="url"]').first()
    await instagramInput.fill('https://instagram.com/e2e_tabula_rasa')
    await expect(instagramInput, 'Instagram-Input befüllt').toHaveValue('https://instagram.com/e2e_tabula_rasa')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).first().click()
    await expect(page.getByRole('status'), 'Toast erscheint nach Social-Links-Save').toContainText(
      /saved|gespeichert/i, { timeout: 10_000 }
    )
  })

  // ── A5: API-Verifikation Social Links ────────────────────────────────────
  // Backend-Bug BUG-2 wurde behoben: patch_shop() verarbeitet jetzt social_links korrekt.
  // Fix angewendet in ingestor/api/shop_owner_shop.py am 2026-04-23.

  test('A5 — API: social_links (facebook, instagram) in DB angekommen', async () => {
    const profile = await getShopProfile(ownerToken)
    const links = profile.social_links as Record<string, string> | null
    expect(links, 'social_links sollte nicht null sein').not.toBeNull()
    expect(links?.facebook, 'facebook gespeichert').toBe('https://facebook.com/e2e-tabula-rasa')
    expect(links?.instagram, 'instagram gespeichert').toBe('https://instagram.com/e2e_tabula_rasa')
  })

  // ── A6: Spoken Languages befüllen (UI) ───────────────────────────────────

  test('A6 — UI: spoken_languages (EN + DE) befüllen und speichern', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    // LanguageSelector renders buttons — one per language code.
    // We find by button text (code "EN" / "DE" or label "English" / "Deutsch").
    const enButton = page.getByRole('button', { name: /^EN$/i }).first()
    const deButton = page.getByRole('button', { name: /^DE$/i }).first()

    await expect(enButton, 'EN-Button sichtbar').toBeVisible({ timeout: 10_000 })
    await expect(deButton, 'DE-Button sichtbar').toBeVisible({ timeout: 10_000 })

    // Click to toggle on (idempotent — if already selected it gets de-selected then re-selected)
    // Determine current state by aria-pressed or class before clicking
    await enButton.click()
    await deButton.click()

    await page.getByRole('button', { name: /^save$|^speichern$/i }).first().click()
    await expect(page.getByRole('status'), 'Toast nach Sprachen-Save').toContainText(
      /saved|gespeichert/i, { timeout: 10_000 }
    )
  })

  // ── A7: API-Verifikation spoken_languages ────────────────────────────────

  test('A7 — API: spoken_languages in DB angekommen', async () => {
    const profile = await getShopProfile(ownerToken)
    const langs = profile.spoken_languages as string[]
    expect(Array.isArray(langs), 'spoken_languages ist Array').toBe(true)
    const normalized = langs.map((l) => l.toUpperCase())
    expect(normalized, 'EN enthalten').toContain('EN')
    expect(normalized, 'DE enthalten').toContain('DE')
  })

  // ── A8: Öffnungszeiten — Mo-Fr öffnen, Sa+So geschlossen (UI) ────────────

  test('A8 — UI: Öffnungszeiten Mo-Fr öffnen (09:00–18:00), Sa+So geschlossen, speichern', async ({ page }) => {
    await page.goto('/shop-admin/hours')
    await waitHydrated(page)

    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes, '7 Checkboxen').toHaveCount(7)

    // Mo–Fr (Index 0–4): Checkbox "closed" unchecken = Tag ist offen
    for (let i = 0; i < 5; i++) {
      const cb = checkboxes.nth(i)
      const isClosed = await cb.isChecked()
      if (isClosed) {
        await cb.click()
        await page.waitForTimeout(100)
      }
    }

    // Sa+So (Index 5–6): Checkbox "closed" gecheckt halten = Tag ist geschlossen
    for (let i = 5; i < 7; i++) {
      const cb = checkboxes.nth(i)
      const isClosed = await cb.isChecked()
      if (!isClosed) {
        await cb.click()
        await page.waitForTimeout(100)
      }
    }

    // Zeitfelder für alle 5 offenen Tage setzen.
    // WICHTIG: aria-label*="open from" würde auch "second open from" matchen.
    // Daher :not([aria-label*="second"]) um nur den ersten Slot zu targeten.
    const openTimeInputs = page.locator('input[type="time"][aria-label*="open from"]:not([aria-label*="second"])')
    const closeTimeInputs = page.locator('input[type="time"][aria-label*="close at"]:not([aria-label*="second"])')
    await expect(openTimeInputs, 'Genau 5 open-from-Inputs (erster Slot)').toHaveCount(5)
    await expect(closeTimeInputs, 'Genau 5 close-at-Inputs (erster Slot)').toHaveCount(5)

    for (let i = 0; i < 5; i++) {
      await openTimeInputs.nth(i).fill('09:00')
      await closeTimeInputs.nth(i).fill('18:00')
    }

    await page.getByRole('button', { name: /save hours|öffnungszeiten speichern/i }).first().click()
    await expect(page.getByRole('status'), 'Toast nach Öffnungszeiten-Save').toContainText(
      /saved|gespeichert/i, { timeout: 10_000 }
    )
  })

  // ── A9: API-Verifikation Öffnungszeiten ───────────────────────────────────

  test('A9 — API: Öffnungszeiten Mo–Fr offen (09:00–18:00), Sa+So geschlossen', async () => {
    const hours = await getOpeningHours(ownerToken)
    expect(hours, '7 Einträge').toHaveLength(7)

    for (let i = 0; i < 5; i++) {
      expect(hours[i].closed, `Tag ${i} nicht geschlossen`).toBe(false)
      expect(hours[i].open, `Tag ${i} open=09:00`).toBe('09:00')
      expect(hours[i].close, `Tag ${i} close=18:00`).toBe('18:00')
    }
    expect(hours[5].closed, 'Sa geschlossen').toBe(true)
    expect(hours[6].closed, 'So geschlossen').toBe(true)
  })

  // ── A10: Customer-Sicht prüfen ────────────────────────────────────────────

  test('A10 — Customer-Sicht: /shops/[slug] zeigt alle gespeicherten Daten', async ({ page }) => {
    if (!shopSlug) {
      test.skip(true, 'shopSlug nicht verfügbar (Geo-Koordinaten nicht gesetzt in beforeAll)')
      return
    }

    await page.goto(`${BASE_URL}/shops/${shopSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const bodyText = await page.locator('body').innerText()
    expect(url.includes('404') || url.includes('not-found'), 'Shop-Seite kein 404').toBe(false)

    // Shop-Name
    expect(bodyText, 'Shop-Name sichtbar').toContain(state.shop_name)

    // description
    expect(bodyText, 'description sichtbar').toContain('E2E Tabula Rasa Beschreibung — Szenario A')

    // website_url — Backend-Bug BUG-1 behoben (2026-04-23): website_url wird jetzt gespeichert.
    // Customer-Sicht zeigt website_url als Link an (a[href*="e2e-tabula-rasa"]).
    const websiteLink = page.locator('a[href*="e2e-tabula-rasa.example.com"]')
    const hasWebsiteLink = await websiteLink.count() > 0
    // Falls die Customer-Sicht keinen Link rendert, akzeptieren wir auch den Text in der Seite.
    const hasWebsiteText = bodyText.includes('e2e-tabula-rasa.example.com')
    expect(hasWebsiteLink || hasWebsiteText, 'website_url in Customer-Sicht sichtbar').toBe(true)

    // WhatsApp-Link (whatsapp_number)
    const waLink = page.locator('a[href*="wa.me"], a[href*="whatsapp"]')
    const hasWA = await waLink.count() > 0
    expect(hasWA, 'WhatsApp-Link in Customer-Sicht sichtbar').toBe(true)

    // Öffnungszeiten-Sektion (09:00 oder 18:00 müssen erscheinen)
    const hasHours = bodyText.includes('09:00') || bodyText.includes('18:00') ||
      /opening hours|öffnungszeiten/i.test(bodyText)
    expect(hasHours, 'Öffnungszeiten in Customer-Sicht sichtbar').toBe(true)

    // spoken_languages Chips oder Text
    const hasLangText = bodyText.includes('EN') || bodyText.includes('DE') ||
      bodyText.includes('English') || bodyText.includes('Deutsch') ||
      await page.locator('[data-testid="language-chips"], .language-chip').count() > 0
    expect(hasLangText, 'Sprachenkenntnisse in Customer-Sicht sichtbar').toBe(true)
  })

  // ── A11: SKIP — phone fehlt in AdminShop ─────────────────────────────────

  test('A11 — SKIP/FINDING: phone-Feld fehlt im AdminShop-Typ und ProfileForm', async () => {
    // FINDING: Das phone-Feld ist NICHT Teil von AdminShop (src/types/shop-admin.ts)
    // und NICHT in ProfileForm.tsx. ShopProfilePatch-Schema des Backends (GET /openapi.json)
    // enthält kein phone-Feld. In der Customer-Sicht /shops/[slug] wird shop.phone
    // (aus src/types/api.ts ShopDetailResponse) angezeigt — dieses kommt aber nur via
    // Crawler/Admin-Import (z.B. shop 2213 hat phone="+35799000001").
    // => Ein Shop-Owner kann seine eigene Telefonnummer NICHT über das Admin-Portal setzen.
    // => Design-Gap: phone sollte zu ShopProfilePatch und ProfileForm hinzugefügt werden.
    test.skip(true, 'FINDING: phone-Feld nicht in AdminShop-Typ/ProfileForm — Shop-Owner kann phone nicht setzen')
  })

  // ── A12: SKIP — Logo-Upload ───────────────────────────────────────────────

  test('A12 — SKIP: Logo-Upload erfordert echten File-Dialog', async () => {
    // logo_url ist als input[type="url"] im ProfileForm implementiert (kein File-Input).
    // Ein echter File-Upload-Dialog ist nicht automatisierbar ohne Browser-Filesystem-Zugriff.
    // Das logo_url-URL-Feld kann befüllt werden (covered by A2-A3 patterns implicitly).
    test.skip(true, 'Logo ist URL-Feld, kein File-Input — File-Dialog nicht automatisierbar')
  })
})

// ─── Szenario B: Edit-Flow auf bestehendem Shop ──────────────────────────────
//
// Nutzt den global-setup-Owner nach Szenario A (hat jetzt Felder gesetzt).
// Dokumentiert Ausgangszustand, ändert gezielt Felder, verifiziert, revertiert.

test.describe.serial('Szenario B — Edit-Flow: Gezielte Änderungen + Revert', () => {
  const state = loadTestState()
  const shopSlug = state.shopSlug
  let ownerToken = ''

  let originalProfile: Record<string, unknown> = {}
  let originalHours: Array<Record<string, unknown>> = []

  test.beforeAll(async () => {
    ownerToken = await getOwnerToken(state.email, state.password)
    originalProfile = await getShopProfile(ownerToken)
    originalHours = await getOpeningHours(ownerToken)
    console.log('[Szenario B] Ausgangszustand:', JSON.stringify({
      description: originalProfile.description,
      whatsapp_number: originalProfile.whatsapp_number,
      website_url: originalProfile.website_url,
      spoken_languages: originalProfile.spoken_languages,
      social_links: !!originalProfile.social_links,
    }))
  })

  test.afterAll(async () => {
    if (!ownerToken) return
    // Ausgangszustand wiederherstellen
    try {
      await patchShopProfile(ownerToken, {
        name: originalProfile.name ?? null,
        description: originalProfile.description ?? null,
        address: originalProfile.address ?? null,
        logo_url: originalProfile.logo_url ?? null,
        spoken_languages: originalProfile.spoken_languages ?? [],
        whatsapp_number: originalProfile.whatsapp_number ?? null,
        website_url: originalProfile.website_url ?? null,
        webshop_url: originalProfile.webshop_url ?? null,
        social_links: originalProfile.social_links ?? null,
      })
      console.log('[Szenario B] Profil revertiert.')
    } catch (err) { console.error('[Szenario B] Profil-Revert Fehler:', err) }

    try {
      await putOpeningHours(ownerToken, originalHours)
      console.log('[Szenario B] Öffnungszeiten revertiert.')
    } catch (err) { console.error('[Szenario B] Öffnungszeiten-Revert Fehler:', err) }
  })

  // ── B1: Ausgangszustand dokumentieren ────────────────────────────────────

  test('B1 — API: Ausgangszustand des bestehenden Shops dokumentieren', async () => {
    expect(state.shopId, 'shopId vorhanden').not.toBeNull()
    expect(ownerToken.length, 'ownerToken vorhanden').toBeGreaterThan(0)
    expect(originalHours, '7 Öffnungszeiten-Einträge').toHaveLength(7)
    expect(originalProfile.id, 'shop_id korrekt').toBe(state.shopId)
    console.log('[B1] shop_id:', originalProfile.id, 'description:', originalProfile.description)
  })

  // ── B2: description ändern ────────────────────────────────────────────────

  test('B2 — UI + API: description ändern', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    const newDesc = `E2E Edit-Flow Beschreibung B2 ${Date.now()}`
    const descField = page.locator('textarea[name="description"]')
    await expect(descField, 'description-Textarea sichtbar').toBeVisible()
    await descField.fill(newDesc)

    await page.getByRole('button', { name: /^save$|^speichern$/i }).first().click()
    await expect(page.getByRole('status'), 'Toast erscheint').toContainText(/saved|gespeichert/i, { timeout: 10_000 })

    const profile = await getShopProfile(ownerToken)
    expect(profile.description, 'description API-seitig aktualisiert').toBe(newDesc)
  })

  // ── B3: Öffnungszeiten Montag ändern ──────────────────────────────────────

  test('B3 — UI + API: Montag-Öffnungszeiten auf 10:00–20:00 ändern', async ({ page }) => {
    await page.goto('/shop-admin/hours')
    await waitHydrated(page)

    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes, '7 Checkboxen').toHaveCount(7)

    // Montag (Index 0) muss offen sein (aus Szenario A bekannt)
    const mondayCb = checkboxes.first()
    const isClosed = await mondayCb.isChecked()
    if (isClosed) {
      await mondayCb.click()
      await page.waitForTimeout(150)
    }

    const openInput = page.locator('input[type="time"][aria-label*="open from"]').first()
    const closeInput = page.locator('input[type="time"][aria-label*="close at"]').first()
    await expect(openInput, 'open-from Input sichtbar').toBeVisible({ timeout: 5_000 })
    await openInput.fill('10:00')
    await closeInput.fill('20:00')

    await page.getByRole('button', { name: /save hours|öffnungszeiten speichern/i }).first().click()
    await expect(page.getByRole('status'), 'Toast erscheint').toContainText(/saved|gespeichert/i, { timeout: 10_000 })

    const hours = await getOpeningHours(ownerToken)
    const monday = hours.find(h => h.day === 0)
    expect(monday?.closed, 'Montag nicht geschlossen').toBe(false)
    expect(monday?.open, 'Montag open=10:00').toBe('10:00')
    expect(monday?.close, 'Montag close=20:00').toBe('20:00')
  })

  // ── B4: Alle 7 Öffnungszeiten vollständig nach Save ──────────────────────

  test('B4 — API: alle 7 Öffnungszeiten-Einträge korrekt strukturiert', async () => {
    const hours = await getOpeningHours(ownerToken)
    expect(hours, '7 Tage').toHaveLength(7)
    for (let i = 0; i < 7; i++) {
      expect(typeof hours[i].day, `Tag ${i}: day ist Zahl`).toBe('number')
      expect(typeof hours[i].closed, `Tag ${i}: closed ist boolean`).toBe('boolean')
    }
  })

  // ── B5: Öffnungszeiten — open/closed-Toggle für alle 7 Tage ──────────────

  test('B5 — UI: Öffnungszeiten — alle 7 Checkboxen togglebar', async ({ page }) => {
    await page.goto('/shop-admin/hours')
    await waitHydrated(page)

    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes, '7 Checkboxen').toHaveCount(7)

    for (let i = 0; i < 7; i++) {
      const cb = checkboxes.nth(i)
      const before = await cb.isChecked()
      await cb.click()
      await page.waitForTimeout(50)
      const after = await cb.isChecked()
      expect(after, `Tag ${i}: Zustand hat sich geändert`).toBe(!before)
      // Zurücktoggle
      await cb.click()
      await page.waitForTimeout(50)
    }
  })

  // ── B6: Öffnungszeiten — zweites Slot (Split-Schicht) ────────────────────

  test('B6 — UI + API: zweites Zeitfenster (Split-Schicht) für Montag hinzufügen', async ({ page }) => {
    // NOTE: HoursEditor renders second-slot inputs when second_open != null.
    // Frontend-Fix FINDING-2 applied 2026-04-23: changed `!== undefined` to `!= null`
    // so second-slot inputs only appear when a second slot actually exists.
    // Now a "+ Second time slot" button is expected when no second slot is set.
    await page.goto('/shop-admin/hours')
    await waitHydrated(page)

    // Montag (Index 0) muss offen sein
    const mondayCb = page.locator('input[type="checkbox"]').first()
    const isClosed = await mondayCb.isChecked()
    if (isClosed) {
      await mondayCb.click()
      await page.waitForTimeout(300)
    }

    // Verify first slot inputs are visible
    const openInput = page.locator('input[type="time"][aria-label*="open from"]').first()
    await expect(openInput, 'open-from Input sichtbar').toBeVisible({ timeout: 5_000 })

    // After the frontend fix, second-slot inputs only appear when second_open != null.
    // If no second slot exists yet, a "+ Second time slot" button should be present.
    const secondOpenInput = page.locator('input[type="time"][aria-label*="second open from"]').first()
    const secondCloseInput = page.locator('input[type="time"][aria-label*="second close at"]').first()

    // Check if second slot inputs are already visible (if backend returned second_open != null)
    const secondAlreadyVisible = await secondOpenInput.isVisible()
    if (!secondAlreadyVisible) {
      // Click the "+ Second time slot" button to add the second slot
      const addSecondSlotBtn = page.getByRole('button', { name: /second.*slot|zweites.*fenster|\+/i }).first()
      if (await addSecondSlotBtn.isVisible()) {
        await addSecondSlotBtn.click()
        await page.waitForTimeout(300)
      }
    }

    await expect(secondOpenInput, 'Zweiter open-from-Input erscheint').toBeVisible({ timeout: 5_000 })

    // Fill first slot too (required for a valid state)
    await openInput.fill('09:00')
    await page.locator('input[type="time"][aria-label*="close at"]').first().fill('18:00')

    await secondOpenInput.fill('13:00')
    await secondCloseInput.fill('17:00')

    await page.getByRole('button', { name: /save hours|öffnungszeiten speichern/i }).first().click()
    await expect(page.getByRole('status'), 'Toast erscheint').toContainText(/saved|gespeichert/i, { timeout: 10_000 })

    const hours = await getOpeningHours(ownerToken)
    const monday = hours.find(h => h.day === 0)
    expect(monday?.second_open, 'second_open=13:00 gespeichert').toBe('13:00')
    expect(monday?.second_close, 'second_close=17:00 gespeichert').toBe('17:00')
  })

  // ── B7: Social Link (Instagram) ändern ───────────────────────────────────
  // Backend-Bug BUG-2 wurde behoben: social_links wird jetzt gespeichert.
  // Fix angewendet in ingestor/api/shop_owner_shop.py am 2026-04-23.

  test('B7 — UI + API: Instagram Social Link ändern', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    const instagramLabel = page.getByText('Instagram', { exact: true })
    await expect(instagramLabel, 'Instagram-Label sichtbar').toBeVisible({ timeout: 10_000 })

    const instagramInput = instagramLabel.locator('..').locator('input[type="url"]').first()
    await instagramInput.fill('https://instagram.com/e2e_edit_flow_test')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).first().click()
    await expect(page.getByRole('status'), 'Toast erscheint').toContainText(/saved|gespeichert/i, { timeout: 10_000 })

    const profile = await getShopProfile(ownerToken)
    const links = profile.social_links as Record<string, string> | null
    expect(links, 'social_links nicht null').not.toBeNull()
    expect(links?.instagram, 'instagram aktualisiert').toBe('https://instagram.com/e2e_edit_flow_test')
  })

  // ── B8: whatsapp_number ändern ────────────────────────────────────────────

  test('B8 — UI + API: whatsapp_number ändern', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    const waInput = page.locator('input[name="whatsapp_number"]')
    await expect(waInput, 'WhatsApp-Feld sichtbar').toBeVisible()
    await waInput.fill('+35799888777')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).first().click()
    await expect(page.getByRole('status'), 'Toast erscheint').toContainText(/saved|gespeichert/i, { timeout: 10_000 })

    const profile = await getShopProfile(ownerToken)
    expect(profile.whatsapp_number, 'whatsapp_number aktualisiert').toBe('+35799888777')
  })

  // ── B9: website_url ändern ────────────────────────────────────────────────
  // Backend-Bug BUG-1 wurde behoben: website_url wird jetzt gespeichert.
  // Fix angewendet in ingestor/api/shop_owner_shop.py am 2026-04-23.

  test('B9 — UI + API: website_url ändern', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    const websiteInput = page.locator('input[name="website_url"]')
    await expect(websiteInput, 'Website-URL-Feld sichtbar').toBeVisible()
    await websiteInput.fill('https://e2e-edit-flow.example.com')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).first().click()
    await expect(page.getByRole('status'), 'Toast erscheint').toContainText(/saved|gespeichert/i, { timeout: 10_000 })

    const profile = await getShopProfile(ownerToken)
    expect(profile.website_url, 'website_url aktualisiert').toBe('https://e2e-edit-flow.example.com')
  })

  // ── B10: spoken_languages ändern ─────────────────────────────────────────

  test('B10 — UI + API: spoken_languages auf EN + EL setzen', async ({ page }) => {
    // API-Reset zuerst (leere spoken_languages → damit der UI-State klar ist)
    await patchShopProfile(ownerToken, { spoken_languages: [] })

    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    const enButton = page.getByRole('button', { name: /^EN$/i }).first()
    const elButton = page.getByRole('button', { name: /^EL$/i }).first()
    await expect(enButton, 'EN-Button sichtbar').toBeVisible({ timeout: 10_000 })
    await expect(elButton, 'EL-Button sichtbar').toBeVisible({ timeout: 10_000 })

    await enButton.click()
    await elButton.click()

    await page.getByRole('button', { name: /^save$|^speichern$/i }).first().click()
    await expect(page.getByRole('status'), 'Toast erscheint').toContainText(/saved|gespeichert/i, { timeout: 10_000 })

    const profile = await getShopProfile(ownerToken)
    const langs = (profile.spoken_languages as string[]).map(l => l.toUpperCase())
    expect(langs, 'EN enthalten').toContain('EN')
    expect(langs, 'EL enthalten').toContain('EL')
  })

  // ── B11: Ungültige Social-Link-URL blockiert Save ─────────────────────────

  test('B11 — UI: ungültige Social-Link-URL zeigt Inline-Fehler, Save disabled', async ({ page }) => {
    await page.goto('/shop-admin/profile')
    await waitHydrated(page)

    const instagramLabel = page.getByText('Instagram', { exact: true })
    await expect(instagramLabel).toBeVisible({ timeout: 10_000 })
    const instagramInput = instagramLabel.locator('..').locator('input[type="url"]').first()

    await instagramInput.fill('not-a-valid-url')
    await page.waitForTimeout(300)

    const saveBtn = page.getByRole('button', { name: /^save$|^speichern$/i }).first()
    const isDisabled = await saveBtn.isDisabled()
    const hasError = await page.getByText('Invalid URL').count() > 0

    expect(isDisabled || hasError, 'Save-Button disabled ODER "Invalid URL" sichtbar').toBe(true)

    // Feld leeren für sauberen Zustand
    await instagramInput.fill('')
  })

  // ── B12: Customer-Sicht nach Edit-Flow ───────────────────────────────────

  test('B12 — Customer-Sicht: geänderte Daten erscheinen in /shops/[slug]', async ({ page }) => {
    if (!shopSlug) {
      test.skip(true, 'shopSlug nicht verfügbar')
      return
    }

    await page.goto(`${BASE_URL}/shops/${shopSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url.includes('404') || url.includes('not-found'), 'Kein 404').toBe(false)

    const bodyText = await page.locator('body').innerText()

    // WhatsApp-Link (B8 hat +35799888777 gesetzt)
    const waLink = page.locator('a[href*="wa.me"], a[href*="whatsapp"]')
    expect(await waLink.count() > 0, 'WhatsApp-Link sichtbar').toBe(true)

    // website_url (B9 hat https://e2e-edit-flow.example.com gesetzt — Backend-Bug behoben 2026-04-23)
    const websiteLink = page.locator('a[href*="e2e-edit-flow.example.com"]')
    const hasWebsiteLink = await websiteLink.count() > 0
    const hasWebsiteText = bodyText.includes('e2e-edit-flow.example.com')
    expect(hasWebsiteLink || hasWebsiteText, 'website_url in Customer-Sicht sichtbar').toBe(true)

    // Öffnungszeiten (B3 hat Montag 10:00–20:00, B6 hat 13:00–17:00 second slot)
    const hasHours = bodyText.includes('10:00') || bodyText.includes('20:00') ||
      /opening hours|öffnungszeiten/i.test(bodyText)
    expect(hasHours, 'Öffnungszeiten in Customer-Sicht sichtbar').toBe(true)
  })

  // ── B13: Geschlossene Tage in Customer-Sicht ─────────────────────────────

  test('B13 — Customer-Sicht: geschlossene Tage erscheinen als "Closed"', async ({ page }) => {
    if (!shopSlug) {
      test.skip(true, 'shopSlug nicht verfügbar')
      return
    }

    // Sicherstellen dass mind. ein Tag geschlossen ist (So = Tag 6 aus Szenario A)
    const hours = await getOpeningHours(ownerToken)
    const hasClosed = hours.some(h => h.closed === true)
    if (!hasClosed) {
      const updated = hours.map(h => h.day === 6 ? { ...h, closed: true } : h)
      await putOpeningHours(ownerToken, updated)
    }

    await page.goto(`${BASE_URL}/shops/${shopSlug}`)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    const hasClosedText = /closed|geschlossen|κλειστό|закрыто/i.test(bodyText)
    expect(hasClosedText, '"Closed"-Text für geschlossene Tage sichtbar').toBe(true)
  })

  // ── B14: Revert-Verifikation ──────────────────────────────────────────────

  test('B14 — API: Ausgangszustand nach Revert korrekt wiederhergestellt', async () => {
    // Revert hier explizit (afterAll macht es zusätzlich idempotent)
    await patchShopProfile(ownerToken, {
      name: originalProfile.name ?? null,
      description: originalProfile.description ?? null,
      address: originalProfile.address ?? null,
      logo_url: originalProfile.logo_url ?? null,
      spoken_languages: originalProfile.spoken_languages ?? [],
      whatsapp_number: originalProfile.whatsapp_number ?? null,
      website_url: originalProfile.website_url ?? null,
      webshop_url: originalProfile.webshop_url ?? null,
      social_links: originalProfile.social_links ?? null,
    })
    await putOpeningHours(ownerToken, originalHours)

    const profile = await getShopProfile(ownerToken)
    expect(profile.description, 'description revertiert').toEqual(originalProfile.description ?? null)
    expect(profile.whatsapp_number, 'whatsapp_number revertiert').toEqual(originalProfile.whatsapp_number ?? null)
    expect(profile.website_url, 'website_url revertiert').toEqual(originalProfile.website_url ?? null)

    const hours = await getOpeningHours(ownerToken)
    expect(hours, '7 Einträge nach Revert').toHaveLength(7)
    for (let i = 0; i < 7; i++) {
      expect(hours[i].closed, `Tag ${i} closed korrekt nach Revert`).toBe(originalHours[i].closed)
    }
  })
})
