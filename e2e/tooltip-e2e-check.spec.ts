import { test, expect } from './fixtures'
import { specShop, type WorkerShop } from './journeys/_helpers/worker-shop'

// F8950 T17: Nur der Tooltip-Hover-Test bleibt. Gestrichen (Zuordnung in 03-implementation.md):
// Startseite/Shops/Shop-Detail ohne JS-Fehler, dir-Matrix, Chip-Sichtbarkeit, data-state, ungueltiger Slug
// -> language-smoke.spec.ts, main.spec.ts E2E-05, src/tests/tooltip-and-popover.test.tsx.
// F8950 T31: kein fester Prod-Kopie-Shop mehr; der Spec-Shop bekommt per Owner-API die Sprachen EN und DE.
test.describe('E2E-05: Shop-Detail mit Tooltips', () => {
  let shop: WorkerShop

  test.beforeAll(async () => {
    shop = await specShop('TOOLTIP')
    const patched = await shop.api('PATCH', '/shop', { spoken_languages: ['EN', 'DE'] })
    expect(patched.status, patched.text).toBe(200)
  })

  test.afterAll(async () => {
    await shop?.destroy()
  })

  test('Tooltip zeigt "English" bei Hover auf EN-Chip', async ({ page }) => {
    await page.goto(`/shops/${shop.slug}`)
    const enChip = page.locator('[data-state="closed"]').filter({ hasText: /^EN$/ }).first()
    await enChip.hover()
    // Seit dem FAB-Onboarding-Hint ("Missing something from home?") existiert ein zweites role=tooltip
    // auf der Seite - strict mode: auf den Radix-Tooltip des EN-Chips einschraenken (Assertion unveraendert).
    // Web-first: toBeVisible wartet auf den Radix-delayDuration (200 ms) statt festem Timeout.
    const tooltip = page.getByRole('tooltip', { name: 'English' })
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText('English')
  })
})
