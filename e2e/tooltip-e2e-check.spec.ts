import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3500'
const SHOP_SLUG = 'bookshop-chrisognosi-cfab8f67'

test.describe('E2E-01: Startseite', () => {
  test('lädt korrekt, kein JS-Fehler', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

test.describe('E2E-03: RTL-Layout', () => {
  test('ar setzt dir=rtl', async ({ page, context }) => {
    await context.addCookies([{ name: 'app_lang', value: 'ar', domain: 'localhost', path: '/' }])
    await page.goto(BASE)
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })
  test('he setzt dir=rtl', async ({ page, context }) => {
    await context.addCookies([{ name: 'app_lang', value: 'he', domain: 'localhost', path: '/' }])
    await page.goto(BASE)
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })
  test('de setzt dir=ltr', async ({ page, context }) => {
    await context.addCookies([{ name: 'app_lang', value: 'de', domain: 'localhost', path: '/' }])
    await page.goto(BASE)
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })
  test('en setzt dir=ltr (Standard)', async ({ page }) => {
    await page.goto(BASE)
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })
})

test.describe('E2E-05: Shop-Detail mit Tooltips', () => {
  test('Shop-Detail lädt, kein JS-Fehler', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`${BASE}/shops/${SHOP_SLUG}`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('EN/EL Sprach-Chips sichtbar', async ({ page }) => {
    await page.goto(`${BASE}/shops/${SHOP_SLUG}`)
    await expect(page.locator('text=EN').first()).toBeVisible()
    await expect(page.locator('text=EL').first()).toBeVisible()
  })

  test('Radix Tooltip auf Sprach-Chips verdrahtet (data-state=closed)', async ({ page }) => {
    await page.goto(`${BASE}/shops/${SHOP_SLUG}`)
    const chip = page.locator('[data-state="closed"]').first()
    await expect(chip).toBeAttached()
  })

  test('Tooltip zeigt "English" bei Hover auf EN-Chip', async ({ page }) => {
    await page.goto(`${BASE}/shops/${SHOP_SLUG}`)
    const enChip = page.locator('[data-state="closed"]').filter({ hasText: /^EN$/ }).first()
    await enChip.hover()
    await page.waitForTimeout(300) // Radix delayDuration=200
    const tooltip = page.locator('[role="tooltip"]')
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText('English')
  })

  // Review-Daten (gmxbb, EN★5.0) werden vom global-setup DB-Reset gelöscht.
  // Coverage über Unit-Tests (tooltip-and-popover.test.tsx) sichergestellt.
})

test.describe('E2E-06: Shops-Liste lädt', () => {
  test('Shop-Liste erreichbar, kein JS-Fehler', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`${BASE}/shops`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('mindestens 1 Shop sichtbar', async ({ page }) => {
    await page.goto(`${BASE}/shops`)
    await page.waitForLoadState('networkidle')
    const cards = page.locator('[data-testid="shop-card"], a[href*="/shops/"]')
    await expect(cards.first()).toBeAttached()
  })
})

test.describe('E2E-07: Fehler-Handling', () => {
  test('ungültiger Shop-Slug → kein Crash', async ({ page }) => {
    const errors: string[] = []
    // Performance.measure with negative timestamp is a benign browser warning, not an app error
    page.on('pageerror', e => {
      if (!e.message.includes("cannot have a negative time stamp")) {
        errors.push(e.message)
      }
    })
    await page.goto(`${BASE}/shops/nicht-vorhanden-xyz`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
    const body = await page.content()
    expect(body.length).toBeGreaterThan(100)
  })
})
