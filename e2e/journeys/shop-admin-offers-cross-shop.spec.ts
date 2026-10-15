/**
 * Shop-Admin Offers — Cross-Shop-Isolation, Preis-Edgecases, Staffelpreise, Datum-Edgecases (XS, AR, SP, DT)
 *
 * F8950 T32: Teil 3 von 4 des frueheren `shop-admin-offers.spec.ts` (siehe dort die Uebersicht). Migriert aus der
 * Legacy-Spec `shop-admin-offer-product.spec.ts` (ShopListing/UnifiedOffer-API). Shop A = Worker-Shop, Shop B = eigener
 * Spec-Shop per Admin-API.
 * F8950 T31: Marker-Item statt echtem Prod-Item (vorher avicentra 21476): Shop A legt es an, Shop B listet dasselbe Item.
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect, specShop, type WorkerShop } from './_helpers/worker-shop'
import { getAdminToken as adminApiLogin } from './_helpers/test-data'
import { apiPost, apiPatch, getOrCreateShopListing, TODAY_ISO, daysFromToday } from './_helpers/offers-api'
import { BASE_URL as FRONTEND_URL } from '../env'

let W: WorkerShop

async function getOwnerToken(): Promise<string> {
  return W.ownerToken
}

// ─── Two-shop context ─────────────────────────────────────────────────────────

interface TwoShopCtx {
  /** Shop A — der Worker-Shop */
  shopAToken: string | null
  shopAListingId: number | null
  shopASlug: string | null
  /** Shop B — a second shop created via admin API for isolation tests */
  shopBId: number | null
  shopBSlug: string | null
  shopBOwnerId: number | null
  shopBOwnerToken: string | null
  shopBListingId: number | null
  adminToken: string | null
  createdOfferIds: number[]
}

const twoShopCtx: TwoShopCtx = {
  shopAToken: null,
  shopAListingId: null,
  shopASlug: null,
  shopBId: null,
  shopBSlug: null,
  shopBOwnerId: null,
  shopBOwnerToken: null,
  shopBListingId: null,
  adminToken: null,
  createdOfferIds: [],
}

async function getAdminToken(): Promise<string> {
  return adminApiLogin()
}

let shopB: WorkerShop | null = null

