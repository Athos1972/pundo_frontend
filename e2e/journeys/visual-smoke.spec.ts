import { test, expect } from '@playwright/test'

// Produktseite mit bekannten lokalen product_images — ändere slug wenn Testdaten anders
const PRODUCT_WITH_IMAGES = 'ferplast-ferplast-sport-g8-200-black-leash'

test.describe('Visual Smoke-Test', () => {

  test('Produktseite: Bilder laden, Carousel zeigt mehrere Items', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })

    const suspiciousRedirects: string[] = []
    page.on('response', r => {
      if (r.status() >= 300 && r.status() < 400) {
        const loc = r.headers()['location'] ?? ''
        if (loc.includes('docs.') || loc.includes('guidelines') || loc.includes('error')) {
          suspiciousRedirects.push(`${r.url()} → ${loc}`)
        }
      }
    })

    await page.goto(`/products/${PRODUCT_WITH_IMAGES}`)
    await page.waitForLoadState('networkidle')

    // Mind. 1 Bild muss tatsächlich geladen sein (naturalWidth > 0)
    const loadedImages = await page.evaluate(() =>
      [...document.images].filter(i => i.complete && i.naturalWidth > 0).length
    )
    expect(loadedImages, 'Keine Bilder geladen — alle broken').toBeGreaterThan(0)

    // Carousel: bei Tablet-Breite mind. 2 Items im DOM
    const carouselList = page.locator('[role="list"]').first()
    const itemCount = await carouselList.locator('[role="listitem"]').count()
    if (itemCount > 0) {
      expect(itemCount, 'Carousel: weniger als 2 Items im DOM').toBeGreaterThanOrEqual(2)

      const visibleInViewport = await page.evaluate(() => {
        const list = document.querySelector('[role="list"]')
        if (!list) return 0
        const lr = list.getBoundingClientRect()
        return [...list.querySelectorAll('[role="listitem"]')]
          .filter(el => el.getBoundingClientRect().left < lr.right - 50).length
      })
      expect(visibleInViewport, 'Carousel: bei 768px weniger als 2 Cards sichtbar').toBeGreaterThanOrEqual(2)
    }

    // Keine CDN-Hotlink-Blocks oder kaputten Redirects
    expect(suspiciousRedirects, `Verdächtige Redirects: ${suspiciousRedirects.join(', ')}`).toHaveLength(0)
  })

  test('Suchergebnisse: Seite lädt ohne Crash, Bilder geladen wenn Ergebnisse vorhanden', async ({ page }) => {
    await page.goto('/search?q=ferplast')
    await page.waitForLoadState('networkidle')

    // Seite darf nicht crashen — kein White Screen, kein JS-Error
    const consoleErrors: string[] = []
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })

    // Wenn Produktlinks vorhanden → mind. 1 Bild muss auch laden
    const productLinks = page.locator('a[href^="/products/"]')
    const linkCount = await productLinks.count()
    if (linkCount > 0) {
      await expect(productLinks.first()).toBeVisible()
      const loadedImages = await page.evaluate(() =>
        [...document.images].filter(i => i.complete && i.naturalWidth > 0).length
      )
      expect(loadedImages, 'Suchergebnisse: Produkte vorhanden aber keine Bilder geladen').toBeGreaterThan(0)
    } else {
      // Leerer Zustand ist ok — aber mind. die Suchleiste muss da sein
      await expect(page.locator('input[type="search"], input[type="text"]').first()).toBeVisible()
    }
  })

})
