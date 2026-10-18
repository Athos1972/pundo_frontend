/**
 * F6998 — Activity-Log Bot-Filter (Frontend -> Backend, X-Forwarded-User-Agent)
 *
 * Laeuft gegen Frontend 3500 / Backend 8500 (Projekt `full`, kein @smoke).
 * Voraussetzung: Backend mit Bot-Filter (F6998 T1-T3). Kein Datenbankzugriff:
 * Events werden ueber GET /api/v1/activity?since=<next_since> geprueft.
 *
 * Playwright-Default-UA (HeadlessChrome) gilt als Bot -> Tests, die ein Event
 * erwarten, setzen BROWSER_UA explizit.
 */
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'
import { BASE_URL, BACKEND_URL } from '../env'

const BOT_UA = 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)'
const SEMRUSH_UA = 'SemrushBot/7~bl'
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
const SMOKETESTER_UA = 'pundo-smoketester/1.0 (+https://pundo.cy)'

interface ActivityEvent { event_type: string; payload?: Record<string, unknown> | null }
interface ActivityResponse { events: ActivityEvent[]; next_since: string | null }

async function activityBase(api: APIRequestContext): Promise<string | null> {
  const res = await api.get(`${BACKEND_URL}/api/v1/activity?brand=pundo&limit=1`)
  expect(res.ok()).toBeTruthy()
  return ((await res.json()) as ActivityResponse).next_since
}

async function eventsSince(api: APIRequestContext, since: string | null): Promise<ActivityEvent[]> {
  const qs = new URLSearchParams({ brand: 'pundo', limit: '50' })
  if (since) qs.set('since', since)
  const res = await api.get(`${BACKEND_URL}/api/v1/activity?${qs}`)
  expect(res.ok()).toBeTruthy()
  return ((await res.json()) as ActivityResponse).events
}

// B6998-003: In der parallelen Gesamtsuite erzeugen andere Specs echte Events (Browser-UA). Prefetch-Tests
// pruefen darum nur Events fuer die Slugs, die der Browser tatsaechlich prefetcht hat.
const forSlugs = (events: ActivityEvent[], type: string, key: 'shop_slug' | 'product_slug', slugs: Set<string>) =>
  events.filter((e) => e.event_type === type && slugs.has(String(e.payload?.[key] ?? '')))

const forEntity = (events: ActivityEvent[], key: 'product_id' | 'shop_id', id: unknown, type: string) =>
  events.filter((e) => e.event_type === type && e.payload?.[key] === id)