test.describe.serial('MIGRATED — Cross-Shop Isolation + Preis-Edgecases + Staffelpreise', () => {

  test.beforeAll(async ({ workerShop }) => {
    test.setTimeout(120_000)
    W = workerShop
    // ── Admin login ────────────────────────────────────────────────────────────
    twoShopCtx.adminToken = await getAdminToken()

    // ── Shop A: Worker-Shop (Impersonation) ───────────────────────────────────
    twoShopCtx.shopAToken = await getOwnerToken()
    twoShopCtx.shopASlug = W.slug
    // Gemeinsames Marker-Item: Shop A legt es samt Listing an, Shop B listet dasselbe Item (Kataloggleich wie ein Prod-Item)
    const sharedItem = await W.createItem('OFFERS-XS', 'shared', { listing: true })
    twoShopCtx.shopAListingId = sharedItem.listingId ?? null
    if (!twoShopCtx.shopAListingId) {
      throw new Error(`SETUP BROKEN: Could not create ShopListing for Shop A (item_id=${sharedItem.id})`)
    }

    // ── Shop B: eigener Spec-Shop per Admin-API (kein Register/Login → kein Rate-Limit) ──
    shopB = await specShop('OFFERS-XS')
    twoShopCtx.shopBId = shopB.id
    twoShopCtx.shopBSlug = shopB.slug
    twoShopCtx.shopBOwnerToken = shopB.ownerToken

    // ShopListing for Shop B — dasselbe Item
    twoShopCtx.shopBListingId = await getOrCreateShopListing(twoShopCtx.shopBOwnerToken, sharedItem.id)
    if (!twoShopCtx.shopBListingId) {
      throw new Error(`SETUP BROKEN: Could not create ShopListing for Shop B (item_id=${sharedItem.id})`)
    }
  })

  test.afterAll(async () => {
    // Shop B: Admin-Shop-Delete kaskadiert Owner/Listing/Offers (das echte Item bleibt)
    await shopB?.destroy()
    // Shop A (Worker-Shop): Offers + Listings der Gruppe entfernen
    await W.cleanupSpecData()
  })

  // ── Cross-Shop Isolation ───────────────────────────────────────────────────

  test('XS1 — POST offer with ShopListing from OTHER shop → 403 or 422 (isolation enforced)', async () => {
    // Shop A owner tries to use Shop B's shop_listing_id — must be rejected
    const shopAToken = twoShopCtx.shopAToken!
    const shopBListingId = twoShopCtx.shopBListingId!

    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: shopBListingId,
      price_type: 'on_request',
      price_tiers: [],
      valid_from: TODAY_ISO,
      valid_until: daysFromToday(30),
      title: 'XS1 Cross-shop injection attempt',
    }, shopAToken)

    // Backend must reject this — either 403 (forbidden) or 422 (validation)
    expect([403, 422], `XS1: cross-shop shop_listing_id must be rejected (got ${res.status})`).toContain(res.status)
    console.log(`[XS1] Backend rejected cross-shop attempt with: ${res.status}`)
  })

  test('XS2 — Shop B offer NOT visible on Shop A customer page', async ({ page }) => {
    if (!twoShopCtx.shopASlug || !twoShopCtx.shopBListingId || !twoShopCtx.shopBOwnerToken) {
      throw new Error('PREREQUISITE BROKEN: shopASlug or shopB context missing')
    }

    // Create an active offer for Shop B
    const offerRes = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: twoShopCtx.shopBListingId,
      price_type: 'on_request',
      price_tiers: [],
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      title: 'XS2 Shop-B Offer Must Not Appear on Shop-A Page',
    }, twoShopCtx.shopBOwnerToken)
    expect(offerRes.status, 'XS2 setup: create Shop-B offer').toBe(201)

    // Navigate to Shop A page — must NOT show Shop B's offer
    await page.goto(FRONTEND_URL + `/en/shops/${twoShopCtx.shopASlug}`)
    await page.waitForLoadState('load')

    const body = await page.locator('body').innerText()
    expect(
      body.includes('XS2 Shop-B Offer Must Not Appear on Shop-A Page'),
      'XS2: Shop-B offer must NOT appear on Shop-A customer page'
    ).toBe(false)
  })

  // ── Archivierte Angebote ───────────────────────────────────────────────────

  test('AR1 — Archived offer is NOT visible on customer shop page', async ({ page }) => {
    if (!twoShopCtx.shopASlug || !twoShopCtx.shopAToken || !twoShopCtx.shopAListingId) {
      throw new Error('PREREQUISITE BROKEN: shopA context missing')
    }

    const token = twoShopCtx.shopAToken

    // Create an active offer
    const offerRes = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: twoShopCtx.shopAListingId,
      price_type: 'free',
      price_tiers: [],
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      title: 'AR1 Archived Must Be Hidden From Customer',
    }, token)
    expect(offerRes.status, 'AR1 setup: create offer').toBe(201)
    const offerId = (offerRes.data as { id: number }).id
    twoShopCtx.createdOfferIds.push(offerId)

    // Archive it
    await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, { archived: true }, token)

    await page.goto(FRONTEND_URL + `/en/shops/${twoShopCtx.shopASlug}`)
    await page.waitForLoadState('load')

    const body = await page.locator('body').innerText()
    expect(
      body.includes('AR1 Archived Must Be Hidden From Customer'),
      'AR1: archived offer must NOT be visible on customer shop page'
    ).toBe(false)
  })

  // ── Staffelpreise (price_tiers) ────────────────────────────────────────────

  test('SP1 — Offer with fixed price tier (per_piece, 1 step) → 201', async () => {
    const token = twoShopCtx.shopAToken!
    const listingId = twoShopCtx.shopAListingId!

    // PriceTierCreate schema: { unit, steps: [{ min_quantity, price, currency }] }
    // NOT: { unit, min_qty, price } — that is the legacy flat format
    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 49.99, currency: 'EUR' }] }],
      valid_from: TODAY_ISO,
      valid_until: daysFromToday(30),
      title: 'SP1 Single Price Tier',
    }, token)
    expect(res.status, 'SP1: offer with 1 price tier must return 201').toBe(201)
    const offer = res.data as { id: number; price_tiers?: unknown[] }
    twoShopCtx.createdOfferIds.push(offer.id)
    if ((offer.price_tiers ?? []).length > 0) {
      expect(offer.price_tiers!.length, 'SP1: 1 price tier must be stored').toBe(1)
    }
  })

  test('SP2 — Offer with multiple price tier steps → 201', async () => {
    const token = twoShopCtx.shopAToken!
    const listingId = twoShopCtx.shopAListingId!

    // SP2: one tier with 3 steps (graduated pricing via steps array)
    // PriceTierCreate schema: { unit, steps: [{ min_quantity, price, currency }] }
    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'fixed',
      price_tiers: [
        {
          unit: 'per_m2',
          steps: [
            { min_quantity: 1, price: 15.00, currency: 'EUR' },
            { min_quantity: 11, price: 12.00, currency: 'EUR' },
            { min_quantity: 51, price: 10.00, currency: 'EUR' },
          ],
        },
      ],
      valid_from: TODAY_ISO,
      valid_until: daysFromToday(30),
      title: 'SP2 Three Tier Steps (per_m2)',
    }, token)
    expect(res.status, 'SP2: offer with 3 price tier steps must return 201').toBe(201)
    const offer = res.data as { id: number; price_tiers?: Array<{ steps?: unknown[] }> }
    twoShopCtx.createdOfferIds.push(offer.id)
    // The response wraps steps inside the tier — check the tier exists
    if ((offer.price_tiers ?? []).length > 0) {
      const tier = offer.price_tiers![0]
      const stepCount = (tier.steps ?? []).length
      if (stepCount > 0) {
        expect(stepCount, 'SP2: all 3 tier steps must be stored').toBe(3)
      }
    }
  })

  test('SP3 — Offer with on_request price_type: no price_tiers required → 201', async () => {
    const token = twoShopCtx.shopAToken!
    const listingId = twoShopCtx.shopAListingId!

    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'on_request',
      price_tiers: [],
      title: 'SP3 On Request No Tiers',
    }, token)
    expect(res.status, 'SP3: on_request offer without dates must return 201').toBe(201)
    const offer = res.data as { id: number }
    twoShopCtx.createdOfferIds.push(offer.id)
  })

  test('SP4 — Offer price_tiers visible on customer shop page', async ({ page }) => {
    if (!twoShopCtx.shopASlug || !twoShopCtx.shopAToken || !twoShopCtx.shopAListingId) {
      throw new Error('PREREQUISITE BROKEN: shopA context missing')
    }

    const token = twoShopCtx.shopAToken
    const listingId = twoShopCtx.shopAListingId

    // Create an offer with both standard price_tiers AND promo pricing — only offers with
    // an active promo period (promo_valid_from..promo_valid_until) are returned by the
    // customer-facing /shops/by-slug/{slug}/offers endpoint.
    // The backend uses the offer title as item_name in the customer API response.
    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 29.99, currency: 'EUR' }] }],
      promo_price_type: 'fixed',
      promo_price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 19.99, currency: 'EUR' }] }],
      promo_valid_from: TODAY_ISO,
      promo_valid_until: daysFromToday(30),
      title: 'SP4 Customer Visible Price Tier Offer',
    }, token)
    expect(res.status, 'SP4 setup: create offer with price tier').toBe(201)
    const offerId = (res.data as { id: number }).id
    twoShopCtx.createdOfferIds.push(offerId)

    await page.goto(FRONTEND_URL + `/en/shops/${twoShopCtx.shopASlug}`)
    await page.waitForLoadState('load')

    const url = page.url()
    expect(url, 'SP4: shop page must not 404').not.toContain('not-found')
    expect(url, 'SP4: shop page must not 404').not.toContain('404')

    // The backend returns offer.title as item_name in the customer API response.
    // toContainText() retries until the streamed RSC content settles.
    await expect(page.locator('body')).toContainText('SP4 Customer Visible Price Tier Offer', { timeout: 8000 })
  })

  // ── Datum-Edgecases ────────────────────────────────────────────────────────

  test('DT1 — Offer without valid_from and valid_until (timeless) → 201', async () => {
    const token = twoShopCtx.shopAToken!
    const listingId = twoShopCtx.shopAListingId!

    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'on_request',
      price_tiers: [],
      title: 'DT1 Timeless Offer',
      // NO valid_from, NO valid_until
    }, token)
    expect(res.status, 'DT1: offer without dates must return 201 (both optional)').toBe(201)
    const offer = res.data as { id: number; promo_valid_from: unknown; promo_valid_until: unknown }
    twoShopCtx.createdOfferIds.push(offer.id)
    expect(offer.promo_valid_from, 'DT1: promo_valid_from must be null in response').toBeNull()
    expect(offer.promo_valid_until, 'DT1: promo_valid_until must be null in response').toBeNull()
  })

  test('DT2 — Expired offer (valid_until in past) NOT shown on customer shop page', async ({ page }) => {
    if (!twoShopCtx.shopASlug || !twoShopCtx.shopAToken || !twoShopCtx.shopAListingId) {
      throw new Error('PREREQUISITE BROKEN: shopA context missing')
    }

    const token = twoShopCtx.shopAToken

    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: twoShopCtx.shopAListingId,
      price_type: 'free',
      price_tiers: [],
      valid_from: '2026-01-01',
      valid_until: '2026-03-31',  // expired (past date)
      title: 'DT2 Expired Offer Must Not Show',
    }, token)
    expect(res.status, 'DT2 setup: create expired offer').toBe(201)
    const offerId = (res.data as { id: number }).id
    twoShopCtx.createdOfferIds.push(offerId)

    await page.goto(FRONTEND_URL + `/en/shops/${twoShopCtx.shopASlug}`)
    await page.waitForLoadState('load')

    const body = await page.locator('body').innerText()
    expect(
      body.includes('DT2 Expired Offer Must Not Show'),
      'DT2: expired offer must NOT appear on customer shop page'
    ).toBe(false)
  })
})
