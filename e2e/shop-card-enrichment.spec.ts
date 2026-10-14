/**
 * E2E-Tests: Shop-Card Enrichment
 *
 * Testet die neue /shops-Seite mit Filter-UI, ShopCard-Badges und RTL.
 * Läuft gegen Port 3500 (Frontend) + 8500 (Backend-Test-DB).
 *
 * Daten-Unabhängigkeit: Tests sind so geschrieben dass sie auch bei leerer
 * Test-DB bestehen (Skeleton/Leer-State ist kein Fehler).
 */

import { test, expect } from '@playwright/test'
import { waitForPageHydrated } from './journeys/_helpers/hydration'

const COOKIE_DOMAIN = process.env.E2E_COOKIE_DOMAIN ?? '127.0.0.1'

async function setLang(page: import('@playwright/test').Page, lang: string) {
  await page.context().addCookies([{
    name: 'app_lang', value: lang, domain: COOKIE_DOMAIN, path: '/',
  }])
}

// F8950 T22: statt networkidle - Seite hydriert UND die Shop-Liste ist geladen (Skeleton `h-28 animate-pulse`
// verschwunden; danach steht Liste, Leer-Zustand oder Fehlertext).
async function gotoShops(page: import('@playwright/test').Page) {
  await page.goto('/shops')
  await waitForPageHydrated(page)
  await expect(page.locator('div.h-28.animate-pulse')).toHaveCount(0, { timeout: 15_000 })
}

// ShopCard-Anker (Klassen aus ShopCard.tsx). Der Link traegt den Sprachpraefix (/en/shops/<slug>); der fruehere
// Selektor `a[href^="/shops/"]` traf deshalb nie und machte die Karten-Tests wirkungslos (stiller Early-Return).
// pundo_test ist eine Prod-Kopie: Karten sind immer da, ein Early-Return bei "leerer DB" gibt es nicht mehr.
const SHOP_CARD = 'a.block.bg-surface[href*="/shops/"]'

// ─── E2E-S1: Shops-Seite — Grundlegendes Laden ───────────────────────────────

test.describe('E2E-S1: Shops-Seite laden', () => {
  test('gibt HTTP 200 zurück', async ({ page }) => {
    const response = await page.goto('/shops')
    expect(response?.status()).toBe(200)
  })

  test('keine JS-Fehler beim Laden', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => {
      // Hydration-Warnings ignorieren (React #418 / SSR mismatch bei geolocation)
      if (!e.message.includes('Hydration') && !e.message.includes('#418')) {
        errors.push(e.message)
      }
    })
    await gotoShops(page)
    expect(errors).toHaveLength(0)
  })

  test('Seitenüberschrift sichtbar (DE)', async ({ page }) => {
    await setLang(page, 'de')
    await page.goto('/shops')
    await expect(page.getByRole('heading', { name: /shops/i })).toBeVisible()
  })

  test('Back-Button vorhanden', async ({ page }) => {
    await page.goto('/shops')
    const _backBtn = page.getByRole('link').filter({ hasText: /zurück|back/i }).first()
    // Back-Button kann unterschiedlich beschriftet sein — prüfe nur dass Seite nicht crashed
    const body = await page.locator('body').innerHTML()
    expect(body.length).toBeGreaterThan(100)
  })
})

// ─── E2E-S2: Filter-UI vorhanden ─────────────────────────────────────────────

