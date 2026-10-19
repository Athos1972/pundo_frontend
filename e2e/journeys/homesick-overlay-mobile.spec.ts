import { test, expect } from '@playwright/test'
import { waitForPageHydrated } from './_helpers/hydration'

test.describe('Homesick-Overlay Mobile — Bug-Fix homesick-overlay-verlauf-overlap-20260530', () => {
  test.use({ viewport: { width: 390, height: 844 } }) // iPhone 14

  test('AC1+AC2: Submit-Button vollständig sichtbar, Verlauf-Leiste ausgeblendet wenn Overlay offen', async ({ page }) => {
    await page.goto('/de')
    await waitForPageHydrated(page)

    // Verlauf-Leiste (BottomTabBar nav) muss initial sichtbar sein
    const nav = page.locator('[data-testid="bottom-tab-bar"]')
    await expect(nav).toBeVisible()

    // FAB öffnen
    const fab = page.locator('button[title="AI-Suche"]')
    await expect(fab).toBeVisible()
    await fab.click()

    // Modal ist offen
    const modal = page.locator('[role="dialog"]').filter({ hasText: 'Ähnliche Produkte finden' })
    await expect(modal).toBeVisible()

    // AC2: Verlauf-Leiste ist ausgeblendet
    await expect(nav).toBeHidden()

    // AC1: Submit-Button ist sichtbar und klickbar (nicht von Leiste überdeckt)
    // eslint-disable-next-line local-e2e/no-positional-tag-locator -- legacy (B8950-016 T4): replace by getByTestId/getByRole
    const submitBtn = page.locator('button', { hasText: 'Anmelden' }).last()
    await expect(submitBtn).toBeVisible()

    // Bounding box des Submit-Buttons liegt vollständig im sichtbaren Viewport
    const btnBox = await submitBtn.boundingBox()
    expect(btnBox).not.toBeNull()
    if (btnBox) {
      expect(btnBox.y + btnBox.height).toBeLessThanOrEqual(844) // unterhalb des Viewport-Bottom
      expect(btnBox.y).toBeGreaterThan(0) // oberhalb des Viewport-Tops
    }
  })

  test('AC2 Reverse: Verlauf-Leiste kehrt zurück nach Modal-Schließen', async ({ page }) => {
    await page.goto('/de')
    await waitForPageHydrated(page)

    const nav = page.locator('[data-testid="bottom-tab-bar"]')
    const fab = page.locator('button[title="AI-Suche"]')

    await fab.click()
    await expect(nav).toBeHidden()

    // Schließen via Backdrop-Click (absolute inset-0 bg-black/50)
    await page.keyboard.press('Escape')
    await expect(nav).toBeVisible()
  })

  test('AC3: FAB ist vollständig sichtbar und nicht von Verlauf-Leiste überdeckt', async ({ page }) => {
    await page.goto('/de')
    await waitForPageHydrated(page)

    const fab = page.locator('button[title="AI-Suche"]')
    await expect(fab).toBeVisible()

    const fabBox = await fab.boundingBox()
    const navBox = await page.locator('[data-testid="bottom-tab-bar"]').boundingBox()

    expect(fabBox).not.toBeNull()
    expect(navBox).not.toBeNull()

    if (fabBox && navBox) {
      // FAB-Bottom liegt ÜBER dem Verlauf-Leiste-Top (kein Overlap)
      expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(navBox.y + 4) // 4px Toleranz
    }
  })

  test('AC5: Desktop-Viewport — kein Regress (BottomTabBar md:hidden)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/de')
    await waitForPageHydrated(page)

    // BottomTabBar ist auf Desktop nicht sichtbar
    const nav = page.locator('[data-testid="bottom-tab-bar"]')
    await expect(nav).not.toBeVisible()

    // Modal funktioniert trotzdem
    const fab = page.locator('button[title="AI-Suche"]')
    await expect(fab).toBeVisible()
  })
})
