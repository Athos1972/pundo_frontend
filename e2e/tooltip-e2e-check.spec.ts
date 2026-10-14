import { test, expect } from '@playwright/test'

// F8950 T17: Nur der Tooltip-Hover-Test bleibt. Gestrichen (Zuordnung in 03-implementation.md):
// Startseite/Shops/Shop-Detail ohne JS-Fehler, dir-Matrix, Chip-Sichtbarkeit, data-state, ungueltiger Slug
// -> language-smoke.spec.ts, main.spec.ts E2E-05, src/tests/tooltip-and-popover.test.tsx.
const SHOP_SLUG = 'bookshop-chrisognosi-cfab8f67'

test.describe('E2E-05: Shop-Detail mit Tooltips', () => {
  test('Tooltip zeigt "English" bei Hover auf EN-Chip', async ({ page }) => {
    await page.goto(`/shops/${SHOP_SLUG}`)
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