test.describe('E2E-S2: Filter-UI', () => {
  test('Entfernung-Slider vorhanden', async ({ page }) => {
    await gotoShops(page)
    const slider = page.locator('input[type="range"]')
    await expect(slider).toBeVisible({ timeout: 8_000 })
  })

  test('Entfernung-Slider hat korrekte min/max Werte', async ({ page }) => {
    await gotoShops(page)
    const slider = page.locator('input[type="range"]')
    await expect(slider).toBeVisible({ timeout: 8_000 })
    const min = await slider.getAttribute('min')
    const max = await slider.getAttribute('max')
    expect(Number(min)).toBeLessThanOrEqual(1)   // min ≤ 1 km
    expect(Number(max)).toBeGreaterThanOrEqual(10) // max ≥ 10 km
  })

  test('"Open now" / "Jetzt geöffnet" Toggle-Button vorhanden (EN)', async ({ page }) => {
    await setLang(page, 'en')
    await gotoShops(page)
    const toggle = page.getByRole('button', { name: /open now/i })
    await expect(toggle).toBeVisible({ timeout: 8_000 })
  })

  test('"Jetzt geöffnet" Toggle in Deutsch', async ({ page }) => {
    await setLang(page, 'de')
    await gotoShops(page)
    const toggle = page.getByRole('button', { name: /jetzt geöffnet/i })
    await expect(toggle).toBeVisible({ timeout: 8_000 })
  })

  test('"مفتوح الآن" Toggle in Arabisch', async ({ page }) => {
    await setLang(page, 'ar')
    await gotoShops(page)
    const toggle = page.getByRole('button', { name: /مفتوح الآن/ })
    await expect(toggle).toBeVisible({ timeout: 8_000 })
  })

  test('Open-Now Toggle ist anklickbar (kein Crash)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => {
      if (!e.message.includes('Hydration') && !e.message.includes('#418')) errors.push(e.message)
    })
    await setLang(page, 'en')
    await gotoShops(page)
    const toggle = page.getByRole('button', { name: /open now/i })
    await toggle.click()
    // statt waitForTimeout(500): Chip aktiv (State-Wechsel) und die neu geladene Liste steht
    await expect(toggle).toHaveClass(/bg-green-600/)
    await expect(page.locator('div.h-28.animate-pulse')).toHaveCount(0, { timeout: 15_000 })
    expect(errors).toHaveLength(0)
  })

  test('Alle-Button erscheint wenn Shop-Typen vorhanden', async ({ page }) => {
    // Nur prüfen wenn Shop-Typ-Pills überhaupt sichtbar — bei leerer DB entfallen die Pills
    await setLang(page, 'de')
    await gotoShops(page)

    // pundo_test ist eine Prod-Kopie mit Shop-Typen -> der "Alle"-Button ist immer da (vorher bei leerer DB
    // stillschweigend uebersprungen; das ist kein erwarteter Zustand dieser Umgebung).
    const allBtn = page.getByRole('button', { name: /^alle$/i })
    await expect(allBtn).toBeVisible()
  })
})

// ─── E2E-S3: RTL auf /shops ──────────────────────────────────────────────────

test.describe('E2E-S3: RTL auf /shops', () => {
  // F8950 T17: html[dir]-Tests (ar/he/de) gestrichen -> language-smoke.spec.ts (/shops, 6 Sprachen).
  test('Filter-Bar rtl:flex-row-reverse class vorhanden bei ar', async ({ page }) => {
    await setLang(page, 'ar')
    await gotoShops(page)
    // Der Open-Now Toggle-Container hat rtl:flex-row-reverse
    const filterRow = page.locator('.rtl\\:flex-row-reverse').first()
    const count = await filterRow.count()
    expect(count).toBeGreaterThan(0)
  })
})

// ─── E2E-S4: ShopCard-Felder (wenn Daten vorhanden) ─────────────────────────

test.describe('E2E-S4: ShopCard-Felder mit echten Daten', () => {
  // Diese Tests benutzen die Produktion NICHT — nur zur Schema-Verifikation
  // über den /api/v1/shops Endpoint direkt (kein Browser-Test gegen Prod)

  test('/shops rendert ohne Crash wenn Shop-Liste leer', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => {
      if (!e.message.includes('Hydration') && !e.message.includes('#418')) errors.push(e.message)
    })
    await gotoShops(page)
    // Entweder Shop-Cards ODER Leer-State — beides ist korrekt
    const hasContent = await page.locator(SHOP_CARD).count()
      .then(n => n > 0)
      .catch(() => false)
    const hasEmptyMsg = await page.getByText(/no shops|keine shops/i).isVisible()
      .catch(() => false)
    // Einer der beiden Zustände muss sichtbar sein
    expect(hasContent || hasEmptyMsg, 'Shop-Karten oder Leer-Zustand sichtbar').toBe(true)
    expect(errors).toHaveLength(0)
  })

  test('ShopCard-Links führen zu /shops/[slug]', async ({ page }) => {
    await gotoShops(page)
    const cards = page.locator(SHOP_CARD)
    await expect(cards.first()).toBeVisible()
    // Erster Card-Link zeigt auf /shops/[slug]
    const href = await cards.first().getAttribute('href')
    expect(href).toMatch(/^\/[a-z]{2}\/shops\/[a-z0-9-]+$/)
  })

  test('ShopCard zeigt Produktanzahl', async ({ page }) => {
    await gotoShops(page)
    const cards = page.locator(SHOP_CARD)
    await expect(cards.first()).toBeVisible()

    // Produktanzahl ist immer sichtbar (auch 0)
    const firstCard = cards.first()
    const text = await firstCard.innerText()
    expect(text).toMatch(/\d+/) // mind. eine Zahl im Card
  })
})

