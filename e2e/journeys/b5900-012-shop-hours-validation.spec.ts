/**
 * B5900-012 — Öffnungszeiten-Validierung (Shop-Admin) + robuste Kunden-Shop-Seite
 *
 * Läuft ausschließlich gegen Test-Instanz 3500 / 8500. Kein DB-Reset.
 * Ändert nur die Öffnungszeiten des E2E-Test-Shops (State-Datei, global-setup) und stellt sie
 * am Ende wieder her (Rohwert aus der DB, falls DATABASE_URL_TEST + psql vorhanden; sonst per API).
 *
 * AK1 (API):    PUT /shop-owner/shop/hours mit closed=false ohne Zeiten -> 422 (+ Randfälle)
 * AK1 (UI):     HoursEditor sendet keinen offenen Tag ohne Zeiten; echte 422 -> lokalisierte Meldung (en, de)
 * AK2 (Kunde):  Shop-Seite rendert (200) bei Bestandsdaten mit defektem Tag; übrige Tage korrekt.
 *               Braucht direkten DB-Zugriff (Backend lehnt solche Daten jetzt ab) -> nur mit DATABASE_URL_TEST.
 */
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { shopOwnerLogin } from './_helpers'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-012] Safety: NEVER use production ports!')
}

const STATE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.test-state.json'), 'utf8')) as {
  email: string; password: string; shopId: number; shopSlug: string
  storageState: { cookies: unknown[]; origins: unknown[] }
}
test.use({ storageState: STATE.storageState as Parameters<typeof test.use>[0]['storageState'] })
test.describe.configure({ mode: 'serial' })

const DB = (process.env.DATABASE_URL_TEST ?? '').replace('+psycopg', '')
const HAVE_DB = DB.includes('pundo_test')
function psql(sql: string): string {
  return execFileSync('psql', [DB, '-Atc', sql], { encoding: 'utf8' }).trim()
}

let token = ''
let originalRaw: string | null = null
const auth = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
const allClosed = () => Array.from({ length: 7 }, (_, d) => ({ day: d, closed: true }))
const put = (body: unknown) =>
  fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/hours`, { method: 'PUT', headers: auth(), body: JSON.stringify(body) })

test.beforeAll(async () => {
  token = await shopOwnerLogin(STATE.email, STATE.password)
  if (HAVE_DB) originalRaw = psql(`select opening_hours::text from shops where id=${STATE.shopId}`)
  expect((await put(allClosed())).status).toBe(200) // definierter Ausgangszustand
})

test.afterAll(async () => {
  if (HAVE_DB && originalRaw !== null) {
    psql(`update shops set opening_hours='${originalRaw.replace(/'/g, "''")}'::jsonb where id=${STATE.shopId}`)
  } else {
    await put(allClosed())
  }
})

test('AK1 API: offener Tag ohne Zeiten / ungültige Zeiten -> 422, gültig -> 200', async () => {
  const withDay = (d: number, slot: Record<string, unknown>) =>
    allClosed().map((s) => (s.day === d ? { day: d, ...slot } : s))

  for (const [name, body] of [
    ['open+close fehlen', withDay(2, { closed: false })],
    ['open=null', withDay(2, { closed: false, open: null, close: null })],
    ['nur open', withDay(2, { closed: false, open: '09:00' })],
    ['25:00', withDay(2, { closed: false, open: '25:00', close: '26:00' })],
    ['zweites Fenster halb', withDay(2, { closed: false, open: '09:00', close: '12:00', second_open: '13:00' })],
  ] as const) {
    const r = await put(body)
    const j = (await r.json()) as { detail?: unknown }
    expect(r.status, name).toBe(422)
    expect(typeof j.detail, `${name}: verständliche String-Meldung`).toBe('string')
  }
  const ok = await put(withDay(2, { closed: false, open: '09:00', close: '18:00', second_open: '19:00', second_close: '21:00' }))
  expect(ok.status).toBe(200)
  const back = (await (await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/hours`, { headers: auth() })).json()) as Array<{ day: number; open?: string; closed: boolean }>
  expect(back.find((s) => s.day === 2)).toMatchObject({ open: '09:00', closed: false })
  expect((await put(allClosed())).status).toBe(200)
})

test('AK1 UI (en): offener Tag ohne Zeiten wird nicht gesendet; echte 422 zeigt lokalisierten Text', async ({ page }) => {
  page.setDefaultTimeout(20_000)
  const puts: number[] = []
  page.on('response', (r) => { if (r.request().method() === 'PUT' && r.url().includes('/shop/hours')) puts.push(r.status()) })
  await page.goto(`${FRONTEND_URL}/shop-admin/hours`, { waitUntil: 'domcontentloaded' })
  const first = page.locator('input[type="checkbox"]').first()
  await expect(first).toBeChecked()
  await first.uncheck()
  // Prefill 09:00/18:00 sichtbar (nicht nur Placeholder)
  const open = page.locator('input[type="time"]').nth(0)
  const close = page.locator('input[type="time"]').nth(1)
  await expect(open).toHaveValue('09:00')
  await expect(close).toHaveValue('18:00')

  // a) Zeit leeren -> clientseitig blockiert, kein Request
  await open.fill('')
  await page.getByRole('button', { name: 'Save hours' }).click()
  await expect(page.getByRole('status')).toContainText('Please enter an opening and closing time for every open day')
  expect(puts, 'es darf kein PUT abgesetzt werden').toEqual([])

  // b) zweites Zeitfenster halb ausgefüllt -> Client lässt durch, Backend 422 -> lokalisierte Meldung
  await open.fill('09:00')
  await page.getByRole('button', { name: /\+ Second time slot/ }).first().click()
  await page.locator('input[type="time"]').nth(3).fill('') // second_close leeren
  await page.getByRole('button', { name: 'Save hours' }).click()
  await expect.poll(() => puts.length).toBe(1)
  expect(puts[0]).toBe(422)
  await expect(page.getByRole('status')).toContainText('Please enter an opening and closing time for every open day')

  // c) Slot entfernen -> speichern klappt
  await page.getByRole('button', { name: 'Remove second slot' }).click()
  await page.getByRole('button', { name: 'Save hours' }).click()
  await expect.poll(() => puts.length).toBe(2)
  expect(puts[1]).toBe(200)
  const back = (await (await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/hours`, { headers: auth() })).json()) as Array<{ day: number; open?: string; close?: string; closed: boolean }>
  expect(back.find((s) => s.day === 0)).toMatchObject({ open: '09:00', close: '18:00', closed: false })
})

