import { test, expect } from '@playwright/test'

// Verifies that Coming-Soon is gone and Naidivse shows the normal app.
// ACs from specs/coming-soon-deaktivieren-20260430/01-design.md

test.describe('Naidivse Live — Coming-Soon entfernt', () => {
  test('AC3: /coming-soon liefert 404', async ({ request }) => {
    const res = await request.get('/coming-soon')
    expect(res.status()).toBe(404)
  })

  test('AC4: POST /api/coming-soon liefert 404', async ({ request }) => {
    const res = await request.post('/api/coming-soon', {
      data: { email: 'test@test.com', turnstile_token: 'test' },
    })
    expect(res.status()).toBe(404)
  })

  test('AC1: GET / mit Host naidivse.com zeigt normale App, kein Coming-Soon', async ({ request }) => {
    const res = await request.get('http://localhost:3500/', {
      headers: { Host: 'naidivse.com' },
    })
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).not.toContain('coming_soon')
    expect(body).not.toContain('Find everything.')
    // Brand is present
    expect(body).toContain('Naidivse')
  })

  test('AC2: /shops mit Host naidivse.com rendert normale Shops-Seite', async ({ request }) => {
    const res = await request.get('http://localhost:3500/shops', {
      headers: { Host: 'naidivse.com' },
    })
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).not.toContain('coming_soon')
  })
})
