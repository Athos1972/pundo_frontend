/**
 * Shop-Admin Offers — Archivieren, Loeschen und Kunden-Sicht (Gruppen C und D)
 *
 * F8950 T32: Teil 2 von 4 des frueheren `shop-admin-offers.spec.ts` (siehe dort die Uebersicht). Eigener Worker-Shop.
 * F8950 T31: Marker-Items statt echter Prod-Items (vorher avicentra 21476/21477).
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect, type WorkerShop } from './_helpers/worker-shop'
import { e2eName } from './_helpers/test-data'
import {
  apiGet, apiPost, apiPatch, apiDelete, apiCreateOffer, waitHydrated, TODAY_ISO, daysFromToday,
} from './_helpers/offers-api'
import { waitForPageHydrated } from './_helpers/hydration'
import { BASE_URL as FRONTEND_URL, BACKEND_URL } from '../env'

let W: WorkerShop
/** Name des Marker-Items, das die Offer-Liste fuer das Archiv-Ziel anzeigt */
let archiveItemName = ''

interface OfferCtx {
  /** shop_listing_id created in beforeAll for the offer tests */
  defaultShopListingId: number | null
  /** All offer IDs created during tests, for cleanup */
  createdOfferIds: number[]
  /** Offer ID used for C1/C2 archive/delete tests */
  archiveOfferId: number | null
  /** shop slug for customer-facing tests */
  shopSlug: string | null
  /** Findings to document in report */
  findings: string[]
}

const ctx: OfferCtx = {
  defaultShopListingId: null,
  createdOfferIds: [],
  archiveOfferId: null,
  shopSlug: null,
  findings: [],
}

async function getOwnerToken(): Promise<string> {
  return W.ownerToken
}