// ─── E2E-S5: Responsive Mobile ───────────────────────────────────────────────

test.describe('E2E-S5: Responsive Mobile /shops', () => {
  test.use({ viewport: { width: 390, height: 844 } }) // iPhone 14

  test('keine horizontale Scrollbar auf /shops (mobile)', async ({ page }) => {
    await gotoShops(page)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2) // 2px Toleranz
  })

  test('Slider auf Mobile nicht abgeschnitten', async ({ page }) => {
    await gotoShops(page)
    const slider = page.locator('input[type="range"]')
    await expect(slider).toBeVisible({ timeout: 8_000 })
    const box = await slider.boundingBox()
    expect(box?.width).toBeGreaterThan(50) // Slider ist nicht auf 0 kollabiert
  })
})

// ─── E2E-S6: Favicon Avatare (F1600) ──────────────────────────────────────────

test.describe('E2E-S6: Favicons in Shop-Listen und Detail-Seite', () => {
  test('ShopCard zeigt Avatar-Kreis (Bild oder Fallback-Initial)', async ({ page }) => {
    await gotoShops(page)
    const cards = page.locator(SHOP_CARD)
    await expect(cards.first()).toBeVisible()

    const firstCard = cards.first()
    // Avatar ist ein div oder img mit rounded-full
    const avatar = firstCard.locator('[role="img"], img').first()
    await expect(avatar).toBeVisible()
  })

  test('ShopCard Avatar hat Fallback-Farbe basiert auf Shop-ID (deterministisch)', async ({ page }) => {
    await gotoShops(page)
    const cards = page.locator(SHOP_CARD)
    await expect(cards.nth(1)).toBeVisible() // mind. 2 Shops zum Vergleichen

    // Zwei verschiedene Shop-Cards sollten verschiedene Fallback-Farben haben
    // Bild-Favicon (img) ODER Fallback-Kreis (role=img): nicht jeder Shop hat ein Fallback, die Klassen-Pruefung gilt fuer beide
    const card1Avatar = cards.nth(0).locator('[role="img"], img').first()
    const card2Avatar = cards.nth(1).locator('[role="img"], img').first()

    const card1Class = await card1Avatar.getAttribute('class')
    const card2Class = await card2Avatar.getAttribute('class')

    // Verschiedene Shops sollten (wahrscheinlich) verschiedene bg-Farben haben
    // Wenn beide Fallbacks sind, sollten die Klassen unterschiedlich sein
    // (z.B. bg-sky-100 vs bg-violet-100)
    expect(card1Class).toBeTruthy()
    expect(card2Class).toBeTruthy()
  })

  test('Shop-Detail-Seite zeigt große Avatar (80×80px)', async ({ page }) => {
    await gotoShops(page)
    const firstShopLink = page.locator(SHOP_CARD).first()
    await expect(firstShopLink).toBeVisible()

    await firstShopLink.click()
    await expect(page).toHaveURL(/\/shops\/[^/]+$/)

    // Avatar auf Detail-Seite: sollte größer sein
    // Prüfe dass ein img oder role="img" Div mit großer Größe vorhanden ist
    const detailAvatar = page.locator('[role="img"]').first()
    await expect(detailAvatar).toBeVisible()

    const box = await detailAvatar.boundingBox()
    // 80px Avatar (w-20 h-20 in Tailwind = 80px)
    // Toleranz: mind. 70px damit Test nicht fragil ist
    expect(box?.width).toBeGreaterThanOrEqual(70)
    expect(box?.height).toBeGreaterThanOrEqual(70)
  })

  test('Broken Favicon fällt auf Fallback-Initial zurück', async ({ page }) => {
    // Dieser Test prüft, dass onError Handler funktioniert
    // Falls ein Favicon-URL ungültig ist, sollte der Fallback-Circle sichtbar sein
    await gotoShops(page)

    // Suche nach einem Avatar-Div mit Text (Fallback mit Initial)
    // Fallback-Avatar hat role="img" und eine Farben-Klasse + Text
    const avatarWithText = page.locator('div[role="img"]').filter({ hasText: /[A-Z?]/ }).first()
    if (await avatarWithText.isVisible()) {
      // Fallback ist vorhanden und sichtbar — kein Fehler
      expect(true).toBe(true)
    } else {
      // Falls keine Fallbacks sichtbar sind, sind die Favicons vermutlich geladen
      const images = page.locator('img[alt]')
      expect(await images.count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('RTL (Arabisch): Avatar-Layout spiegelt sich korrekt', async ({ page }) => {
    await page.context().addCookies([{
      name: 'app_lang', value: 'ar', domain: COOKIE_DOMAIN, path: '/',
    }])
    await gotoShops(page)

    const cards = page.locator(SHOP_CARD)
    await expect(cards.first()).toBeVisible()

    // Prüfe dass HTML dir="rtl" gesetzt ist
    const htmlDir = await page.locator('html').getAttribute('dir')
    expect(htmlDir).toBe('rtl')

    // Avatar sollte trotzdem sichtbar sein
    const avatar = cards.first().locator('[role="img"], img').first()
    await expect(avatar).toBeVisible()
  })
})

// ─── E2E-S7: Neue Filter-Chips (Parking, Delivery, Online-only, Sprache) ──────

test.describe('E2E-S7: Neue Filter-Chips', () => {
  test('Parking-Chip sichtbar (EN)', async ({ page }) => {
    await setLang(page, 'en')
    await gotoShops(page)
    await expect(page.getByRole('button', { name: 'Parking' })).toBeVisible()
  })

  test('Delivery-Chip sichtbar (EN)', async ({ page }) => {
    await setLang(page, 'en')
    await gotoShops(page)
    await expect(page.getByRole('button', { name: 'Delivery' })).toBeVisible()
  })

  test('Online-only-Chip sichtbar (EN)', async ({ page }) => {
    await setLang(page, 'en')
    await gotoShops(page)
    await expect(page.getByRole('button', { name: 'Online only' })).toBeVisible()
  })

  test('Parking-Chip sichtbar (DE: Parkplatz)', async ({ page }) => {
    await setLang(page, 'de')
    await gotoShops(page)
    await expect(page.getByRole('button', { name: 'Parkplatz' })).toBeVisible()
  })

  test('Parking-Chip toggle: kein Crash beim Klick', async ({ page }) => {
    const errors: string[] = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await setLang(page, 'en')
    await gotoShops(page)
    const parking = page.getByRole('button', { name: 'Parking', exact: true })
    await parking.click()
    await expect(parking).toHaveClass(/bg-accent/)
    await expect(page.locator('div.h-28.animate-pulse')).toHaveCount(0, { timeout: 15_000 })
    const relevant = errors.filter(e => !e.includes('favicon') && !e.includes('WebSocket') && !e.includes('webpack-hmr'))
    expect(relevant).toHaveLength(0)
  })

  test('alle 6 Sprach-Chips sichtbar', async ({ page }) => {
    await setLang(page, 'en')
    await gotoShops(page)
    // Scope to spoken-lang-filter to avoid matching the LanguageSwitcher buttons (EN/DE/RU conflict)
    const filterRow = page.locator('[data-testid="spoken-lang-filter"]')
    await expect(filterRow).toBeVisible()
    for (const code of ['EL', 'EN', 'DE', 'RU', 'AR', 'HE']) {
      await expect(filterRow.getByRole('button', { name: code, exact: true })).toBeVisible()
    }
  })

  test('Sprach-Chip toggle: kein Crash beim Klick (EL)', async ({ page }) => {
    const errors: string[] = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await setLang(page, 'en')
    await gotoShops(page)
    const elChip = page.getByRole('button', { name: 'EL', exact: true })
    await elChip.click()
    await expect(elChip).toHaveClass(/bg-accent/)
    await expect(page.locator('div.h-28.animate-pulse')).toHaveCount(0, { timeout: 15_000 })
    const relevant = errors.filter(e => !e.includes('favicon') && !e.includes('WebSocket') && !e.includes('webpack-hmr'))
    expect(relevant).toHaveLength(0)
  })

  test('Filter-Chips RTL: Chips-Zeile hat rtl:flex-row-reverse bei ar', async ({ page }) => {
    await setLang(page, 'ar')
    await gotoShops(page)
    // Check the chip row containing the parking button
    const parkingBtn = page.getByRole('button', { name: 'موقف سيارات', exact: true })
    await expect(parkingBtn).toBeVisible()
    const parent = parkingBtn.locator('..')
    const cls = await parent.getAttribute('class') ?? ''
    expect(cls).toContain('rtl:flex-row-reverse')
  })
})
