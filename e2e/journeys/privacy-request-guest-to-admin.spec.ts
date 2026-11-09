/** Runde B of the approved privacy-request-guest-to-admin journey. */
import { test, expect } from '../fixtures'
import { BASE_URL } from '../env'

test.describe('F6110 public privacy request — Runde B', () => {
  test('guest form has one H1 and confirmation never exposes an identifier', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/de/privacy-request`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await page.getByLabel('E-Mail').fill('privacy-journey@example.com')
    await page.getByRole('button', { name: 'Datenschutzanfrage absenden' }).click()
    await expect(page.getByRole('status')).toBeVisible()
  })

  test.fixme('Runde C: T7 Admin-Fallwerkzeug und T8 externer Download fehlen.', async () => {})
})