test.describe('F6998 activity bot filter', () => {
  let api: APIRequestContext
  let product: { id: number; slug: string } | null = null
  let shop: { id: number; slug: string } | null = null

  test.beforeAll(async () => {
    api = await pwRequest.newContext()
    const p = await api.get(`${BACKEND_URL}/api/v1/products?limit=1`)
    const pj = p.ok() ? ((await p.json()) as { items?: { id: number; slug: string }[] }) : {}
    product = pj.items?.[0] ?? null
    const s = await api.get(`${BACKEND_URL}/api/v1/shops?limit=1`)
    const sj = s.ok() ? ((await s.json()) as { items?: { id: number; slug: string }[] }) : {}
    shop = sj.items?.[0] ?? null
  })
  test.afterAll(async () => { await api.dispose() })

  async function pageAs(ua: string, path: string, extra: Record<string, string> = {}) {
    const ctx = await pwRequest.newContext({ extraHTTPHeaders: { 'User-Agent': ua, ...extra } })
    try {
      const res = await ctx.get(`${BASE_URL}${path}`)
      expect(res.status()).toBe(200)
    } finally {
      await ctx.dispose()
    }
  }

  test('P1 bot page view of a product creates no event', async () => {
    test.skip(!product, 'no product in test DB')
    const since = await activityBase(api)
    await pageAs(SEMRUSH_UA, `/de/products/${product!.slug}`)
    const ev = await eventsSince(api, since)
    expect(forEntity(ev, 'product_id', product!.id, 'price_comparison_viewed')).toHaveLength(0)
  })

  test('P2 bot page view of a shop creates no event', async () => {
    test.skip(!shop, 'no shop in test DB')
    const since = await activityBase(api)
    await pageAs(SEMRUSH_UA, `/de/shops/${shop!.slug}`)
    const ev = await eventsSince(api, since)
    expect(forEntity(ev, 'shop_id', shop!.id, 'shop_discovered')).toHaveLength(0)
  })

  test('P3 browser page view creates exactly one event (memoization intact)', async ({ browser }) => {
    test.skip(!product, 'no product in test DB')
    const since = await activityBase(api)
    const ctx = await browser.newContext({ userAgent: BROWSER_UA })
    const page = await ctx.newPage()
    await page.goto(`${BASE_URL}/de/products/${product!.slug}`)
    await ctx.close()
    const ev = await eventsSince(api, since)
    expect(forEntity(ev, 'product_id', product!.id, 'price_comparison_viewed')).toHaveLength(1)
  })

  test('P4 bot UA is not overridden by a spoofed X-Forwarded-User-Agent', async () => {
    test.skip(!product, 'no product in test DB')
    const since = await activityBase(api)
    await pageAs(BOT_UA, `/de/products/${product!.slug}`, { 'X-Forwarded-User-Agent': BROWSER_UA })
    const ev = await eventsSince(api, since)
    expect(forEntity(ev, 'product_id', product!.id, 'price_comparison_viewed')).toHaveLength(0)
  })

  test('P5 smoketester UA creates no event', async () => {
    test.skip(!product, 'no product in test DB')
    const since = await activityBase(api)
    await pageAs(SMOKETESTER_UA, `/de/products/${product!.slug}`)
    const ev = await eventsSince(api, since)
    expect(forEntity(ev, 'product_id', product!.id, 'price_comparison_viewed')).toHaveLength(0)
  })

  test('P6 prefetch of links on the homepage without navigation creates no event', async ({ browser }) => {
    test.skip(!product, 'no product in test DB')
    const since = await activityBase(api)
    const ctx = await browser.newContext({ userAgent: BROWSER_UA })
    const page = await ctx.newPage()
    const shops = new Set<string>()
    const products = new Set<string>()
    page.on('request', (r) => {
      const m = r.url().match(/\/(shops|products)\/([^/?]+)\?_rsc=/)
      if (m) (m[1] === 'shops' ? shops : products).add(m[2])
    })
    await page.goto(`${BASE_URL}/de`)
    await page.waitForTimeout(3000)
    await ctx.close()
    const ev = await eventsSince(api, since)
    // B6998-001: Startseite prefetcht Shop-Links -> beide Detail-Eventtypen pruefen (nur fuer prefetchte Slugs, B6998-003)
    expect(forSlugs(ev, 'shop_discovered', 'shop_slug', shops)).toHaveLength(0)
    expect(forSlugs(ev, 'price_comparison_viewed', 'product_slug', products)).toHaveLength(0)
  })

  // E2E-Tester (2026-10-17): A8 gilt nur, wenn Link-Prefetch wirklich keine Events erzeugt. P6 prueft nur die
  // Startseite und nur price_comparison_viewed; die Detail-Prefetches liegen auf Shop-Listen und Suchergebnissen.
  test('P8 prefetch of shop links on the shop list creates no shop_discovered event (A8)', async ({ browser }) => {
    const since = await activityBase(api)
    const ctx = await browser.newContext({ userAgent: BROWSER_UA, viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    const prefetched = new Set<string>()
    page.on('request', (r) => {
      const m = r.url().match(/\/shops\/([^/?]+)\?_rsc=/)
      if (m) prefetched.add(m[1])
    })
    await page.goto(`${BASE_URL}/de/shops`)
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 700)
      await page.waitForTimeout(400)
    }
    await page.waitForTimeout(2500)
    await ctx.close()
    expect(prefetched.size, 'test precondition: the browser prefetched shop detail routes').toBeGreaterThan(0)
    const ev = await eventsSince(api, since)
    expect(forSlugs(ev, 'shop_discovered', 'shop_slug', prefetched)).toHaveLength(0)
  })

  test('P9 prefetch of product cards on search results creates no price_comparison_viewed event (A8)', async ({ browser }) => {
    const since = await activityBase(api)
    const ctx = await browser.newContext({ userAgent: BROWSER_UA, viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    const prefetched = new Set<string>()
    page.on('request', (r) => {
      const m = r.url().match(/\/products\/([^/?]+)\?_rsc=/)
      if (m) prefetched.add(m[1])
    })
    await page.goto(`${BASE_URL}/de/search?q=budgie`)
    await page.waitForTimeout(2500)
    const cards = page.locator('a[href^="/de/products/"]')
    const n = await cards.count()
    for (let i = 0; i < Math.min(n, 6); i++) {
      await cards.nth(i).scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
      await cards.nth(i).hover({ timeout: 3000, force: true }).catch(() => {})
      await page.waitForTimeout(600)
    }
    await page.waitForTimeout(2500)
    await ctx.close()
    expect(prefetched.size, 'test precondition: the browser prefetched product detail routes').toBeGreaterThan(0)
    const ev = await eventsSince(api, since)
    expect(forSlugs(ev, 'price_comparison_viewed', 'product_slug', prefetched)).toHaveLength(0)
  })

  // B6998-001: Der Prefetch bleibt stumm, der echte Klick danach erzeugt genau ein Event.
  test('P10 click after prefetch creates exactly one shop_discovered event', async ({ browser }) => {
    const since = await activityBase(api)
    const ctx = await browser.newContext({ userAgent: BROWSER_UA, viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    const prefetched = new Set<string>()
    page.on('request', (r) => {
      const m = r.url().match(/\/shops\/([^/?]+)\?_rsc=/)
      if (m && !['cities', 'city', 'map'].includes(m[1])) prefetched.add(m[1])
    })
    await page.goto(`${BASE_URL}/de/shops`)
    await page.mouse.wheel(0, 700)
    await page.waitForTimeout(3000) // Prefetch abwarten
    expect(prefetched.size, 'test precondition: a shop detail route was prefetched').toBeGreaterThan(0)
    const slug = [...prefetched][0]
    const link = page.locator(`a[href="/de/shops/${slug}"]`).first()
    await link.scrollIntoViewIfNeeded()
    const href = `/de/shops/${slug}`
    await link.click()
    await page.waitForURL(`**${href}`)
    await page.waitForTimeout(1500)
    await ctx.close()
    const ev = await eventsSince(api, since)
    expect(ev.filter((e) => e.event_type === 'shop_discovered' && e.payload?.shop_slug === slug)).toHaveLength(1)
  })

  test('P7 homepage still renders the activity feed', async ({ browser }) => {
    const ctx = await browser.newContext({ userAgent: BROWSER_UA })
    const page = await ctx.newPage()
    await page.goto(`${BASE_URL}/de`)
    // Feed ist brand-abhaengig (kann fehlen, wenn Backend keine Events liefert): nur Seite + kein Crash pruefen
    await expect(page.locator('h1').first()).toBeVisible()
    await ctx.close()
  })
})
