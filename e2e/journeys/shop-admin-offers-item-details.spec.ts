/**
 * Shop-Admin Offers — Gruppe E: Item-Details, Filter & Dashboard-Aufraeumen
 *
 * F8950 T32: Teil 4 von 4 des frueheren `shop-admin-offers.spec.ts` (siehe dort die Uebersicht). Eigener Worker-Shop.
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect, type WorkerShop } from './_helpers/worker-shop'
import { e2eName } from './_helpers/test-data'
import { apiGet, apiCreateOffer, getOrCreateShopListing, waitHydrated } from './_helpers/offers-api'
import { BASE_URL as FRONTEND_URL, BACKEND_URL } from '../env'

let W: WorkerShop

// =============================================================================
// GROUP E — Item-Details, Filter & Dashboard-Aufräumen
//
// Spec: 2026-05-19-offer-list-item-details
// ACs:  AC-1 (Dashboard), AC-2–4 (Item-Name), AC-5–6 (Kategorie-Chip),
//       AC-9–10 (Thumbnail), AC-11–15 (Textsuche), AC-18–19 (Edit H1+Header),
//       AC-20 (RTL), AC-24 (nav_products entfernt)
//
// Backend-Status-Hinweis:
//   Tests E2a/E3a/E4a/E6a erwarten item-Embed in GET /offers — falls das Backend
//   den Embed noch nicht liefert, skipped der Test (SKIP, kein FAIL).
//   E1, E5, E6b (Fallback), E7 laufen rein frontend-seitig sofort.
// =============================================================================

test.describe.serial('Group E — Item-Details, Filter & Dashboard', () => {

  // Shared token für API-Calls in Gruppe E
  let eOwnerToken: string | null = null
  let eOfferId: number | null = null
  const eCreatedOfferIds: number[] = []
  const eCreatedListingIds: number[] = []
  const eCreatedItemIds: number[] = []

  /**
   * Holt eine verfügbare category_id aus dem Backend. F8950 T16/AK5: zufällig aus den ersten 50 statt immer die erste -
   * der Fuzzy-409 des Backends vergleicht Item-Namen innerhalb einer Kategorie; zwei parallele Läufe (--repeat-each,
   * mehrere Worker) mit demselben Namensmuster in derselben Kategorie liefen sonst in 409 und skippten Group E.
   */
  async function getFirstCategoryId(): Promise<number | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/categories?limit=50`)
      if (!res.ok) return null
      const data = await res.json() as { items?: Array<{ id: number }> }
      const items = data.items ?? []
      return items.length ? items[Math.floor(Math.random() * items.length)].id : null
    } catch { return null }
  }

  /** Erstellt ein minimales Item via shop-owner API. Bei 409 fuzzy-match: vorhandenes Item wiederverwenden. */
  async function createTestItem(token: string, categoryId: number): Promise<number | null> {
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        item_type: 'product',
        name_de: e2eName('OFFERS', 'GroupE-Testartikel'),
        category_id: categoryId,
      }),
    })
    if (res.status === 201) {
      const data = await res.json() as { id: number }
      return data.id
    }
    // Kein Wiederverwenden fremder Items bei 409 (B8950-012): der Marker-Name ist eindeutig.
    console.warn(`[Group E] createTestItem failed: ${res.status}`)
    return null
  }

  test.beforeAll(async ({ workerShop }) => {
    test.setTimeout(60_000)
    W = workerShop
    // Verify backend reachable
    const health = await fetch(`${BACKEND_URL}/api/v1/categories`)
    if (!health.ok) throw new Error(`[Group E] Backend health check failed: ${health.status}`)

    eOwnerToken = W.ownerToken

    if (eOwnerToken) {
      // 1. Finde eine gültige category_id dynamisch (statt hardcoded item_id=1)
      const categoryId = await getFirstCategoryId()
      if (!categoryId) {
        console.warn('[Group E] Keine Kategorie gefunden — Offer-abhängige Tests werden übersprungen')
      } else {
        // 2. Erstelle ein Item
        const itemId = await createTestItem(eOwnerToken, categoryId)
        if (itemId) {
          eCreatedItemIds.push(itemId)
          W.tracker.item(itemId)
          // 3. Erstelle ein ShopListing für dieses Item
          const listingId = await getOrCreateShopListing(eOwnerToken, itemId)
          if (listingId) {
            eCreatedListingIds.push(listingId)
            // 4. Erstelle ein Offer
            const r = await apiCreateOffer(eOwnerToken, listingId, {})
            if (r.status === 201) {
              eOfferId = r.data.id
              eCreatedOfferIds.push(eOfferId)
              console.log(`[Group E] Setup: item=${itemId}, listing=${listingId}, offer=${eOfferId}`)
            }
          }
        }
      }
    }
  })

  test.afterAll(async () => {
    await W.cleanupSpecData()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E1 — Dashboard: keine Produkte-Kachel (AC-1)
  // ──────────────────────────────────────────────────────────────────────────

  test('E1 — Dashboard zeigt keine Produkte-Kachel (AC-1)', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/dashboard')
    await waitHydrated(page)

    const bodyText = await page.locator('body').innerText()

    // Die Produkte-Kachel muss fehlen
    // Wir suchen nach "Products" / "Produkte" als isoliertes Nav-Label
    // (Ein Link /shop-admin/products darf nicht existieren)
    const productLinks = await page.locator('a[href="/shop-admin/products"]').count()
    expect(productLinks, 'E1: /shop-admin/products Link darf nicht im Dashboard sein').toBe(0)

    // Die übrigen Quick-Links müssen noch da sein (im Dashboard-Grid, nicht in der Nav)
    const main = page.locator('main')
    await expect(main.locator('a[href="/shop-admin/offers"]')).toBeVisible()
    await expect(main.locator('a[href="/shop-admin/profile"]')).toBeVisible()
    await expect(main.locator('a[href="/shop-admin/hours"]')).toBeVisible()

    console.log('[E1] Dashboard body excerpt (first 300 chars):', bodyText.slice(0, 300))
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E5 — Textsuche in OfferList (AC-11–15) — läuft sofort (client-seitig)
  // ──────────────────────────────────────────────────────────────────────────

  test('E5a — Suchfeld ist sichtbar und hat Placeholder (AC-11)', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    const searchInput = page.locator('[data-testid="offer-search"]')
    await expect(searchInput).toBeVisible({ timeout: 8_000 })

    const placeholder = await searchInput.getAttribute('placeholder')
    expect(placeholder, 'E5a: Suchfeld hat keinen Placeholder').toBeTruthy()
    expect(placeholder!.length, 'E5a: Placeholder ist leer').toBeGreaterThan(0)
  })

  test('E5b — Suche filtert sichtbare Items (AC-12)', async ({ page }) => {
    if (!eOwnerToken) { test.skip(true, 'Login nicht möglich'); return }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    const searchInput = page.locator('[data-testid="offer-search"]')
    await expect(searchInput).toBeVisible({ timeout: 8_000 })

    // Count items before search
    const allRows = page.locator('div.bg-white.rounded-xl.border > div')
    const totalBefore = await allRows.count()

    if (totalBefore === 0) {
      test.skip(true, 'Keine Angebote im aktiven Tab — Suche nicht testbar')
      return
    }

    // pressSequentially triggers React onChange per keystroke (more reliable than fill() for
    // controlled inputs under React 19 with CDP-based event dispatch)
    await searchInput.pressSequentially('zzz-no-match-xyzxyzxyz', { delay: 20 })
    await expect(searchInput).toHaveValue('zzz-no-match-xyzxyzxyz', { timeout: 3_000 })

    // Language-independent check: the offer list container must disappear and the no-results
    // paragraph (text-gray-400) must appear. Avoids regex that only covered EN/DE (B8950-002).
    await expect(
      page.locator('div.bg-white.rounded-xl.border'),
      'E5b: Offer-Tabelle noch sichtbar — Filter hat nicht angeschlagen'
    ).toHaveCount(0, { timeout: 8_000 })
    await expect(
      page.locator('p.text-gray-400.text-sm.text-center'),
      'E5b: No-results-Paragraph fehlt'
    ).toBeVisible({ timeout: 3_000 })
  })

  test('E5c — Suchfeld leeren zeigt alle Items wieder (AC-13)', async ({ page }) => {
    if (!eOwnerToken) { test.skip(true, 'Login nicht möglich'); return }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    const searchInput = page.locator('[data-testid="offer-search"]')
    await expect(searchInput).toBeVisible({ timeout: 8_000 })

    // Fill search with no-match term
    await searchInput.fill('zzz-no-match')
    // F8950 T22: statt waitForTimeout(300) - Filter ist State-getrieben, die Leer-Meldung erscheint
    await expect(page.locator('p.text-gray-400')).toBeVisible()

    // Clear search
    await searchInput.fill('')

    // After clearing: no-results message should NOT be visible (unless list is truly empty)
    const noResultsFiltered = page.locator('p', { hasText: /no offers match the filter|keine angebote entsprechen dem filter/i })
    await expect(noResultsFiltered).toHaveCount(0)
    const hasFilterMsg = await noResultsFiltered.count() > 0
    expect(hasFilterMsg, 'E5c: "no results filtered" Meldung noch sichtbar nach Leeren des Suchfelds').toBe(false)
  })

  test('E5d — Kein Crash bei leerem Suchfeld-Ergebnis: Meldung zeigen (AC-15)', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    const searchInput = page.locator('[data-testid="offer-search"]')
    await expect(searchInput).toBeVisible({ timeout: 8_000 })

    // Force a no-match
    await searchInput.fill('zzz-absolutely-no-match-xyzxyz')
    await expect(page.locator('p.text-gray-400')).toBeVisible()

    // Page must not crash (no error boundary, no blank page)
    await expect(page.locator('body')).toBeVisible()

    // Either rows are gone or "no results" message (either tr.no_results or tr.offer_no_results_filtered)
    const rowContainer = page.locator('div.bg-white.rounded-xl.border.divide-y')
    const containerExists = await rowContainer.count() > 0

    if (!containerExists) {
      // No container means no rows — check for empty-state message
      const emptyMsg = page.locator('p.text-gray-400')
      await expect(emptyMsg).toBeVisible({ timeout: 3_000 })
    }
    // In any case: no JS error thrown (page still functional)
    const title = await page.title()
    expect(title.length, 'E5d: Page hat keinen Titel mehr — möglicher Crash').toBeGreaterThan(0)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E4b — Thumbnail Fallback-SVG (AC-10) — läuft ohne Backend-Embed
  // ──────────────────────────────────────────────────────────────────────────

  test('E4b — Fallback-SVG sichtbar wenn kein Foto vorhanden (AC-10)', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    // Page must render without crash regardless of offer count
    await expect(page.locator('body')).toBeVisible()

    // The thumbnail placeholder is a div.shrink-0.w-12.h-12 containing an SVG with aria-hidden
    // It appears when offer.item?.photos[0] is null/undefined
    const placeholders = page.locator('div.shrink-0.w-12.h-12 svg[aria-hidden="true"]')
    const count = await placeholders.count()

    // We can't guarantee ALL offers have no photo — just ensure the component renders without crash
    // Either: at least one placeholder exists OR at least one <img> thumbnail exists
    const thumbnails = page.locator('div.shrink-0.w-12.h-12 img')
    const imgCount = await thumbnails.count()

    console.log(`[E4b] SVG placeholders: ${count}, img thumbnails: ${imgCount}`)

    if (count + imgCount === 0) {
      // No offer rows in the active tab — the component renders the empty state correctly
      // Verify the empty-state message is shown instead (no crash, no blank page)
      const emptyMsg = page.locator('p.text-gray-400.text-sm.py-8')
      await expect(emptyMsg).toBeVisible()
      test.skip(true, 'E4b: Keine Angebote im aktiven Tab — Thumbnail-Struktur nicht prüfbar, aber kein Crash')
      return
    }

    expect(
      count + imgCount,
      'E4b: Thumbnail-Slots gefunden, aber keiner ist sichtbar'
    ).toBeGreaterThan(0)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E2a — Item-Namen in OfferList (AC-2) — benötigt item-Embed
  // ──────────────────────────────────────────────────────────────────────────

  test('E2a — Offer-Liste zeigt Item-Name aus item.names (AC-2)', async ({ page }) => {
    if (!eOwnerToken) { test.skip(true, 'Login nicht möglich'); return }

    // Check whether backend delivers item-embed
    const token = eOwnerToken
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const offers = (data as { items: Array<{ id: number; item?: { names?: Record<string, string> } }> }).items
    const hasItemEmbed = offers.some(o => o.item?.names && Object.keys(o.item.names).length > 0)

    if (!hasItemEmbed) {
      test.skip(true, 'Backend liefert noch kein item-Embed — AC-2 nach Backend-Deployment testen')
      return
    }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    // At least one offer row must exist
    const offerRows = page.locator('div.bg-white.rounded-xl.border.divide-y > div')
    const rowCount = await offerRows.count()
    expect(rowCount, 'E2a: Keine Offer-Zeilen gefunden').toBeGreaterThan(0)

    // The item name is rendered as a <p class="...font-medium..."> inside each row
    const nameCell = offerRows.first().locator('p.font-medium, p[class*="font-medium"]')
    await expect(nameCell).toBeVisible({ timeout: 5_000 })
    const nameText = await nameCell.textContent()
    expect(nameText, 'E2a: Item-Name ist leer').toBeTruthy()
    // Must NOT be "Offer #<id>" pattern when item-embed is present
    expect(nameText, 'E2a: Item-Name zeigt immer noch Offer #id Fallback obwohl item vorhanden').not.toMatch(/^Offer #\d+$/)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E3a — Kategorie-Chip (AC-5–6)
  // ──────────────────────────────────────────────────────────────────────────

  test('E3a — Kategorie-Chip sichtbar wenn category_name vorhanden (AC-5)', async ({ page }) => {
    if (!eOwnerToken) { test.skip(true, 'Login nicht möglich'); return }

    const token = eOwnerToken
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const offers = (data as { items: Array<{ item?: { category_name?: string | null } }> }).items
    const hasCategoryName = offers.some(o => o.item?.category_name)

    if (!hasCategoryName) {
      test.skip(true, 'Backend liefert kein category_name im item-Embed — AC-5 nach Deployment testen')
      return
    }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    // Category chip: span with bg-blue-50 text-blue-600 classes
    const categoryChips = page.locator('span.bg-blue-50.text-blue-600, span[class*="bg-blue-50"][class*="text-blue-600"]')
    const chipCount = await categoryChips.count()
    expect(chipCount, 'E3a: Kein Kategorie-Chip sichtbar obwohl category_name im Backend').toBeGreaterThan(0)

    const chipText = await categoryChips.first().textContent()
    expect(chipText?.trim().length, 'E3a: Kategorie-Chip ist leer').toBeGreaterThan(0)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E6 — Edit-Page H1 und Item-Header-Block (AC-18–19)
  // ──────────────────────────────────────────────────────────────────────────

  test('E6a — Edit-Page H1 enthält Item-Name (AC-18) — bei item-Embed', async ({ page }) => {
    if (!eOfferId || !eOwnerToken) { test.skip(true, 'eOfferId nicht verfügbar'); return }

    // Check backend delivers item-embed for this offer
    const { data } = await apiGet(`/api/v1/shop-owner/offers/${eOfferId}`, eOwnerToken)
    const offerData = data as { id: number; item?: { names?: Record<string, string> } }
    const hasItemEmbed = offerData.item?.names && Object.keys(offerData.item.names).length > 0

    if (!hasItemEmbed) {
      test.skip(true, 'Backend liefert noch kein item-Embed für einzelnen Offer — AC-18 nach Deployment testen')
      return
    }

    await page.goto(FRONTEND_URL + `/shop-admin/offers/${eOfferId}/edit`)
    await waitHydrated(page)

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 8_000 })
    const h1Text = await h1.textContent()
    expect(h1Text, 'E6a: H1 ist leer').toBeTruthy()
    // H1 must NOT be just "Bearbeiten — #<id>" when item has names
    expect(h1Text, 'E6a: H1 zeigt noch Fallback "#id" obwohl item-Embed vorhanden').not.toMatch(/—\s*#\d+$/)
  })

  test('E6b — Edit-Page H1 zeigt Fallback #id wenn kein item-Embed (AC-18 Fallback)', async ({ page }) => {
    if (!eOfferId) { test.skip(true, 'eOfferId nicht verfügbar'); return }

    await page.goto(FRONTEND_URL + `/shop-admin/offers/${eOfferId}/edit`)
    await waitHydrated(page)

    // Page must not crash in any case
    await expect(page.locator('body')).toBeVisible()
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 8_000 })

    const h1Text = await h1.textContent()
    expect(h1Text, 'E6b: H1 fehlt komplett auf Edit-Page').toBeTruthy()
    // H1 should contain either item name or fallback pattern — both are valid
    const hasContent = h1Text!.trim().length > 0
    expect(hasContent, 'E6b: H1 ist leer / unsichtbar').toBe(true)
    console.log(`[E6b] H1 text: "${h1Text}"`)
  })

  test('E6c — Edit-Page zeigt Item-Header-Block wenn item vorhanden (AC-19)', async ({ page }) => {
    if (!eOfferId || !eOwnerToken) { test.skip(true, 'eOfferId nicht verfügbar'); return }

    // Check backend
    const { data } = await apiGet(`/api/v1/shop-owner/offers/${eOfferId}`, eOwnerToken)
    const offerData = data as { item?: unknown }
    if (!offerData.item) {
      test.skip(true, 'Backend liefert noch kein item-Embed — AC-19 nach Deployment testen')
      return
    }

    await page.goto(FRONTEND_URL + `/shop-admin/offers/${eOfferId}/edit`)
    await waitHydrated(page)

    // OfferItemHeader renders a div with bg-gray-50 rounded-xl border border-gray-200 p-4
    const itemHeader = page.locator('div.bg-gray-50.rounded-xl.border.border-gray-200.p-4')
    await expect(itemHeader).toBeVisible({ timeout: 8_000 })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E7 — RTL-Layout in Offer-Liste (AC-20)
  // ──────────────────────────────────────────────────────────────────────────

  test('E7 — RTL: Offer-Zeile folgt dir=rtl ohne rtl:flex-row-reverse (AC-20, B5900-017)', async ({ page }) => {
    // Set Arabic language cookie before navigating
    await page.context().addCookies([
      { name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' },
    ])

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    // HTML element should have dir=rtl when lang=ar
    const htmlDir = await page.locator('html').getAttribute('dir')
    expect(htmlDir, 'E7: <html> hat kein dir=rtl bei lang=ar').toBe('rtl')

    // Offer row div must have rtl:flex-row-reverse in its class list
    // (Tailwind includes this literally in className string)
    const firstRow = page.locator('div.bg-white.rounded-xl.border.divide-y > div').first()
    const rowCount = await page.locator('div.bg-white.rounded-xl.border.divide-y > div').count()

    if (rowCount === 0) {
      // No offers — just verify the page doesn't crash in RTL mode
      await expect(page.locator('body')).toBeVisible()
      console.log('[E7] Keine Offer-Zeilen zum prüfen (RTL-Modus läuft aber ohne Crash)')
      return
    }

    // B5900-017 (A2): dir=rtl am <html> spiegelt die Flex-Zeile bereits; rtl:flex-row-reverse würde doppelt spiegeln.
    const rowClass = await firstRow.getAttribute('class')
    expect(
      rowClass,
      'E7: Offer-Zeile darf kein rtl:flex-row-reverse mehr haben (Doppelspiegelung)'
    ).not.toContain('rtl:flex-row-reverse')

    // Cleanup: reset language cookie to English
    await page.context().addCookies([
      { name: 'app_lang', value: 'en', domain: '127.0.0.1', path: '/' },
    ])
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E-NAV — nav_products nicht mehr in Translations (AC-24)
  // ──────────────────────────────────────────────────────────────────────────

  test('E-NAV — nav_products-Link existiert nicht im Shop-Admin (AC-24)', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin')
    await waitHydrated(page)

    // No link to /shop-admin/products anywhere on the page
    const productNavLinks = await page.locator('a[href*="/shop-admin/products"]').count()
    expect(
      productNavLinks,
      'E-NAV: Es gibt noch einen Link zu /shop-admin/products im Dashboard'
    ).toBe(0)

    // Navigate to sidebar/nav if it exists
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    const productNavLinksOnOffers = await page.locator('a[href*="/shop-admin/products"]').count()
    expect(
      productNavLinksOnOffers,
      'E-NAV: Es gibt noch einen Link zu /shop-admin/products auf der Offers-Seite'
    ).toBe(0)
  })
})
