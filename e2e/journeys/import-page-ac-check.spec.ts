/* eslint-disable @typescript-eslint/no-explicit-any -- API-Antworten in der Journey bewusst untypisiert */
/**
 * Journey: import-page-ac-check (Import-Seite) — erweitert um F5920 (Katalog-Import: Vorschau, Wiedererkennung,
 * komplette Liste, Kunden-Sicht).
 *
 * Teil 1 (unveraendert, lesend): Datei-Input, Feldkatalog, Template-Link, RTL — globaler e2e-test-shop.
 * Teil 2 (F5920, schreibend): eigener Spec-Shop (+ zweiter Shop fuer Katalog-Kandidaten), AK 1-15, 17-18, 20-23, E13, E17
 * gegen 3500 / 8500 (+ Gateway-Test 8600). Aufraeumen per Admin-Shop-Delete (afterAll).
 */
import { test, expect } from '@playwright/test'
import type { BrowserContextOptions } from '@playwright/test'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { psql } from './_helpers/test-data'
import { apiCreateOffer } from './_helpers/offers-api'
import {
  uniqName, csv, openImport, uploadToPreview, tile, tiles, applyToResult, previewRow, chooseFile,
  listListings, offerCount, publicProductNames, gatewayUp, gatewayTask, translationTaskIds, resetAfterResult,
} from './_helpers/import-flow'
import { BASE_URL, BACKEND_URL } from '../env'
import { E2E_STATE_FILE } from '../state'
import { createStepLog } from '../fixtures'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[import-page-ac-check] Safety: NEVER use production ports!')
}

type StorageState = NonNullable<BrowserContextOptions['storageState']>

// Load fresh shop_owner_token from global-setup state (avoids expired hardcoded JWTs)
function loadStorageState(): StorageState {
  const stateFile = E2E_STATE_FILE
  if (!fs.existsSync(stateFile)) return { cookies: [], origins: [] }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) as { storageState?: StorageState }
  return state.storageState ?? { cookies: [], origins: [] }
}

