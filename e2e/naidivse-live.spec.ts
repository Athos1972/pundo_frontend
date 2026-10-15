import { test, expect } from '@playwright/test'

// Verifies that Coming-Soon is gone and Naidivse shows the normal app.
// ACs from specs/coming-soon-deaktivieren-20260430/01-design.md
//
// F8950 T20: vorher 4 Tests (AC1-AC4), jetzt einer. Alle vier Assertions bleiben; sie gehen ueber dieselbe
// Next.js-Route-Aufloesung und denselben Proxy (src/proxy.ts) und teilen sich damit Setup und Fehlerbild.
test.describe('Naidivse Live — Coming-Soon entfernt', () => {
  test('AC1-AC4: Host naidivse.com zeigt normale App (/, /shops), /coming-soon und POST /api/coming-soon liefern 404', async ({ request }) => {
    // AC3
    const comingSoon = await request.get('/coming-soon')
    expect(comingSoon.status(), 'AC3: /coming-soon').toBe(404)

    // AC4
    const post = await request.post('/api/coming-soon', {
      data: { email: 'test@test.com', turnstile_token: 'test' },
    })
    expect(post.status(), 'AC4: POST /api/coming-soon').toBe(404)

    // AC1. Playwright >= 1.62 verwirft einen eigenen Host-Header beim Folgen eines Redirects (/ -> 307 /en),
    // deshalb den Redirect selbst pruefen und die Zielseite mit Host-Header direkt anfragen.
    const root = await request.get('/', { headers: { Host: 'naidivse.com' }, maxRedirects: 0 })
    expect([200, 307, 308], 'AC1: GET / (Host naidivse.com)').toContain(root.status())
    const home = await request.get('/en', { headers: { Host: 'naidivse.com' } })
    expect(home.status(), 'AC1: GET /en (Host naidivse.com)').toBe(200)
    const homeBody = await home.text()
    expect(homeBody).not.toContain('coming_soon')
    expect(homeBody).not.toContain('Find everything.')
    expect(homeBody, 'Brand Naidivse vorhanden').toContain('Naidivse')

    // AC2
    const shops = await request.get('/en/shops', { headers: { Host: 'naidivse.com' } })
    expect(shops.status(), 'AC2: GET /en/shops (Host naidivse.com)').toBe(200)
    expect(await shops.text()).not.toContain('coming_soon')
  })
})
