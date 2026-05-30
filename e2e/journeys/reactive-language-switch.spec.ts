/**
 * Journey: Reaktive Sprachnavigation — Labels ohne Reload (E2E-08)
 * Runbook: e2e/journeys/reactive-language-switch.md
 *
 * Fixtures:
 * | Fixture-Name | Was wird aufgebaut         | Was wird geprüft                         |
 * |--------------|----------------------------|------------------------------------------|
 * | keine        | Live-DB pundo_test (ro)    | Reaktivität von Header/Footer nach       |
 * |              |                            | client-seitigem LanguageSwitcher-Klick   |
 *
 * Root Cause dieses Tests:
 * (customer)/layout.tsx rendert bei Client-Navigation zwischen /de → /en nicht neu.
 * Alle Client Components, die `lang` als Server-Prop nutzen, müssen via useLang()
 * reaktiv bleiben. Ohne useLang() bleiben Labels nach dem Klick stale bis Refresh.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Port-Safety — niemals gegen Produktiv-Ports laufen
const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
if (BASE_URL.includes(':3000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Port 3000 laufen!')
}

// ─── Step-Log ─────────────────────────────────────────────────────────────────

interface StepEntry {
  step: number
  desc: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL' | 'SKIP'
}

const stepLog: StepEntry[] = []
let startedAt = ''

function logStep(step: number, desc: string, expected: string, actual: string, pass: boolean) {
  stepLog.push({ step, desc, expected, actual, status: pass ? 'PASS' : 'FAIL' })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Reaktive Sprachnavigation', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeAll(() => {
    startedAt = new Date().toISOString()
  })

  test('AC5 — Ausgangszustand: /de zeigt DE-Labels nach initialem Laden', async ({ page }) => {
    await page.goto(`${BASE_URL}/de`)
    await page.waitForSelector('header nav a', { timeout: 10000 })

    const firstNavLabel = await page.locator('header nav a').first().textContent()
    const footerHasAnbieter = await page.locator('footer nav').getByText('Für Anbieter').isVisible()
    const footerHasRatgeber = await page.locator('footer nav').getByText('Ratgeber').isVisible()

    logStep(1, 'Ausgangszustand /de — Header-Nav erstes Label', 'Anbieter', firstNavLabel?.trim() ?? '', firstNavLabel?.trim() === 'Anbieter')
    logStep(2, 'Ausgangszustand /de — Footer enthält "Für Anbieter"', 'sichtbar', String(footerHasAnbieter), footerHasAnbieter)
    logStep(3, 'Ausgangszustand /de — Footer enthält "Ratgeber"', 'sichtbar', String(footerHasRatgeber), footerHasRatgeber)

    expect(firstNavLabel?.trim()).toBe('Anbieter')
    expect(footerHasAnbieter).toBe(true)
    expect(footerHasRatgeber).toBe(true)
  })

  test('AC1+AC2 — DE→EN via LanguageSwitcher: Labels aktualisieren ohne Reload', async ({ page }) => {
    await page.goto(`${BASE_URL}/de`)
    await page.waitForSelector('header nav a', { timeout: 10000 })

    // Klick auf EN — kein page.goto(), kein reload — testet Client-Navigation
    await page.click('button[title="EN"]')
    await page.waitForURL('**/en**', { timeout: 8000 })

    const firstNavLabel = await page.locator('header nav a').first().textContent()
    const footerHasBusinesses = await page.locator('footer nav').getByText('For Businesses').isVisible()
    const footerHasGuides = await page.locator('footer nav').getByText('Guides').isVisible()

    logStep(4, 'AC1 — Nach EN-Klick: Header-Nav erstes Label', 'Businesses', firstNavLabel?.trim() ?? '', firstNavLabel?.trim() === 'Businesses')
    logStep(5, 'AC2 — Nach EN-Klick: Footer enthält "For Businesses"', 'sichtbar', String(footerHasBusinesses), footerHasBusinesses)
    logStep(6, 'AC2 — Nach EN-Klick: Footer enthält "Guides"', 'sichtbar', String(footerHasGuides), footerHasGuides)

    expect(firstNavLabel?.trim()).toBe('Businesses')
    expect(footerHasBusinesses).toBe(true)
    expect(footerHasGuides).toBe(true)
  })

  test('AC3 — EN→DE via LanguageSwitcher: Labels wechseln zurück', async ({ page }) => {
    await page.goto(`${BASE_URL}/en`)
    await page.waitForSelector('header nav a', { timeout: 10000 })

    await page.click('button[title="DE"]')
    await page.waitForURL('**/de**', { timeout: 8000 })

    const firstNavLabel = await page.locator('header nav a').first().textContent()
    const footerHasAnbieter = await page.locator('footer nav').getByText('Für Anbieter').isVisible()

    logStep(7, 'AC3 — Nach DE-Klick: Header-Nav erstes Label', 'Anbieter', firstNavLabel?.trim() ?? '', firstNavLabel?.trim() === 'Anbieter')
    logStep(8, 'AC3 — Nach DE-Klick: Footer enthält "Für Anbieter"', 'sichtbar', String(footerHasAnbieter), footerHasAnbieter)

    expect(firstNavLabel?.trim()).toBe('Anbieter')
    expect(footerHasAnbieter).toBe(true)
  })

  test('AC4 — DE→AR: Arabische Labels + dir=rtl gesetzt', async ({ page }) => {
    await page.goto(`${BASE_URL}/de`)
    await page.waitForSelector('header nav a', { timeout: 10000 })

    await page.click('button[title="AR"]')
    await page.waitForURL('**/ar**', { timeout: 8000 })

    // DirSync sets dir via useEffect — wait until the attribute reflects the new lang
    await page.waitForFunction(() => document.documentElement.getAttribute('dir') === 'rtl', { timeout: 5000 })

    const dir = await page.locator('html').getAttribute('dir')
    const navHasArabicBusinesses = await page.locator('header nav').getByText('الأعمال التجارية').isVisible()

    logStep(9, 'AC4 — Nach AR-Klick: html[dir]', 'rtl', dir ?? '', dir === 'rtl')
    logStep(10, 'AC4 — Nach AR-Klick: Header-Nav enthält arabisches Label', 'sichtbar', String(navHasArabicBusinesses), navHasArabicBusinesses)

    expect(dir).toBe('rtl')
    expect(navHasArabicBusinesses).toBe(true)
  })

  test('AC5-refresh — Labels nach Page-Refresh korrekt für aktuelle URL-Sprache', async ({ page }) => {
    await page.goto(`${BASE_URL}/de`)
    await page.click('button[title="EN"]')
    await page.waitForURL('**/en**', { timeout: 8000 })

    // Page-Refresh
    await page.reload()
    await page.waitForSelector('header nav a', { timeout: 10000 })

    const firstNavLabel = await page.locator('header nav a').first().textContent()
    logStep(11, 'AC5 — Nach Refresh auf /en: Header-Nav erstes Label', 'Businesses', firstNavLabel?.trim() ?? '', firstNavLabel?.trim() === 'Businesses')

    expect(firstNavLabel?.trim()).toBe('Businesses')
  })

  test.afterAll(async () => {
    const endedAt = new Date().toISOString()
    const overallStatus = stepLog.some(s => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    const findings = stepLog.filter(s => s.status === 'FAIL')

    const report = [
      `## Journey: Reaktive Sprachnavigation: Labels ohne Reload (E2E-08) — ${overallStatus}`,
      `Datum: ${endedAt.slice(0, 16).replace('T', ' ')} UTC`,
      `Dauer: ${Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)}s`,
      '',
      '### Aufgebaute Test-Daten',
      '| Fixture | ID/Slug | Status |',
      '|---|---|---|',
      '| keine (Live-DB read-only) | — | OK |',
      '',
      '### Schritt-für-Schritt-Protokoll',
      '| # | Beschreibung | Erwartet | Tatsächlich | Status |',
      '|---|---|---|---|---|',
      ...stepLog.map(s => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
      '',
      '### Findings (FAIL-Einträge)',
      findings.length === 0
        ? '_keine_'
        : [
          '| Schritt | Erwartet | Tatsächlich | RCA |',
          '|---|---|---|---|',
          ...findings.map(f => `| ${f.step} | ${f.expected} | ${f.actual} | Falls Header zeigt noch alten Lang-Wert: useLang() fehlt in betroffener Komponente |`),
        ].join('\n'),
    ].join('\n')

    const reportsDir = path.join(__dirname, 'reports')
    fs.mkdirSync(reportsDir, { recursive: true })
    const date = endedAt.slice(0, 10)
    fs.writeFileSync(
      path.join(reportsDir, `reactive-language-switch-${date}.md`),
      report,
      'utf8'
    )
  })
})