test.describe.serial('Shop-Admin Offers — Archive, Delete, Customer Visibility (C, D)', () => {

  test.beforeAll(async ({ workerShop }) => {
    test.setTimeout(120_000)
    W = workerShop
    const health = await fetch(`${BACKEND_URL}/api/v1/categories`)
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    ctx.shopSlug = W.slug
    const token = await getOwnerToken()

    // Item + Listing fuer die meisten Tests
    const defaultItem = await W.createItem('OFFERS', 'default', { listing: true })
    ctx.defaultShopListingId = defaultItem.listingId ?? null
    if (!ctx.defaultShopListingId) throw new Error('SETUP BROKEN: kein ShopListing fuer das Default-Item')

    // Archiv-Ziel fuer C1/C2: EIGENES Item/Listing. Ein zweites Offer auf demselben Listing archiviert das erste
    // automatisch, das Ziel waere sonst schon vor C1 archiviert.
    const archiveItem = await W.createItem('OFFERS', 'archive', { listing: true })
    archiveItemName = archiveItem.name
    const archiveSetup = await apiCreateOffer(token, archiveItem.listingId!, { title: 'C-Setup Archive Target' })
    if (archiveSetup.status !== 201) throw new Error(`SETUP BROKEN: Archiv-Ziel-Offer: ${archiveSetup.status}`)
    ctx.archiveOfferId = archiveSetup.data.id
    ctx.createdOfferIds.push(ctx.archiveOfferId)
  })

  test.afterAll(async () => {
    await W.cleanupSpecData()
    if (ctx.findings.length > 0) {
      console.log('\n[offers-spec] FINDINGS:')
      ctx.findings.forEach(f => console.log(`  - ${f}`))
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP C — Archive + Delete
  // ═══════════════════════════════════════════════════════════════════════════

  test('C1 — Archive active offer → offer moves to archived tab', async ({ page }) => {
    if (!ctx.archiveOfferId) { throw new Error('SETUP BROKEN: archiveOfferId not set') }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    // OfferList shows the item name, not the offer title (Marker-Item des Archiv-Ziels).
    await expect(page.getByText(archiveItemName)).toBeVisible()

    // Find the specific offer row by item name AND archive button
    const offerRow = page.locator('div').filter({
      has: page.locator('p', { hasText: archiveItemName }),
    }).filter({
      has: page.getByRole('button', { name: /archive|archivieren/i }),
    }).last()

    await offerRow.getByRole('button', { name: /archive|archivieren/i }).click()

    // Confirmation step — wait for Cancel to appear inside this row
    await offerRow.getByRole('button', { name: /cancel|abbrechen/i }).waitFor({ state: 'visible' })
    await offerRow.getByRole('button', { name: /archive|archivieren/i }).click()

    await expect(page.getByText(archiveItemName)).not.toBeVisible({ timeout: 10_000 })

    // Verify via API
    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers?archived=true', token)
    const items = (data as { items: Array<{ id: number; archived: boolean }> }).items
    const archived = items.find(o => o.id === ctx.archiveOfferId)
    expect(archived?.archived, 'C1: offer not archived in API').toBe(true)
  })

  test('C2 — Delete archived offer → offer gone from API', async ({ page }) => {
    if (!ctx.archiveOfferId) { throw new Error('SETUP BROKEN: archiveOfferId not set') }

    const token = await getOwnerToken()
    // Ensure archived
    await apiPatch(`/api/v1/shop-owner/offers/${ctx.archiveOfferId}`, { archived: true }, token)

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)
    await page.getByRole('button', { name: /expired|abgelaufen/i }).click()
    // F8950 T22: statt waitForTimeout(500) - Tab-Wechsel gerendert, sobald der archivierte Artikel in der Liste steht
    await expect(page.getByText(archiveItemName).first()).toBeVisible()

    // Use double-filter to find the specific row (innermost div with item name AND delete button)
    // OfferList shows the item name (Marker-Item des Archiv-Ziels), not the offer title
    const archiveTargetRow = page.locator('div').filter({
      has: page.locator('p', { hasText: archiveItemName }),
    }).filter({
      has: page.getByRole('button', { name: /delete|löschen/i }),
    }).last()

    const hasDeleteInUI = await archiveTargetRow.getByRole('button', { name: /delete|löschen/i }).count() > 0

    if (hasDeleteInUI) {
      // F8950 T22: statt waitForTimeout(500) auf die DELETE-Antwort warten
      const deleted = page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().includes('/offers/'))
      await archiveTargetRow.getByRole('button', { name: /delete|löschen/i }).click()
      const cancelBtn = archiveTargetRow.getByRole('button', { name: /cancel|abbrechen/i })
      if (await cancelBtn.count() > 0) {
        await cancelBtn.waitFor({ state: 'visible' })
        await archiveTargetRow.getByRole('button', { name: /delete|löschen/i }).click()
      }
      await deleted
    } else {
      ctx.findings.push('C2: No delete button in UI for archived offers — delete only possible via API')
      const delRes = await apiDelete(`/api/v1/shop-owner/offers/${ctx.archiveOfferId}`, token)
      expect([200, 204]).toContain(delRes.status)
    }

    // Verify gone from API
    const { data } = await apiGet('/api/v1/shop-owner/offers?archived=true', token)
    const items = (data as { items: Array<{ id: number }> }).items
    expect(items.find(o => o.id === ctx.archiveOfferId), 'C2: deleted offer still in API').toBeUndefined()

    ctx.createdOfferIds = ctx.createdOfferIds.filter(id => id !== ctx.archiveOfferId)
    ctx.archiveOfferId = null
  })

  test('C3 — Delete active (non-archived) offer → 409 from backend', async ({ page: _page }) => {
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

    const token = await getOwnerToken()
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId, {
      title: 'C3 Active Cannot Delete',
    })
    expect(status, 'C3 setup failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    const delRes = await apiDelete(`/api/v1/shop-owner/offers/${offerId}`, token)

    if (delRes.status === 409) {
      console.log('C3: Backend correctly returned 409 for deleting active non-expired offer')
    } else {
      ctx.findings.push(
        `C3: Expected 409 when deleting active offer, got ${delRes.status}. ` +
        'Backend should enforce archive-before-delete.'
      )
    }
    expect(delRes.status, 'C3: Expected 409').toBe(409)
  })

  // B5200-001: every price change archives the offer and creates a new one. A PATCH with the
  // stale (archived) ID used to create a second active offer → IntegrityError → HTTP 500.
  const B5200_TIERS = (price: string) => [
    { unit: 'per_piece', steps: [{ min_quantity: 1, max_quantity: null, price, currency: 'EUR' }] },
  ]

  /** Create offer A, change its price via API → returns { oldId: A (archived), newId: B (active) }. */
  async function createAndSupersede(token: string, title: string) {
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId!, {
      title,
      price_type: 'fixed',
      price_tiers: B5200_TIERS('4.50'),
    })
    expect(status, `${title} setup: create offer failed`).toBe(201)
    const oldId = (data as { id: number }).id
    ctx.createdOfferIds.push(oldId)
    const first = await apiPatch(`/api/v1/shop-owner/offers/${oldId}`, { price_tiers: B5200_TIERS('5.00') }, token)
    expect(first.status, `${title} setup: first price change failed`).toBe(200)
    const newId = (first.data as { id: number }).id
    ctx.createdOfferIds.push(newId)
    expect(newId, `${title} setup: price change must create a new offer`).not.toBe(oldId)
    return { oldId, newId }
  }

  test('C4 — PATCH on archived offer (stale ID) → 409 offer_archived + active_offer_id (B5200-001)', async () => {
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

    const token = await getOwnerToken()
    const { oldId, newId } = await createAndSupersede(token, 'C4 Stale Offer')

    for (const body of [
      { price_tiers: B5200_TIERS('6.00') }, // price change on archived offer (was 500)
      { archived: false },                  // restore next to the active offer (was 500)
      { title: 'C4 rewritten history' },    // metadata edit on price history (was silently 200)
    ]) {
      const res = await apiPatch(`/api/v1/shop-owner/offers/${oldId}`, body, token)
      expect(res.status, `C4: ${JSON.stringify(body)} → expected 409`).toBe(409)
      const detail = (res.data as { detail: { code: string; active_offer_id: number | null } }).detail
      expect(detail.code).toBe('offer_archived')
      expect(detail.active_offer_id).toBe(newId)
    }

    // Exactly one active offer for the listing, and it is B with the price from the first change
    const { data } = await apiGet('/api/v1/shop-owner/offers?archived=false&limit=500', token)
    const active = (data as { items: Array<{ id: number; shop_listing_id: number; price_tiers: Array<{ steps: Array<{ price: string }> }> }> })
      .items.filter(o => o.shop_listing_id === ctx.defaultShopListingId)
    expect(active.map(o => o.id), 'C4: exactly one active offer (B)').toEqual([newId])
    expect(Number(active[0].price_tiers[0].steps[0].price)).toBe(5)

    // Archived A stays untouched
    const old = await apiGet(`/api/v1/shop-owner/offers/${oldId}`, token)
    expect((old.data as { title: string; archived: boolean }).title).toBe('C4 Stale Offer')
    expect((old.data as { archived: boolean }).archived).toBe(true)
  })

  test('C5 — Save edit form of archived offer → redirect to current offer + hint (B5200-001)', async ({ page }) => {
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

    const token = await getOwnerToken()
    const { oldId, newId } = await createAndSupersede(token, 'C5 Stale Tab')

    // Simulates the stale tab: edit page of the meanwhile archived offer A
    await page.goto(FRONTEND_URL + `/shop-admin/offers/${oldId}/edit`)
    await waitHydrated(page)

    const patchResponse = page.waitForResponse(
      r => r.url().includes(`/api/shop-admin/offers/${oldId}`) && r.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    expect((await patchResponse).status(), 'C5: PATCH on archived offer must be 409, not 500').toBe(409)

    await expect(page).toHaveURL(new RegExp(`/shop-admin/offers/${newId}/edit$`), { timeout: 15_000 })
    await expect(
      page.getByText(/changed in the meantime|inzwischen geändert/i).first(),
      'C5: hint offer_archived_conflict visible',
    ).toBeVisible({ timeout: 10_000 })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP D — Customer-Facing Visibility
  // ═══════════════════════════════════════════════════════════════════════════

  test('D1 — Active offer visible on customer shop detail page /shops/[slug]', async ({ page }) => {
    if (!ctx.shopSlug || !ctx.defaultShopListingId) {
      throw new Error('SETUP BROKEN: shopSlug or defaultShopListingId fehlt')
    }

    const token = await getOwnerToken()
    // Marker-Titel (B8950-012): eindeutig pro Lauf; der Worker-Shop gehört dieser Spec allein
    const d1Title = e2eName('OFFERS', 'D1 Customer Visible Offer')

    // The customer-facing /shops/by-slug/{slug}/offers API only returns offers with an
    // ACTIVE promo period (promo_valid_from <= today <= promo_valid_until) AND promo price set.
    // We must provide promo_price_type + promo_price_tiers + promo_valid_from/until.
    // The backend uses offer.title as item_name in the response when no item name is available.
    const d1Res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: ctx.defaultShopListingId,
      price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 15.00, currency: 'EUR' }] }],
      promo_price_type: 'fixed',
      promo_price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 9.99, currency: 'EUR' }] }],
      promo_valid_from: TODAY_ISO,
      promo_valid_until: daysFromToday(30),
      title: d1Title,
    }, token)
    const { status, data } = d1Res as { status: number; data: { id: number } }
    expect(status, 'D1 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // Wait until the public backend endpoint confirms the offer is visible.
    // In parallel test runs the Next.js SSR page is served by the same backend — if we
    // navigate before the offer is confirmed visible the page may render a cached empty list.
    let offerVisible = false
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${ctx.shopSlug}/offers`, {
        headers: { 'Accept-Language': 'en' },
      })
      if (res.ok) {
        const items = await res.json() as Array<{ id: number }>
        if (items.some(o => o.id === offerId)) { offerVisible = true; break }
      }
      await new Promise(r => setTimeout(r, 200))
    }
    expect(offerVisible, 'D1: offer not visible in public backend API after 2s').toBe(true)

    await page.goto(FRONTEND_URL + `/en/shops/${ctx.shopSlug}`)
    // load: networkidle never settles on customer pages after RSC prefetch fix (2026-05-21)
    await page.waitForLoadState('load')

    const url = page.url()
    expect(url).not.toContain('404')
    expect(url).not.toContain('not-found')

    // Wait explicitly for the offer title to appear (streamed RSC content)
    // Genau EINE Karte (B8950-012: strenger als zuvor — zwei Karten wären ein Doppel-Render-Produktdefekt)
    await expect(page.getByText(d1Title)).toHaveCount(1, { timeout: 10_000 })
    await expect(page.getByText(d1Title)).toBeVisible()

    const bodyText = await page.locator('body').innerText()
    expect(
      bodyText.includes(d1Title),
      'D1: offer title not visible on customer shop page'
    ).toBe(true)
  })

  test('D2 — Archived offer NOT visible on customer shop detail page', async ({ page }) => {
    if (!ctx.shopSlug || !ctx.defaultShopListingId) {
      throw new Error('SETUP BROKEN: shopSlug or defaultShopListingId fehlt')
    }

    const token = await getOwnerToken()
    // Use currently-valid dates so the offer WOULD appear on customer page if not archived
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId, {
      title: 'D2 Archived Should Be Hidden',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
    })
    expect(status, 'D2 setup failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // Archive it — public endpoint must not show it
    await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, { archived: true }, token)

    await page.goto(FRONTEND_URL + `/en/shops/${ctx.shopSlug}`)
    // F8950 T22: statt networkidle - hydriert und Shop-Ueberschrift gerendert, dann den Text lesen
    await waitForPageHydrated(page)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.includes('D2 Archived Should Be Hidden'), 'D2: Archived offer visible on customer page').toBe(false)
  })

})