test.describe('Import Page — Feature AC Verification', () => {
  test.use({ storageState: loadStorageState() })

  test('AC-4: file input has accept=".xlsx,.xls,.csv"', async ({ page }) => {
    await page.goto('/shop-admin/import')
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
    const accept = await fileInput.getAttribute('accept')
    expect(accept).toBe('.xlsx,.xls,.csv')
  })

  test('AC-6: FieldCatalog section is visible and open by default', async ({ page }) => {
    await page.goto('/shop-admin/import')
    // details element open
    const details = page.locator('details')
    await expect(details).toBeAttached()
    const isOpen = await details.evaluate((el: HTMLDetailsElement) => el.open)
    expect(isOpen).toBe(true)
    // Field names visible
    await expect(page.getByText('Field reference')).toBeVisible()
    await expect(page.locator('code', { hasText: 'name' }).first()).toBeVisible()
    await expect(page.locator('code', { hasText: 'category' }).first()).toBeVisible()
    await expect(page.locator('code', { hasText: 'available' }).first()).toBeVisible()
  })

  test('AC-8: template download button visible with correct href and download attribute', async ({ page }) => {
    await page.goto('/shop-admin/import')
    // Find the <a> element with download template text
    const downloadLink = page.locator('a[download]', { hasText: 'Download template' })
    await expect(downloadLink).toBeVisible()
    const href = await downloadLink.getAttribute('href')
    const hasDownload = await downloadLink.evaluate((el) => el.hasAttribute('download'))
    expect(href).toBe('/api/shop-admin/import/template')
    expect(hasDownload).toBe(true)
  })

  test('AC-7: Arabic RTL — code elements have dir=ltr', async ({ page }) => {
    // Set language to Arabic via cookie
    await page.context().addCookies([{ name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
    await page.goto('/shop-admin/import')
    // All code elements should have dir="ltr"
    const codeElements = page.locator('code')
    const count = await codeElements.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const dir = await codeElements.nth(i).getAttribute('dir')
      expect(dir).toBe('ltr')
    }
  })

  test('AC-7: Arabic RTL — FieldCatalog title in Arabic', async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
    await page.goto('/shop-admin/import')
    await expect(page.getByText('دليل الحقول')).toBeVisible()
  })

  test('AC-6/AC-7: Hebrew FieldCatalog title', async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'he', domain: '127.0.0.1', path: '/' }])
    await page.goto('/shop-admin/import')
    await expect(page.getByText('מדריך שדות')).toBeVisible()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Teil 2 — F5920 Katalog-Import (schreibend, eigener Spec-Shop)
// ═════════════════════════════════════════════════════════════════════════════

const { entries: stepLog, logStep } = createStepLog()

async function step(id: string, desc: string, fn: () => Promise<void>): Promise<void> {
  try {
    await test.step(`${id} ${desc}`, fn)
    logStep(id, desc, true)
  } catch (e) {
    logStep(id, desc, false)
    throw e
  }
}

const HEADER = ['sku', 'name', 'language', 'ean', 'category', 'available', 'price', 'currency']

test.describe('F5920 Katalog-Import — Vorschau, Wiedererkennung, komplette Liste, Kundensicht', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ storageState: { cookies: [], origins: [] } })

  let shop: WorkerShop
  let shopB: WorkerShop
  const N = { a: uniqName('alpha'), b: uniqName('beta'), c: uniqName('gamma') }
  let eanItemName = ''
  let eanValue = ''
  let manualListingId = 0
  let manualOfferId = 0
  let manualName = ''

  const LIST1 = csv(HEADER, [
    ['A-100', N.a, 'en', '', '', 'true', '1.50', 'EUR'],
    ['A-200', N.b, 'en', '', '', 'true', '2.00', 'EUR'],
    ['A-300', N.c, 'en', '', '', 'true', '3.00', 'EUR'],
  ])

  test.beforeAll(async () => {
    test.setTimeout(180_000)
    shop = await specShop('F5920-IMPORT')
    shopB = await specShop('F5920-CATALOG')
  })

  test.afterAll(async () => {
    try { await shop?.destroy() } catch (e) { console.warn('[import-page-ac-check] cleanup shop:', e) }
    try { await shopB?.destroy() } catch (e) { console.warn('[import-page-ac-check] cleanup shopB:', e) }
    const dir = path.join(__dirname, 'reports')
    fs.mkdirSync(dir, { recursive: true })
    const lines = [
      '# Journey-Report: import-page-ac-check (F5920)', '',
      `**Datum:** ${new Date().toISOString()}`, `**Frontend:** ${BASE_URL}  **Backend:** ${BACKEND_URL}`,
      `**Spec-Shop:** ${shop?.slug ?? '—'}  **Katalog-Shop:** ${shopB?.slug ?? '—'}`, '',
      '| Schritt | Beschreibung | Status |', '|---|---|---|',
      ...stepLog.map((s) => `| ${s.step} | ${s.desc} | **${s.status}** |`),
    ]
    fs.writeFileSync(path.join(dir, `import-page-ac-check-${new Date().toISOString().slice(0, 10)}.md`), lines.join('\n'))
  })

  test.beforeEach(async ({ context }) => {
    await context.addCookies(shop.storageState.cookies)
  })

  /** Kundensicht: Gast (ohne Cookies) oeffnet die Shop-Seite und sieht Produkt-Links mit diesem Namen. */
  /**
   * Does a guest see a product link named ``name`` on the customer shop page?
   * ``expected = true`` waits up to 15 s for the link (the product grid streams in after ``load`` and is late under
   * full-suite load); ``expected = false`` checks once after ``load``.
   */
  async function guestSees(browser: import('@playwright/test').Browser, lang: string, name: string, expected: boolean): Promise<boolean> {
    const ctx = await browser.newContext({ baseURL: BASE_URL })
    try {
      const page = await ctx.newPage()
      const res = await page.goto(`${BASE_URL}/${lang}/shops/${shop.slug}`, { waitUntil: 'domcontentloaded' })
      expect(res?.status()).toBe(200)
      await page.waitForLoadState('load')
      const link = page.locator(`a[href^="/${lang}/products/"]`, { hasText: name })
      if (expected) await link.first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {})
      return (await link.count()) > 0
    } finally {
      await ctx.close()
    }
  }


  /** Katalog-Kandidat im zweiten Shop: eigener, zu anderen Testdaten unaehnlicher Name (sonst haetten mehrere Zeilen mehrere Kandidaten). */
  async function makeCandidate(label: string, withPhoto: boolean): Promise<{ id: number; name: string }> {
    const name = uniqName(label)
    const cat = Number(psql('select category_id from items where category_id is not null order by random() limit 1'))
    const it = await shopB.api<any>('POST', '/items', { name, name_lang: 'en', category_id: cat, confirmed: true })
    expect(it.status).toBe(201)
    shopB.tracker.item(it.json.id, it.json.slug)
    expect((await shopB.api('POST', '/shop-listings', { item_id: it.json.id })).status).toBe(201)
    if (withPhoto) await shopB.uploadPhoto(it.json.id, 11)
    return { id: it.json.id, name }
  }

  test('AK1+AK2: Vorschau speichert nichts, Abbrechen verwirft', async ({ page, browser }) => {
    await openImport(page, 'en')
    await uploadToPreview(page, 'list.csv', LIST1)
    await step('AK1', 'Vorschau-Zaehler Neu 3 / Aktualisiert 0 / Unveraendert 0 / Fehler 0 / Duplikate 0, keine Deaktivieren-Kachel', async () => {
      expect(await tiles(page)).toEqual({ new: 3, updated: 0, unchanged: 0, error: 0, possible_duplicate: 0, deactivate: null })
      await expect(page.getByTestId('import-preview')).toContainText('nothing has been saved yet')
    })
    await step('AK1', 'nichts gespeichert: 0 Listings, 0 Offers, Kunden-Shop-Seite ohne die Artikel', async () => {
      expect(await listListings(shop.ownerToken)).toHaveLength(0)
      expect(offerCount(shop.id).total).toBe(0)
      expect(await publicProductNames(shop.id)).toHaveLength(0)
      expect(await guestSees(browser, 'en', N.a, false)).toBe(false)
    })
    await step('AK2', 'Abbrechen: Vorschau weg, Formular leer, Vorschau serverseitig verworfen', async () => {
      await page.getByTestId('import-cancel').click()
      await expect(page.getByTestId('import-preview')).toHaveCount(0)
      await expect(page.locator('input[type="file"]')).toBeAttached()
      expect(await page.locator('input[type="file"]').inputValue()).toBe('')
      await expect(page.getByTestId('import-full-list')).not.toBeChecked()
      expect(psql(`select count(*) from import_previews where shop_id=${shop.id}`)).toBe('0')
      expect(await listListings(shop.ownerToken)).toHaveLength(0)
    })
  })

  test('AK3: Uebernehmen — 3 neu, Angebotsliste (Label Import, SKU), Kunden-Shop-Seite', async ({ page, browser }) => {
    await openImport(page, 'en')
    await uploadToPreview(page, 'list.csv', LIST1)
    await applyToResult(page)
    await step('AK3', 'Ergebnis „3 new“ + Link „Go to my offers“', async () => {
      await expect(page.getByTestId('import-result')).toContainText('3 new')
      await expect(page.getByTestId('import-result').getByRole('link', { name: 'Go to my offers' })).toBeVisible()
    })
    await step('AK3', 'Angebotsliste: 3 Zeilen mit Label „Import“ und SKU', async () => {
      await page.getByTestId('import-result').getByRole('link', { name: 'Go to my offers' }).click()
      await expect(page.getByTestId('offer-row')).toHaveCount(3, { timeout: 30_000 })
      for (const sku of ['A-100', 'A-200', 'A-300']) {
        await expect(page.getByTestId('offer-sku').filter({ hasText: sku })).toHaveCount(1)
      }
      for (const row of await page.getByTestId('offer-row').all()) await expect(row).toContainText('Import')
    })
    await step('AK3', 'Kunden-Shop-Seite (Gast) zeigt die 3 Artikel', async () => {
      await expect.poll(async () => (await publicProductNames(shop.id)).length, { timeout: 20_000 }).toBe(3)
      for (const nm of [N.a, N.b, N.c]) expect(await guestSees(browser, 'en', nm, true), nm).toBe(true)
    })
  })

  test('E13: neue Artikel liegen als translate.item-Jobs im Gateway-Test (:8600)', async () => {
    test.skip(!(await gatewayUp()), 'Gateway-Test :8600 nicht erreichbar — E13 nicht pruefbar (start_test_server.sh des Gateways)')
    await step('E13', '3 Uebersetzungs-Jobs eingereiht (item_translation_status) und im Gateway als translate.item/queued sichtbar', async () => {
      const ids = translationTaskIds(shop.id)
      expect(ids).toHaveLength(3)
      for (const id of ids) {
        const t = await gatewayTask(id)
        expect(t.status).toBe(200)
        expect(t.job_type).toBe('translate.item')
      }
    })
  })

  test('AK4+AK7: gleiche SKU, neuer Preis -> Aktualisiert, kein Duplikat; unveraenderte Zeile erzeugt kein Angebot', async ({ page }) => {
    await openImport(page, 'en')
    const before = offerCount(shop.id)
    const changed = csv(HEADER, [
      ['A-100', N.a, 'en', '', '', 'true', '1.80', 'EUR'],
      ['A-200', N.b, 'en', '', '', 'true', '2.00', 'EUR'],
      ['A-300', N.c, 'en', '', '', 'true', '3.00', 'EUR'],
    ])
    await uploadToPreview(page, 'changed.csv', changed)
    await step('AK4', 'Vorschau: A-100 „Updated“ (erkannt per Artikelnummer), 2 Unveraendert', async () => {
      expect(await tiles(page)).toMatchObject({ new: 0, updated: 1, unchanged: 2, error: 0 })
      await expect(previewRow(page, 2)).toHaveAttribute('data-status', 'updated')
      await expect(previewRow(page, 2)).toContainText('Recognised by article number')
      await expect(previewRow(page, 2)).toContainText('price changes')
    })
    await applyToResult(page)
    await step('AK4', 'Ergebnis „1 updated · 2 unchanged“, weiter genau 3 Listings, A-100 mit neuem Preis', async () => {
      await expect(page.getByTestId('import-result')).toContainText('1 updated')
      await expect(page.getByTestId('import-result')).toContainText('2 unchanged')
      const l = await listListings(shop.ownerToken)
      expect(l).toHaveLength(3)
      expect(l.filter((x) => x.sku === 'A-100')).toHaveLength(1)
      expect(psql(`select o.price_tiers->0->'steps'->0->>'price' from offers o join shop_listings sl on sl.id=o.shop_listing_id where sl.shop_id=${shop.id} and sl.sku='A-100' and not o.archived`)).toMatch(/^1\.8/)
    })
    const afterChange = offerCount(shop.id)
    await step('AK7', 'Preis-Historie: genau 1 neues Angebot (altes archiviert)', async () => {
      expect(afterChange.total).toBe(before.total + 1)
      expect(afterChange.archived).toBe(before.archived + 1)
    })
    await resetAfterResult(page)
    await uploadToPreview(page, 'changed.csv', changed)
    await step('AK7', 'dieselbe Datei erneut: alle 3 „Unchanged“, Uebernehmen legt kein Angebot an', async () => {
      expect(await tiles(page)).toMatchObject({ new: 0, updated: 0, unchanged: 3 })
      await applyToResult(page)
      await expect(page.getByTestId('import-result')).toContainText('3 unchanged')
      expect(offerCount(shop.id)).toEqual(afterChange)
    })
  })

  test('AK5+AK6: Wiedererkennung per EAN und per Name (Gross-/Kleinschreibung, Randleerzeichen)', async ({ page }) => {
    await step('AK5', 'Fixture: eigener Artikel mit EAN und Listing', async () => {
      eanValue = '40' + String(Math.floor(Math.random() * 1e11)).padStart(11, '0')
      eanItemName = uniqName('eanitem')
      const cat = Number(psql('select category_id from items where category_id is not null order by random() limit 1'))
      const it = await shop.api<any>('POST', '/items', { name: eanItemName, name_lang: 'en', category_id: cat, confirmed: true, ean: eanValue })
      expect(it.status).toBe(201)
      shop.tracker.item(it.json.id, it.json.slug)
      const l = await shop.api<any>('POST', '/shop-listings', { item_id: it.json.id })
      expect(l.status).toBe(201)
    })
    const countBefore = (await listListings(shop.ownerToken)).length
    await openImport(page, 'en')
    await uploadToPreview(page, 'ean.csv', csv(['name', 'ean', 'price', 'currency'], [[uniqName('other-name'), eanValue, '9.00', 'EUR']]))
    await step('AK5', 'Zeile ohne SKU, gleiche EAN -> Aktualisiert „Recognised by EAN“, kein neuer Artikel', async () => {
      await expect(previewRow(page, 2)).toHaveAttribute('data-status', 'updated')
      await expect(previewRow(page, 2)).toContainText('Recognised by EAN')
      await applyToResult(page)
      expect(await listListings(shop.ownerToken)).toHaveLength(countBefore)
    })
    await resetAfterResult(page)
    await uploadToPreview(page, 'name.csv', csv(['name', 'price', 'currency'], [[`   ${N.b.toUpperCase()}  `, '2.00', 'EUR']]))
    await step('AK6', 'Zeile ohne SKU/EAN, gleicher Name in anderer Schreibweise -> erkannt „by name“, kein neuer Artikel', async () => {
      await expect(previewRow(page, 2)).not.toHaveAttribute('data-status', 'new')
      await expect(previewRow(page, 2)).toContainText('Recognised by name')
      await applyToResult(page)
      expect(await listListings(shop.ownerToken)).toHaveLength(countBefore)
      expect(await listListings(shop.ownerToken).then((l) => l.filter((x) => x.sku === 'A-200'))).toHaveLength(1)
    })
    await step('AK6', 'Name aus der Datei wird uebernommen (nur Schreibweise geaendert) — A-200 danach wieder in Originalschreibweise', async () => {
      expect(psql(`select i.names->>'en' from items i join shop_listings sl on sl.item_id=i.id where sl.shop_id=${shop.id} and sl.sku='A-200'`)).toBe(N.b.toUpperCase())
      await resetAfterResult(page)
      await uploadToPreview(page, 'restore.csv', csv(['sku', 'name', 'price', 'currency'], [['A-200', N.b, '2.00', 'EUR']]))
      await expect(previewRow(page, 2)).toContainText('name changes')
      await applyToResult(page)
      expect(psql(`select i.names->>'en' from items i join shop_listings sl on sl.item_id=i.id where sl.shop_id=${shop.id} and sl.sku='A-200'`)).toBe(N.b)
    })
  })

  test('AK9+AK10+AK8+AK11: komplette Liste — ohne Haekchen nichts, mit Haekchen deaktiviert (nur Import), Rueckkehr', async ({ page, browser }) => {
    await step('AK10', 'Fixture: manuell angelegtes Angebot (Quelle shop_manual)', async () => {
      manualName = uniqName('manual')
      const it = await shop.createItem('F5920', 'manual', { listing: true })
      manualListingId = it.listingId as number
      const o = await apiCreateOffer(shop.ownerToken, manualListingId, { price_type: 'fixed', price_tiers: [{ unit: 'piece', steps: [{ price: '4.00', currency: 'EUR', min_quantity: 1, max_quantity: null }] }] })
      expect([200, 201]).toContain(o.status)
      manualOfferId = o.data.id
      manualName = it.name
    })
    const only = (rows: string[][]) => csv(HEADER, rows)
    await openImport(page, 'en')
    // AK9: ohne Haekchen
    await uploadToPreview(page, 'one.csv', only([['A-100', N.a, 'en', '', '', 'true', '1.80', 'EUR']]))
    await step('AK9', 'ohne Haekchen: keine Deaktivieren-Kachel, nach Uebernehmen bleiben A-200/A-300 verfuegbar', async () => {
      expect(await tile(page, 'deactivate')).toBeNull()
      await applyToResult(page)
      const l = await listListings(shop.ownerToken)
      expect(l.filter((x) => x.sku?.startsWith('A-')).every((x) => x.available)).toBe(true)
    })
    // AK8: mit Haekchen
    await resetAfterResult(page)
    await uploadToPreview(page, 'one.csv', only([['A-100', N.a, 'en', '', '', 'true', '1.80', 'EUR']]), { fullList: true })
    await step('AK8', 'Vorschau: „2 werden auf nicht verfuegbar gesetzt“ (A-200, A-300), Liste aufklappbar', async () => {
      expect(await tile(page, 'deactivate')).toBe(2)
      await expect(page.getByTestId('import-deactivations')).toContainText('2 articles will be set to “not available”')
      await page.getByTestId('import-deactivations').locator('summary').click()
      await expect(page.getByTestId('import-deactivations')).toContainText(N.b)
      await expect(page.getByTestId('import-deactivations')).toContainText(N.c)
      expect(psql(`select count(*) from shop_listings where shop_id=${shop.id} and available=false`)).toBe('0')
    })
    await applyToResult(page)
    await step('AK8', 'Ergebnis „2 set to not available“; Listings A-200/A-300 available=false, nicht geloescht', async () => {
      await expect(page.getByTestId('import-result')).toContainText('2 set to “not available”')
      const l = await listListings(shop.ownerToken)
      expect(l.find((x) => x.sku === 'A-200')?.available).toBe(false)
      expect(l.find((x) => x.sku === 'A-300')?.available).toBe(false)
      expect(l.find((x) => x.sku === 'A-100')?.available).toBe(true)
    })
    await step('AK10', 'manuelles Angebot bleibt verfuegbar', async () => {
      const l = await listListings(shop.ownerToken)
      expect(l.find((x) => x.id === manualListingId)?.available).toBe(true)
    })
    await step('AK8', 'Angebotsliste: A-200/A-300 mit Badge „not available“; Kunden-Shop-Seite zeigt sie nicht mehr, A-100 und manuelles schon', async () => {
      await page.goto(`${BASE_URL}/shop-admin/offers`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('offer-not-available-badge')).toHaveCount(2, { timeout: 30_000 })
      await expect.poll(async () => (await publicProductNames(shop.id)).includes(N.b), { timeout: 20_000 }).toBe(false)
      expect(await guestSees(browser, 'en', N.b, false)).toBe(false)
      expect(await guestSees(browser, 'en', N.c, false)).toBe(false)
      expect(await guestSees(browser, 'en', N.a, true)).toBe(true)
      expect(await guestSees(browser, 'en', manualName, true)).toBe(true)
    })
    // AK11: Rueckkehr
    await resetAfterResult(page)
    await uploadToPreview(page, 'back.csv', only([['A-200', N.b, 'en', '', '', 'true', '2.00', 'EUR']]))
    await step('AK11', 'deaktivierter Artikel steht wieder in der Datei -> „available again“, nach Uebernehmen verfuegbar + sichtbar', async () => {
      await expect(previewRow(page, 2)).toContainText('available again')
      await applyToResult(page)
      const l = await listListings(shop.ownerToken)
      expect(l.find((x) => x.sku === 'A-200')?.available).toBe(true)
      await expect.poll(async () => (await publicProductNames(shop.id)).includes(N.b), { timeout: 20_000 }).toBe(true)
      expect(await guestSees(browser, 'en', N.b, true)).toBe(true)
    })
  })

  test('AK12: moegliches Duplikat — Name + Foto des Kandidaten, „Bestehenden verwenden“ vs. „Als neu anlegen“', async ({ page }) => {
    let cand: { id: number; name: string } = { id: 0, name: '' }
    await step('AK12', 'Fixture: Katalog-Artikel mit Foto in zweitem Shop', async () => {
      cand = await makeCandidate('dupcand', true)
    })
    await openImport(page, 'en')
    const simUse = `${cand.name}-1`
    const simNew = `${cand.name}-2`
    await uploadToPreview(page, 'dup.csv', csv(['name', 'price', 'currency'], [[simUse, '3.50', 'EUR'], [simNew, '3.60', 'EUR']]))
    await step('AK12', 'beide Zeilen als „Possible duplicate“, Kandidat mit Name und Foto, Voreinstellung „Create as new article“', async () => {
      expect((await tiles(page)).possible_duplicate).toBe(2)
      const row = previewRow(page, 2)
      await expect(row).toHaveAttribute('data-status', 'possible_duplicate')
      await expect(row.locator('fieldset')).toContainText(cand.name)
      const img = row.locator('fieldset img')
      await expect(img).toBeVisible()
      await expect.poll(async () => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
      await expect(row.locator('input[type="radio"]').last()).toBeChecked()
    })
    await step('AK12', 'Zeile 2: „Use existing article“, Zeile 3 bleibt „Create as new“ -> Ergebnis „1 linked“', async () => {
      await previewRow(page, 2).locator('input[type="radio"]').first().check()
      await applyToResult(page)
      await expect(page.getByTestId('import-result')).toContainText('1 linked to existing catalogue articles')
      const l = await listListings(shop.ownerToken)
      expect(l.some((x) => x.item_id === cand.id)).toBe(true)
      const newOne = psql(`select count(*) from shop_listings sl join items i on i.id=sl.item_id where sl.shop_id=${shop.id} and i.names->>'en' = '${simNew}'`)
      expect(newOne).toBe('1')
      const dupOfCand = psql(`select count(*) from items where names->>'en' = '${simUse}'`)
      expect(dupOfCand).toBe('0')
    })
  })

  test('AK13+AK14+AK15: Kategorie (Spalte/Vorschlag/Hinweis), Sprache aus Spalte, Sprache Standard = UI-Sprache', async ({ page, browser }) => {
    const greek = `Ελληνικό ${uniqName('el').slice(2)}`
    const dog = `${uniqName('dogrow')} Dog Food`
    const unknownCat = uniqName('unknowncat')
    const plain = uniqName('plainlang')
    await openImport(page, 'en')
    await uploadToPreview(page, 'cat.csv', csv(HEADER, [
      ['C-1', dog, '', '', 'Dog Food', 'true', '5.00', 'EUR'],
      ['C-2', unknownCat, '', '', 'Nonexistent Category XYZ', 'true', '6.00', 'EUR'],
      ['C-3', greek, 'el', '', '', 'true', '7.00', 'EUR'],
      ['C-4', plain, '', '', '', 'true', '8.00', 'EUR'],
    ]))
    await step('AK13', 'Spalte „category“ aufgeloest: Kategoriepfad „…Dog Food“ (from your file) in der Vorschau', async () => {
      await expect(previewRow(page, 2)).toContainText('Dog Food')
      await expect(previewRow(page, 2)).toContainText('from your file')
    })
    await step('AK13', 'unbekannte Kategorie-Spalte: Hinweis in der Vorschau (not known to pundo)', async () => {
      await expect(previewRow(page, 3)).toContainText('The category from your file is not known to pundo.')
    })
    await step('AK13', 'jede Zeile hat eine Kategorie ODER den Hinweis „No category could be suggested“', async () => {
      for (const r of [4, 5]) {
        const txt = await previewRow(page, r).innerText()
        expect(/suggested\)|No category could be suggested/.test(txt), `Zeile ${r}: ${txt}`).toBe(true)
      }
    })
    await applyToResult(page)
    await step('AK13', 'uebernommen: Artikel „Dog Food“ hat Kategorie und erscheint in der Kategorie-Suche', async () => {
      const row = psql(`select i.category_id from items i join shop_listings sl on sl.item_id=i.id where sl.shop_id=${shop.id} and i.names->>'en'='${dog}'`)
      expect(Number(row)).toBeGreaterThan(0)
      await expect.poll(async () => {
        const r = await fetch(`${BACKEND_URL}/api/v1/products?category_id=${row}&shop_id=${shop.id}&lat=34.9&lng=33.6&limit=50`)
        const j = (await r.json()) as { items?: Array<{ name: string }> }
        return (j.items ?? []).some((i) => i.name === dog)
      }, { timeout: 20_000 }).toBe(true)
    })
    await step('AK14', 'language=el: Name als griechischer Name gespeichert, /el/ Kunden-Shop-Seite zeigt ihn', async () => {
      const names = psql(`select i.names::text from items i join shop_listings sl on sl.item_id=i.id where sl.shop_id=${shop.id} and i.names->>'el'='${greek}'`)
      expect(names).toContain('"el"')
      expect(names).not.toContain('"de"')
      await expect.poll(async () => (await publicProductNames(shop.id, 'el')).includes(greek), { timeout: 20_000 }).toBe(true)
      expect(await guestSees(browser, 'el', greek, true)).toBe(true)
    })
    await step('AK15', 'ohne language-Spalte (UI englisch): Name als englischer Name, nicht „de“', async () => {
      const names = psql(`select i.names::text from items i join shop_listings sl on sl.item_id=i.id where sl.shop_id=${shop.id} and i.names->>'en'='${plain}'`)
      expect(names).toContain('"en"')
      expect(names).not.toContain('"de"')
    })
  })

  test('AK17+AK23: doppelte SKU und Fehlerzeile -> Vorschau mit uebersetzten Fehlern, Uebernehmen gesperrt, nichts gespeichert', async ({ page }) => {
    const before = (await listListings(shop.ownerToken)).length
    await openImport(page, 'en')
    await uploadToPreview(page, 'dups.csv', csv(['sku', 'name', 'price'], [['D-1', uniqName('dup1'), '1'], ['D-1', uniqName('dup2'), '2'], ['D-2', uniqName('ok'), '3']]))
    await step('AK17', 'beide Zeilen mit gleicher SKU als Fehler „Duplicate in the file“, 1 gueltige Zeile', async () => {
      expect(await tiles(page)).toMatchObject({ error: 2, new: 1 })
      for (const r of [2, 3]) {
        await expect(previewRow(page, r)).toHaveAttribute('data-status', 'error')
        await expect(previewRow(page, r).getByTestId('import-row-errors')).toContainText('Duplicate in the file')
      }
    })
    await step('AK23', 'Uebernehmen deaktiviert + Sperr-Hinweis, nichts gespeichert', async () => {
      await expect(page.getByTestId('import-apply')).toBeDisabled()
      await expect(page.getByTestId('import-apply-blocked')).toBeVisible()
      expect((await listListings(shop.ownerToken)).length).toBe(before)
    })
  })

  test('AK18: abgelaufene Vorschau -> Hinweis, nichts gespeichert', async ({ page }) => {
    const before = (await listListings(shop.ownerToken)).length
    await openImport(page, 'en')
    await uploadToPreview(page, 'late.csv', csv(['name', 'price'], [[uniqName('late'), '1']]))
    psql(`update import_previews set expires_at = now() - interval '1 minute' where shop_id=${shop.id}`)
    await page.getByTestId('import-apply').click()
    await step('AK18', 'Hinweis „The preview has expired. Please upload the file again.“, kein Ergebnis, nichts gespeichert', async () => {
      await expect(page.getByRole('alert').filter({ hasText: 'The preview has expired' })).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId('import-result')).toHaveCount(0)
      expect((await listListings(shop.ownerToken)).length).toBe(before)
    })
    await page.getByTestId('import-cancel').click().catch(() => {})
  })

  test('AK22: SKU im Angebotsformular bearbeiten, Kollision -> verstaendliche Meldung; spaeterer Import trifft das Angebot', async ({ page }) => {
    // Several page loads + saves + an import in one test: 30 s is too tight under the full-suite load of the pre-push gate.
    test.setTimeout(120_000)
    await step('AK22', 'SKU „B-200“ am manuellen Angebot setzen -> Liste zeigt B-200', async () => {
      await page.goto(`${BASE_URL}/shop-admin/offers/${manualOfferId}/edit`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('#offer-sku')).toBeVisible({ timeout: 30_000 })
      await page.locator('#offer-sku').fill('B-200')
      await page.locator('form button[type="submit"]').click()
      await page.waitForURL(/\/shop-admin\/offers(\?|$)/, { timeout: 30_000 })
      await expect(page.getByTestId('offer-sku').filter({ hasText: 'B-200' })).toHaveCount(1, { timeout: 30_000 })
    })
    await step('AK22', 'zweites Angebot mit derselben SKU -> Fehlermeldung, nichts gespeichert', async () => {
      const a100 = (await listListings(shop.ownerToken)).find((x) => x.sku === 'A-100')
      expect(a100).toBeTruthy()
      const offers = await shop.api<any>('GET', '/offers?limit=100')
      const offer = offers.json.items.find((o: any) => o.shop_listing_id === a100!.id || o.listing_sku === 'A-100')
      await page.goto(`${BASE_URL}/shop-admin/offers/${offer.id}/edit`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('#offer-sku')).toHaveValue('A-100', { timeout: 30_000 })
      await page.locator('#offer-sku').fill('B-200')
      await page.locator('form button[type="submit"]').click()
      await expect(page.locator('#offer-sku-error')).toContainText('already used by another article in your shop')
      const l = await listListings(shop.ownerToken)
      expect(l.find((x) => x.id === a100!.id)?.sku).toBe('A-100')
      expect(l.filter((x) => x.sku === 'B-200')).toHaveLength(1)
    })
    await step('AK22', 'Import mit SKU „B-200“ aktualisiert genau das manuelle Angebot (kein neuer Artikel)', async () => {
      const before = (await listListings(shop.ownerToken)).length
      await openImport(page, 'en')
      await uploadToPreview(page, 'b200.csv', csv(['sku', 'name', 'price', 'currency'], [['B-200', manualName, '4.50', 'EUR']]))
      await expect(previewRow(page, 2)).toHaveAttribute('data-status', 'updated')
      await expect(previewRow(page, 2)).toContainText('Recognised by article number')
      await applyToResult(page)
      const l = await listListings(shop.ownerToken)
      expect(l).toHaveLength(before)
      expect(l.find((x) => x.sku === 'B-200')?.id).toBe(manualListingId)
    })
  })

  test('AK20: Vorlage mit 9 Spalten in der Reihenfolge; Feldkatalog beschreibt alle Spalten + Wiedererkennungs-Reihenfolge in 6 Sprachen', async ({ page }) => {
    await step('AK20', 'Vorlage enthaelt sku, name, language, ean, category, available, price, currency, image_url (Reihenfolge)', async () => {
      await openImport(page, 'en')
      const res = await page.request.get(`${BASE_URL}/api/shop-admin/import/template`)
      expect(res.status()).toBe(200)
      const file = path.join(os.tmpdir(), `f5920-template-${process.pid}.xlsx`)
      fs.writeFileSync(file, await res.body())
      try {
        const xml = execFileSync('unzip', ['-p', file, 'xl/worksheets/sheet1.xml'], { encoding: 'utf8' })
        const row1 = xml.match(/<row r="1">(.*?)<\/row>/)?.[1] ?? ''
        const header = [...row1.matchAll(/<t>(.*?)<\/t>/g)].map((m) => m[1])
        expect(header).toEqual(['sku', 'name', 'language', 'ean', 'category', 'available', 'price', 'currency', 'image_url'])
        // Beispielzeilen tragen eine SKU (Spalte A, ab Zeile 2)
        expect(xml).toMatch(/<c r="A2"[^>]*><is><t>[^<]+<\/t>/)
      } finally {
        fs.rmSync(file, { force: true })
      }
    })
    const TITLE: Record<string, string> = {
      en: 'How pundo recognises your articles', de: 'So erkennt pundo deine Artikel wieder',
      el: 'Πώς το pundo αναγνωρίζει τα προϊόντα σου', ru: 'Как pundo узнаёт ваши товары',
      ar: 'كيف يتعرّف pundo على منتجاتك', he: 'כך pundo מזהה את הפריטים שלך',
    }
    for (const lang of Object.keys(TITLE)) {
      await step('AK20', `Feldkatalog [${lang}]: 9 Spalten (sku, language neu) + Wiedererkennungs-Reihenfolge`, async () => {
        await openImport(page, lang)
        const details = page.locator('details').first()
        await expect(details).toContainText(TITLE[lang])
        for (const c of ['sku', 'name', 'language', 'ean', 'category', 'available', 'price', 'currency', 'image_url']) {
          await expect(details.locator('td code', { hasText: new RegExp(`^${c}$`) }).first()).toBeVisible()
        }
        // Wiedererkennungs-Reihenfolge: 1. SKU, 2. EAN, 3. Name (nummerierte Liste)
        const li = details.locator('ol li')
        await expect(li).toHaveCount(3)
        await expect(li.nth(0)).toContainText('sku')
        await expect(li.nth(1)).toContainText('EAN')
      })
    }
  })

  test('AK19+AK23 (UI-Darstellung, praeparierter Status): Sheet-Sync-Status mit Zaehlern bzw. Fehlerliste', async ({ page }) => {
    const sheet = 'https://docs.google.com/spreadsheets/d/F5920E2EPreparedStatusOnly000000000000000000/edit'
    const upsert = (status: string, result: object, ts: string) => {
      const json = JSON.stringify(result).replace(/'/g, "''")
      const exists = psql(`select count(*) from import_status where shop_id=${shop.id}`) !== '0'
      if (exists) psql(`update import_status set google_sheet_url='${sheet}', last_sync='${ts}', last_sync_status='${status}', last_sync_result='${json}'::jsonb where shop_id=${shop.id}`)
      else psql(`insert into import_status (shop_id, google_sheet_url, last_sync, last_sync_status, last_sync_result, created_at, updated_at) values (${shop.id}, '${sheet}', '${ts}', '${status}', '${json}'::jsonb, now(), now())`)
    }
    upsert('ok', { imported: 3, created: 0, updated: 1, unchanged: 1, deactivated: 1, possible_duplicates: 0, possible_duplicate_rows: [], row_count: 3, error_count: 0, errors: [], errors_truncated: false, image_download_pending: 0, error_code: null }, '2026-10-15T12:00:00Z')
    await step('AK19', 'Sync-Status: Zeitpunkt, „1 Updated“, „1 Will be set to not available“, 0 Fehler', async () => {
      await openImport(page, 'en')
      const t = page.getByTestId('sheets-sync-tiles')
      await expect(t).toBeVisible()
      await expect(t.locator('[data-tile="updated"]')).toContainText('1')
      await expect(t.locator('[data-tile="deactivate"]')).toContainText('1')
      await expect(t.locator('[data-tile="new"]')).toContainText('0')
      await expect(page.getByText('Last sync').first()).toBeVisible()
    })
    const PAST: Record<string, string> = {
      en: 'Set to “not available”', de: 'Auf „nicht verfügbar“ gesetzt', el: 'Ορίστηκαν ως «μη διαθέσιμα»',
      ru: 'Получили статус «нет в наличии»', ar: 'ضُبطت على «غير متوفر»', he: 'סומנו כ„לא זמין”',
    }
    for (const lang of Object.keys(PAST)) {
      await step('AK19', `Sheets-Status [${lang}]: Deaktiviert-Kachel in der Vergangenheitsform`, async () => {
        await openImport(page, lang)
        await expect(page.getByTestId('sheets-sync-tiles').locator('[data-tile="deactivate"]')).toContainText(PAST[lang])
      })
    }
    upsert('error', { imported: 0, error_count: 1, errors: [{ row: 3, message: 'missing required column: name', code: 'missing_name' }], errors_truncated: false, image_download_pending: 0, error_code: 'rows_failed' }, '2026-10-15T12:05:00Z')
    await step('AK23', 'Sheet mit Fehlerzeile: Status „Error“ + Zeilenliste „Row 3 … Name is missing“', async () => {
      await openImport(page, 'en')
      await expect(page.getByText('Error', { exact: true }).first()).toBeVisible()
      await expect(page.locator('li', { hasText: 'Row 3' }).filter({ hasText: 'Name is missing' })).toBeVisible()
    })
    psql(`delete from import_status where shop_id=${shop.id}`)
  })

  for (const lang of ['el', 'ar'] as const) {
    test(`AK21 [${lang}]: Handy 390 px — Zaehler, Karten und Knoepfe ohne Ueberlagerung, ${lang === 'ar' ? 'RTL gespiegelt' : 'LTR'}`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 390, height: 844 })
      const cand = await makeCandidate(`mobcand-${lang}`, false)
      await openImport(page, lang)
      await uploadToPreview(page, 'mobile.csv', csv(HEADER, [
        ['M-1', uniqName('m1'), 'en', '', 'Dog Food', 'true', '1.00', 'EUR'],
        ['A-100', N.a, 'en', '', '', 'true', '9.99', 'EUR'],
        ['', `${cand.name}-9`, 'en', '', '', 'true', '2.00', 'EUR'],
      ]))
      await step('AK21', `[${lang}] dir, kein horizontaler Ueberlauf`, async () => {
        expect(await page.evaluate(() => document.documentElement.dir)).toBe(lang === 'ar' ? 'rtl' : 'ltr')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow).toBeLessThanOrEqual(1)
      })
      await step('AK21', `[${lang}] Zaehler-Kacheln ueberlappen nicht${lang === 'ar' ? ', Reihenfolge gespiegelt' : ''}`, async () => {
        const boxes: Record<string, { x: number; y: number; width: number; height: number }> = {}
        for (const k of ['new', 'updated', 'unchanged', 'error', 'possible_duplicate']) {
          const b = await page.locator(`[data-testid="import-count-tiles"] [data-tile="${k}"]`).boundingBox()
          expect(b, k).toBeTruthy()
          boxes[k] = b!
        }
        const ks = Object.keys(boxes)
        for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
          const a = boxes[ks[i]], b = boxes[ks[j]]
          const overlap = a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1
          expect(overlap, `${ks[i]} x ${ks[j]}`).toBe(false)
        }
        if (lang === 'ar') expect(boxes.new.x).toBeGreaterThan(boxes.updated.x)
        else expect(boxes.new.x).toBeLessThan(boxes.updated.x)
      })
      await step('AK21', `[${lang}] Karten untereinander ohne Ueberlagerung; Duplikat-Auswahl lesbar`, async () => {
        const rows = await page.getByTestId('import-preview-row').all()
        expect(rows.length).toBe(3)
        let lastBottom = -1
        for (const r of rows) {
          const b = (await r.boundingBox())!
          expect(b.y).toBeGreaterThanOrEqual(lastBottom - 1)
          lastBottom = b.y + b.height
          expect(b.x).toBeGreaterThanOrEqual(-1)
          expect(b.x + b.width).toBeLessThanOrEqual(391)
        }
        const dup = previewRow(page, 4).locator('fieldset')
        await expect(dup).toBeVisible()
        const radios = await dup.locator('input[type="radio"]').all()
        expect(radios).toHaveLength(2)
      })
      await step('AK21', `[${lang}] „Apply“/„Cancel“ sichtbar im Viewport, ueberlappen weder sich noch die letzte Karte`, async () => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        const a = (await page.getByTestId('import-apply').boundingBox())!
        const c = (await page.getByTestId('import-cancel').boundingBox())!
        expect(a.y).toBeGreaterThanOrEqual(0)
        expect(a.y + a.height).toBeLessThanOrEqual(845)
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.x + a.width).toBeLessThanOrEqual(391)
        const sep = a.x + a.width <= c.x + 1 || c.x + c.width <= a.x + 1 || a.y + a.height <= c.y + 1 || c.y + c.height <= a.y + 1
        expect(sep).toBe(true)
        const last = (await previewRow(page, 4).boundingBox())!
        expect(last.y + last.height).toBeLessThanOrEqual(a.y + 2)
      })
      await page.getByTestId('import-cancel').click()
    })
  }

  const RESULT: Record<string, { title: string; created: string; toOffers: string }> = {
    el: { title: 'Η εισαγωγή ολοκληρώθηκε', created: '1 νέα', toOffers: 'Μετάβαση στις προσφορές μου' },
    ar: { title: 'اكتمل الاستيراد', created: '1 جديد', toOffers: 'الانتقال إلى عروضي' },
  }
  for (const lang of ['el', 'ar'] as const) {
    test(`AK3/AK21 [${lang}]: Ergebnis uebersetzt, Handy 390 px ohne Ueberlauf`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await openImport(page, lang)
      await uploadToPreview(page, 'result.csv', csv(['name', 'price', 'currency'], [[uniqName(`result-${lang}`), '2.00', 'EUR']]))
      await applyToResult(page)
      await step('AK3', `[${lang}] Ergebnis: Titel, „1 neu“, Link zu den Angeboten uebersetzt`, async () => {
        const r = page.getByTestId('import-result')
        await expect(r).toContainText(RESULT[lang].title)
        await expect(r).toContainText(RESULT[lang].created)
        await expect(r.getByRole('link', { name: RESULT[lang].toOffers })).toBeVisible()
      })
      await step('AK21', `[${lang}] Ergebnis auf 390 px: dir=${lang === 'ar' ? 'rtl' : 'ltr'}, kein horizontaler Ueberlauf`, async () => {
        expect(await page.evaluate(() => document.documentElement.dir)).toBe(lang === 'ar' ? 'rtl' : 'ltr')
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
      })
    })
  }

  test('AK12b: Tippfehler in jedem Wort (kein gemeinsames Wort) wird als moegliches Duplikat gefunden', async ({ page }) => {
    const base = uniqName('x').slice(0, 10)
    const cand = await shopB.api<any>('POST', '/items', {
      name: `${base} Premium Lachsfutter`, name_lang: 'en', confirmed: true,
      category_id: Number(psql('select category_id from items where category_id is not null order by random() limit 1')),
    })
    expect(cand.status).toBe(201)
    shopB.tracker.item(cand.json.id, cand.json.slug)
    expect((await shopB.api('POST', '/shop-listings', { item_id: cand.json.id })).status).toBe(201)
    await openImport(page, 'en')
    await uploadToPreview(page, 'typo.csv', csv(['name', 'price'], [[`${base.slice(0, 9)}x Premiun Lachsfuter`, '2']]))
    await step('AK12', 'Tippfehler-Zeile ohne gemeinsames Wort -> „Possible duplicate“ mit dem Kandidaten', async () => {
      await expect(previewRow(page, 2)).toHaveAttribute('data-status', 'possible_duplicate')
      await expect(previewRow(page, 2).locator('fieldset')).toContainText(`${base} Premium Lachsfutter`)
    })
    await page.getByTestId('import-cancel').click()
  })

  test('CSV: Semikolon + cp1253 (Griechisch) + Dezimalkomma -> Vorschau korrekt', async ({ page }) => {
    // cp1253: Α-Ω 0x391-0x3A9 -> 0xC1-0xD9, α-ω 0x3B1-0x3C9 -> 0xE1-0xF9, ASCII unveraendert
    const enc = (t: string) => Buffer.from([...t].map((c) => {
      const cp = c.codePointAt(0) as number
      if (cp >= 0x391 && cp <= 0x3a9) return cp - 0x391 + 0xc1
      if (cp >= 0x3b1 && cp <= 0x3c9) return cp - 0x3b1 + 0xe1
      return cp
    }))
    const g1 = `Φετα ${uniqName('g').slice(0, 10)}`
    const g2 = `Γαλα ${uniqName('g').slice(0, 10)}`
    await openImport(page, 'el')
    await uploadToPreview(page, 'greek.csv', enc(`sku;name;price;currency;available\nGR-1;${g1};3,50;EUR;true\nGR-2;${g2};1.234,50;EUR;true\n`))
    await step('CSV', 'cp1253 + „;“ + Dezimalkomma: Namen unbeschaedigt, Preise 3.5 / 1234.5, 2 neu, 0 Fehler', async () => {
      expect(await tiles(page)).toMatchObject({ new: 2, error: 0 })
      await expect(previewRow(page, 2)).toContainText(g1)
      await expect(previewRow(page, 3)).toContainText(g2)
      await expect(previewRow(page, 2)).toContainText('3.5')
      await expect(previewRow(page, 3)).toContainText('1234.5')
    })
    await page.getByTestId('import-cancel').click()
  })

  test('E17: Zeilenlimit pro Shop (import_max_rows), Fehlermeldung, import_runs; Dateigroesse 20 MB', async ({ page }) => {
    test.setTimeout(180_000)
    await step('E17', 'Limit 3: Datei mit 5 Zeilen -> Meldung „more rows than allowed for your shop (3)“, keine Vorschau', async () => {
      psql(`update shops set import_max_rows=3 where id=${shop.id}`)
      await openImport(page, 'en')
      await chooseFile(page, 'five.csv', csv(['name'], [[uniqName('r1')], [uniqName('r2')], [uniqName('r3')], [uniqName('r4')], [uniqName('r5')]]))
      await expect(page.getByTestId('import-upload-error')).toContainText('more rows than allowed for your shop (3)')
      await expect(page.getByTestId('import-preview')).toHaveCount(0)
    })
    await step('E17', 'Limit 3: Datei mit genau 3 Zeilen geht durch; import_runs schreibt kind=file, ok, row_count=3', async () => {
      const runsBefore = Number(psql(`select count(*) from import_runs where shop_id=${shop.id}`))
      await openImport(page, 'en')
      await uploadToPreview(page, 'three.csv', csv(['name', 'price'], [[uniqName('t1'), '1'], [uniqName('t2'), '2'], [uniqName('t3'), '3']]))
      await applyToResult(page)
      const last = psql(`select kind, status, row_count from import_runs where shop_id=${shop.id} order by id desc limit 1`)
      expect(last).toBe('file|ok|3')
      expect(Number(psql(`select count(*) from import_runs where shop_id=${shop.id}`))).toBe(runsBefore + 1)
      psql(`update shops set import_max_rows=NULL where id=${shop.id}`)
    })
    await step('E17', '12 MB Datei passiert den Frontend-Proxy (kein 413), 21 MB -> 413 + Meldung „File too large. Maximum size is 20 MB.“', async () => {
      await openImport(page, 'en')
      const big = (mb: number) => Buffer.from('name\n' + `${'x'.repeat(100_000)}\n`.repeat(Math.ceil((mb * 1024 * 1024) / 100_001)))
      const post = page.waitForResponse((r) => r.url().includes('/import/previews') && r.request().method() === 'POST', { timeout: 120_000 })
      await chooseFile(page, 'big12.csv', big(12))
      const r12 = await post
      expect(r12.status(), '12 MB darf nicht am Proxy scheitern').not.toBe(413)
      // 12 MB erzeugen eine Vorschau (Zeilen mit 100k-Namen) oder einen Datei-Fehler; beides ist ok, nur nicht „too large“
      await expect(page.getByTestId('import-upload-error').or(page.getByTestId('import-preview')).first()).toBeVisible({ timeout: 120_000 })
      if (await page.getByTestId('import-preview').count()) await page.getByTestId('import-cancel').click()
      await openImport(page, 'en')
      const post2 = page.waitForResponse((r) => r.url().includes('/import/previews') && r.request().method() === 'POST', { timeout: 120_000 })
      await chooseFile(page, 'big21.csv', big(21))
      expect((await post2).status()).toBe(413)
      await expect(page.getByTestId('import-upload-error')).toContainText('File too large. Maximum size is 20 MB.')
    })
  })
})