test('AK1 UI (de): 422 wird auf Deutsch angezeigt', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: STATE.storageState as never })
  await ctx.addCookies([{ name: 'app_lang', value: 'de', url: FRONTEND_URL }])
  const page = await ctx.newPage()
  page.setDefaultTimeout(20_000)
  await page.goto(`${FRONTEND_URL}/shop-admin/hours`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="checkbox"]').nth(1).uncheck() // Dienstag
  await page.getByRole('button', { name: /\+ Zweiter Zeitslot/ }).first().click()
  await page.locator('input[type="time"]').nth(3).fill('') // second_close (Dienstag) leeren
  const resp = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes('/shop/hours'))
  await page.getByRole('button', { name: 'Öffnungszeiten speichern' }).click()
  expect((await resp).status()).toBe(422)
  await expect(page.getByRole('status')).toContainText('Bitte für jeden geöffneten Tag Öffnungs- und Schließzeit angeben')
  await ctx.close()
})

test('AK2 Kunde: Shop-Seite rendert (200) bei Bestandsdaten mit offenem Tag ohne Zeiten', async ({ browser }) => {
  test.skip(!HAVE_DB, 'DATABASE_URL_TEST (pundo_test) nicht gesetzt — Datenmanipulation nicht möglich')
  const broken = {
    '0': { open: null, close: null, closed: false },
    '1': { open: '10:00', close: '16:00', closed: false },
    '2': { closed: true },
    '3': { open: '', close: '', closed: false },
    '4': { open: '08:30', close: '12:30', closed: false },
    '5': { closed: true },
    '6': { closed: true },
  }
  psql(`update shops set opening_hours='${JSON.stringify(broken)}'::jsonb where id=${STATE.shopId}`)
  const ctx = await browser.newContext() // Kunde, ohne Login
  const page = await ctx.newPage()
  const res = await page.goto(`${FRONTEND_URL}/en/shops/${STATE.shopSlug}`, { waitUntil: 'domcontentloaded' })
  expect(res?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Opening hours' })).toBeVisible({ timeout: 20_000 }) // Streaming abwarten
  const body = await page.locator('div').filter({ has: page.getByRole('heading', { name: 'Opening hours' }) }).last().innerText()
  expect(body).not.toContain('undefined')
  expect(body).not.toContain('null')
  expect(body).toContain('10:00 – 16:00')
  expect(body).toContain('08:30 – 12:30')
  const api = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${STATE.shopSlug}`)
  expect(api.status).toBe(200)
  const j = (await api.json()) as { opening_hours?: Record<string, unknown> }
  expect(j.opening_hours?.['1']).toMatchObject({ open: '10:00', close: '16:00' })
  expect(j.opening_hours?.['0'] ?? null).toBeNull() // defekter Tag ausgelassen
  await ctx.close()
})
