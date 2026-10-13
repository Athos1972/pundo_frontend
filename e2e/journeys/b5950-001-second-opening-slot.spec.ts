/**
 * B5950-001 — Zweites Öffnungszeitfenster (Mittagspause) in Kundensicht, JSON-LD und is_open_now
 *
 * Läuft ausschließlich gegen Test-Instanz 3500 / 8500. Kein DB-Reset. Eigener Spec-Shop (specShop,
 * Impersonation-Token), afterAll löscht ihn — der geteilte e2e-test-shop wird nie verändert.
 *
 * AK1 (API):    /shops/by-slug liefert second_open/second_close; Tag ohne zweites Fenster ohne diese Keys.
 * AK2 (Kunde):  /{lang}/shops/<slug> zeigt "07:00 – 14:00, 16:30 – 19:00" (en, de, el, ar, he; 390 px),
 *               Zeiten-Span dir="ltr", kein Überlauf, keine Konsolenfehler; Sonntag geschlossen.
 * AK3 (JSON-LD): openingHours enthält beide Fenster ("Mo 07:00-14:00", "Mo 16:30-19:00").
 * AK4 (Status): is_open_now + Filter open_now: nur im zweiten Fenster -> true, in der Pause -> false.
 *               Zeitabhängig (Europe/Nicosia) -> übersprungen um Mitternacht (±60 min).
 */
import { test, expect } from '@playwright/test'
import { specShop, type WorkerShop } from './_helpers/worker-shop'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5950-001] Safety: NEVER use production ports!')
}

test.describe.configure({ mode: 'serial' })

let shop: WorkerShop
const auth = () => ({ Authorization: `Bearer ${shop.ownerToken}`, 'Content-Type': 'application/json' })
const put = (body: unknown) =>
  fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/hours`, { method: 'PUT', headers: auth(), body: JSON.stringify(body) })

const week = (override: Record<number, Record<string, unknown>> = {}) =>
  Array.from({ length: 7 }, (_, d) => {
    if (override[d]) return { day: d, closed: false, ...override[d] }
    if (d < 5) return { day: d, closed: false, open: '07:00', close: '14:00', second_open: '16:30', second_close: '19:00' }
    if (d === 5) return { day: d, closed: false, open: '07:00', close: '14:00' }
    return { day: d, closed: true }
  })

const publicShop = async () =>
  (await (await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${shop.slug}`)).json()) as {
    opening_hours: Record<string, Record<string, string> | null>
    is_open_now: boolean | null
  }

test.beforeAll(async () => {
  shop = await specShop('B5950-001')
  expect((await put(week())).status).toBe(200)
})
test.afterAll(async () => { await shop?.destroy() })

test('AK1 API: zweites Fenster wird durchgereicht, Samstag ohne second_*-Keys', async () => {
  const oh = (await publicShop()).opening_hours
  expect(oh['0']).toEqual({ open: '07:00', close: '14:00', second_open: '16:30', second_close: '19:00' })
  expect(oh['5']).toEqual({ open: '07:00', close: '14:00' })
  expect(oh['6'] ?? null).toBeNull()
})

for (const [lang, rtl] of [['en', false], ['de', false], ['el', false], ['ar', true], ['he', true]] as const) {
  test(`AK2/AK3 Kunde ${lang} @390px: beide Fenster, ltr-Span, JSON-LD, keine Konsolenfehler`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const errors: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${FRONTEND_URL}/${lang}/shops/${shop.slug}`, { waitUntil: 'networkidle' })

    const mon = page.getByTestId('shop-hours-mon')
    await expect(mon).toContainText('07:00 – 14:00, 16:30 – 19:00')
    await expect(mon.locator('[dir="ltr"]')).toHaveCount(1)
    await expect(page.getByTestId('shop-hours-sat')).toContainText('07:00 – 14:00')
    await expect(page.getByTestId('shop-hours-sat')).not.toContainText('16:30')
    await expect(page.getByTestId('shop-hours-sun')).not.toContainText('07:00')
    expect(await page.evaluate(() => document.documentElement.dir)).toBe(rtl ? 'rtl' : 'ltr')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    expect(await page.content()).not.toContain('undefined –')

    const ld = (await page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => e.textContent ?? '')))
      .flatMap((t) => { try { const j = JSON.parse(t); return Array.isArray(j) ? j : [j] } catch { return [] } })
      .filter((x) => x && x.openingHours)
    expect(ld[0].openingHours).toEqual(expect.arrayContaining(['Mo 07:00-14:00', 'Mo 16:30-19:00', 'Sa 07:00-14:00']))
    expect(errors, 'keine Konsolenfehler').toEqual([])
    await ctx.close()
  })
}

test('AK4 is_open_now + open_now-Filter: zweites Fenster true, Pause false', async () => {
  const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Nicosia', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
  const [h, m] = hhmm.split(':').map(Number)
  const now = h * 60 + m
  test.skip(now < 60 || now > 1380, 'zu nah an Mitternacht')
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Nicosia', weekday: 'short' }).format(new Date())
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd)
  const t = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
  const filter = async (v: boolean) =>
    ((await (await fetch(`${BACKEND_URL}/api/v1/shops?q=${encodeURIComponent(shop.name)}&open_now=${v}&limit=20`)).json()) as { items: { slug: string }[] })
      .items.some((s) => s.slug === shop.slug)

  // erstes Fenster längst vorbei (00:00-00:01), jetzt nur im zweiten Fenster
  expect((await put(week({ [day]: { open: '00:00', close: '00:01', second_open: t(now - 30), second_close: t(now + 30) } }))).status).toBe(200)
  expect((await publicShop()).is_open_now).toBe(true)
  expect(await filter(true)).toBe(true)
  expect(await filter(false)).toBe(false)

  // Pause: zweites Fenster beginnt erst in 30 min
  expect((await put(week({ [day]: { open: '00:00', close: '00:01', second_open: t(now + 30), second_close: t(now + 31) } }))).status).toBe(200)
  expect((await publicShop()).is_open_now).toBe(false)
  expect(await filter(true)).toBe(false)
  expect(await filter(false)).toBe(true)
})
