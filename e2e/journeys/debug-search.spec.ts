import { test, expect } from '@playwright/test'

test('debug product visibility', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('http://localhost:3500/en/search?shop_id=75')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  const links = page.locator('a[href^="/en/products/"]')
  const count = await links.count()
  console.log('product link count:', count)
  
  if (count > 0) {
    const box = await links.first().boundingBox()
    const isHidden = await links.first().isHidden()
    const cls = await links.first().getAttribute('class')
    console.log('boundingBox:', JSON.stringify(box))
    console.log('isHidden:', isHidden)
    console.log('class:', cls)
    
    // Check parent visibility
    const parentHTML = await links.first().evaluate(el => {
      let current: Element | null = el.parentElement
      const info: string[] = []
      for (let i = 0; i < 5 && current; i++) {
        const style = window.getComputedStyle(current)
        info.push(`${current.tagName}.${current.className.slice(0, 50)}: display=${style.display} vis=${style.visibility} opacity=${style.opacity} overflow=${style.overflow}`)
        current = current.parentElement
      }
      return info.join('\n')
    })
    console.log('parents:\n', parentHTML)
  }
})
